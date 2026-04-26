import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  ChevronRight,
  Download,
  Orbit,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useContactsPersistence } from '@/hooks/useContactsPersistence';
import { buildContactNudges } from '@/lib/contacts-nudges';
import { uniqStrings } from '@/lib/contacts-normalize';
import type {
  RelationshipCircle,
  RelationshipContact,
  RelationshipContactActivity,
  RelationshipContactReminder,
} from '@/types/contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AddContactDialog } from '@/components/contacts/AddContactDialog';
import { ImportContactsDialog } from '@/components/contacts/ImportContactsDialog';

const CIRCLE_LABEL: Record<RelationshipCircle, string> = {
  inner: 'Inner',
  middle: 'Middle',
  outer: 'Outer',
};

const CIRCLE_BADGE: Record<RelationshipCircle, string> = {
  inner: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  middle: 'bg-sky-500/15 text-sky-100 border-sky-500/30',
  outer: 'bg-zinc-500/15 text-zinc-200 border-zinc-500/35',
};

const CIRCLE_DOT: Record<RelationshipCircle, string> = {
  inner: 'bg-amber-400',
  middle: 'bg-sky-400',
  outer: 'bg-zinc-400',
};

function circleSortRank(c: RelationshipCircle) {
  if (c === 'inner') return 0;
  if (c === 'middle') return 1;
  return 2;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Contacts() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const persistence = useContactsPersistence();

  const [booting, setBooting] = useState(true);
  const [contacts, setContacts] = useState<RelationshipContact[]>([]);
  const [reminders, setReminders] = useState<RelationshipContactReminder[]>([]);
  const [activities, setActivities] = useState<RelationshipContactActivity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [circleFilter, setCircleFilter] = useState<RelationshipCircle | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'last'>('name');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [profileNotes, setProfileNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [quickLog, setQuickLog] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactReminders, setContactReminders] = useState<RelationshipContactReminder[]>([]);

  const reload = useCallback(async () => {
    const [c, r] = await Promise.all([
      persistence.fetchContacts(),
      persistence.fetchOpenReminders(),
    ]);
    setContacts(c);
    setReminders(r);
  }, [persistence]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      await reload();
      if (!cancelled) setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === selectedId) ?? null,
    [contacts, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setProfileNotes('');
      setTagsInput('');
      setActivities([]);
      setContactReminders([]);
      return;
    }
    setProfileNotes(selected.profile_notes || '');
    setTagsInput(selected.tags?.join(', ') || '');
    let cancelled = false;
    persistence.fetchActivities(selected.id).then((rows) => {
      if (!cancelled) setActivities(rows);
    });
    persistence.fetchRemindersForContact(selected.id).then((rows) => {
      if (!cancelled) setContactReminders(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, persistence]);

  const nudges = useMemo(() => buildContactNudges(contacts), [contacts]);

  const filtered = useMemo(() => {
    let rows = [...contacts];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) => {
        const blob = [
          c.display_name,
          c.company,
          c.job_title,
          c.primary_email,
          ...(c.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      });
    }
    if (circleFilter !== 'all') {
      rows = rows.filter((c) => c.circle === circleFilter);
    }
    const tagNeedle = tagFilter.trim().toLowerCase();
    if (tagNeedle) {
      rows = rows.filter((c) => (c.tags || []).some((t) => t.toLowerCase().includes(tagNeedle)));
    }
    rows.sort((a, b) => {
      const circleDiff = circleSortRank(a.circle) - circleSortRank(b.circle);
      if (circleDiff !== 0) return circleDiff;
      if (sortBy === 'name') return a.display_name.localeCompare(b.display_name);
      const ta = a.last_interaction_at ? new Date(a.last_interaction_at).getTime() : 0;
      const tb = b.last_interaction_at ? new Date(b.last_interaction_at).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [contacts, search, circleFilter, tagFilter, sortBy]);

  const counts = useMemo(() => {
    const c = { all: contacts.length, inner: 0, middle: 0, outer: 0 };
    for (const row of contacts) c[row.circle] += 1;
    return c;
  }, [contacts]);

  const activeFilterCount =
    (circleFilter !== 'all' ? 1 : 0) + (tagFilter.trim() ? 1 : 0) + (sortBy !== 'name' ? 1 : 0);

  const saveProfile = async () => {
    if (!selected) return;
    const tags = uniqStrings(
      tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    );
    await persistence.updateContact(selected.id, {
      profile_notes: profileNotes,
      tags,
    });
    await reload();
    toast.success('Saved');
  };

  const changeCircle = async (circle: RelationshipCircle) => {
    if (!selected) return;
    await persistence.updateContact(selected.id, { circle });
    await reload();
  };

  const submitQuickLog = async () => {
    if (!selected || !quickLog.trim()) return;
    await persistence.logInteraction(selected.id, quickLog.trim());
    setQuickLog('');
    const rows = await persistence.fetchActivities(selected.id);
    setActivities(rows);
    await reload();
    toast.success('Logged');
  };

  const addNote = async (body: string) => {
    if (!selected || !body.trim()) return;
    await persistence.addActivity(selected.id, 'note', body.trim(), null);
    const rows = await persistence.fetchActivities(selected.id);
    setActivities(rows);
    toast.success('Note added');
  };

  const submitReminder = async () => {
    if (!selected || !reminderTitle.trim() || !reminderDate) {
      toast.error('Reminder needs title and date');
      return;
    }
    const due = new Date(reminderDate);
    due.setHours(9, 0, 0, 0);
    await persistence.addReminder(selected.id, reminderTitle.trim(), due.toISOString());
    setReminderTitle('');
    setReminderDate(undefined);
    await reload();
    const rows = await persistence.fetchRemindersForContact(selected.id);
    setContactReminders(rows);
    toast.success('Reminder set');
  };

  const markReminderDone = async (reminderId: string) => {
    await persistence.completeReminder(reminderId);
    if (selected) {
      const rows = await persistence.fetchRemindersForContact(selected.id);
      setContactReminders(rows);
    }
    await reload();
    toast.success('Reminder cleared');
  };

  const addIntervalReminder = async (days: number) => {
    if (!selected) return;
    const due = addDays(new Date(), days);
    due.setHours(9, 0, 0, 0);
    await persistence.addReminder(selected.id, `Follow up (${days}d)`, due.toISOString());
    const rows = await persistence.fetchRemindersForContact(selected.id);
    setContactReminders(rows);
    await reload();
    toast.success(`Follow-up in ${days} days`);
  };

  const onSelectRow = (id: string) => {
    setSelectedId(id);
    if (isMobile) setDetailOpen(true);
  };

  const handleAddContact = useCallback(
    async (input: Parameters<typeof persistence.createContactDetailed>[0]) => {
      const created = await persistence.createContactDetailed(input);
      if (created) {
        await reload();
        setSelectedId(created.id);
        if (isMobile) setDetailOpen(true);
      }
      return created;
    },
    [persistence, reload, isMobile],
  );

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => !r.completed_at).slice(0, 6),
    [reminders],
  );

  // ─── Toolbar inside the list pane ────────────────────────────────────────
  const listToolbar = (
    <div className="space-y-2.5 border-b border-border/60 bg-background/60 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people, tags, company…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 bg-background pl-8 text-sm"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {(['all', 'inner', 'middle', 'outer'] as const).map((key) => {
          const active = circleFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setCircleFilter(key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition',
                active
                  ? 'border-primary/60 bg-primary/15 text-primary-foreground/90'
                  : 'border-border/60 bg-background/40 text-muted-foreground hover:bg-muted/50',
              )}
            >
              {key !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', CIRCLE_DOT[key])} />
              )}
              <span>{key === 'all' ? 'All' : CIRCLE_LABEL[key]}</span>
              <span className={cn('text-[10px] tabular-nums', active ? 'opacity-90' : 'opacity-60')}>
                {counts[key]}
              </span>
            </button>
          );
        })}
        <div className="ml-auto" />
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 shrink-0 gap-1.5 rounded-full px-2.5 text-xs',
                activeFilterCount > 0 && 'text-primary',
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount > 0 ? `Filters · ${activeFilterCount}` : 'Filters'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-3 p-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tag</Label>
              <Input
                placeholder="e.g. mentor"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sort by</Label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'last')}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A–Z)</SelectItem>
                  <SelectItem value="last">Last touchpoint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs"
                onClick={() => {
                  setTagFilter('');
                  setSortBy('name');
                  setCircleFilter('all');
                }}
              >
                Clear filters
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const listSection = (
    <div className="flex min-h-0 flex-1 flex-col border-r border-border/60 bg-muted/10">
      {listToolbar}
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border/40">
          {booting ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <Users className="h-7 w-7 text-muted-foreground/50" />
              <p className="text-sm font-medium">No contacts to show</p>
              <p className="text-xs text-muted-foreground">
                {contacts.length === 0
                  ? 'Add someone manually or import from Google, Apple, or LinkedIn.'
                  : 'Try a different filter or search term.'}
              </p>
              {contacts.length === 0 && (
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add contact
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setImportOpen(true)}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Import
                  </Button>
                </div>
              )}
            </div>
          ) : (
            filtered.map((c) => {
              const subtitle = [c.job_title, c.company].filter(Boolean).join(' · ') || c.primary_email || '—';
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectRow(c.id)}
                  className={cn(
                    'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-muted/50',
                    selectedId === c.id && 'bg-muted/70',
                  )}
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {c.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initialsFor(c.display_name)
                    )}
                    <span
                      className={cn(
                        'absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full border-2 border-background',
                        CIRCLE_DOT[c.circle],
                      )}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.display_name}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const detailSection = selected && (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border/60 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground">
              {selected.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initialsFor(selected.display_name)
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{selected.display_name}</h2>
              <p className="text-sm text-muted-foreground">
                {[selected.primary_email, selected.primary_phone].filter(Boolean).join(' · ') ||
                  'No email / phone'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn('text-[10px]', CIRCLE_BADGE[selected.circle])}>
                  {CIRCLE_LABEL[selected.circle]} circle
                </Badge>
                {selected.company && (
                  <span className="text-xs text-muted-foreground">{selected.company}</span>
                )}
              </div>
            </div>
          </div>
          <Select value={selected.circle} onValueChange={(v) => changeCircle(v as RelationshipCircle)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inner">Inner circle</SelectItem>
              <SelectItem value="middle">Middle circle</SelectItem>
              <SelectItem value="outer">Outer circle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-7 p-5">
          <section className="space-y-2.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Standing notes</Label>
            <Textarea
              rows={4}
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              className="resize-none text-sm"
              placeholder="Context you want at a glance—how you met, preferences, open threads…"
            />
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="text-sm"
                placeholder="comma, separated"
              />
            </div>
            <Button type="button" size="sm" onClick={() => saveProfile()}>
              Save profile
            </Button>
          </section>

          <section className="space-y-2.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick capture</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Log a touchpoint (coffee, call, intro)…"
                value={quickLog}
                onChange={(e) => setQuickLog(e.target.value)}
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && submitQuickLog()}
              />
              <Button type="button" size="sm" onClick={() => submitQuickLog()}>
                Log
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Logging updates last interaction and the timeline.
            </p>
          </section>

          <section className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scheduled for this person</Label>
            <div className="space-y-2">
              {contactReminders
                .filter((r) => !r.completed_at)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium leading-tight">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(r.due_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 shrink-0 text-xs"
                      onClick={() => markReminderDone(r.id)}
                    >
                      Done
                    </Button>
                  </div>
                ))}
              {!contactReminders.some((r) => !r.completed_at) && (
                <p className="text-xs text-muted-foreground">No open reminders.</p>
              )}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Follow-ups</Label>
              <div className="flex flex-wrap gap-1">
                {[7, 14, 30].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => addIntervalReminder(d)}
                  >
                    +{d}d
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Reminder title"
                value={reminderTitle}
                onChange={(e) => setReminderTitle(e.target.value)}
                className="max-w-xs flex-1 text-sm"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 shrink-0">
                    <CalendarClock className="mr-1 h-3.5 w-3.5" />
                    {reminderDate ? format(reminderDate, 'MMM d') : 'Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={reminderDate} onSelect={setReminderDate} />
                </PopoverContent>
              </Popover>
              <Button type="button" size="sm" onClick={() => submitReminder()}>
                Set
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Timeline</Label>
            <div className="space-y-2.5">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-sm"
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="uppercase tracking-wide">{a.kind}</span>
                    <span>{format(new Date(a.occurred_at), 'MMM d, yyyy')}</span>
                  </div>
                  {a.title && <p className="mb-1 font-medium leading-snug">{a.title}</p>}
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">{a.body}</p>
                </div>
              ))}
              {!activities.length && (
                <p className="text-sm text-muted-foreground">No notes or interactions yet.</p>
              )}
            </div>
            <QuickNoteForm onSubmit={(t) => addNote(t)} />
          </section>
        </div>
      </ScrollArea>
    </div>
  );

  const shellHeader = (
    <header className="border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-border hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5"
                    onClick={() => setImportOpen(true)}
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Import from Google, Apple, LinkedIn…</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setAddOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Add contact
              </Button>
            </div>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Orbit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Circles</h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {contacts.length} {contacts.length === 1 ? 'person' : 'people'} · imports, notes, reminders, gentle nudges.
            </p>
          </div>
        </div>

        {nudges.length > 0 && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-amber-200/90">
              Gentle nudges
            </p>
            <ul className="space-y-1 text-xs text-amber-50/90 sm:text-sm">
              {nudges.slice(0, 4).map((n) => (
                <li key={n.contactId}>
                  <button
                    type="button"
                    className="text-left underline-offset-2 hover:underline"
                    onClick={() => onSelectRow(n.contactId)}
                  >
                    {n.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {upcomingReminders.length > 0 && (
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {upcomingReminders.map((r) => {
              const person = contacts.find((c) => c.id === r.contact_id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRow(r.contact_id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] transition hover:bg-muted/50"
                >
                  <Bell className="h-3 w-3" />
                  <span className="font-medium">{person?.display_name || 'Contact'}</span>
                  <span className="text-muted-foreground">{r.title}</span>
                  <span className="text-muted-foreground">{format(new Date(r.due_at), 'MMM d')}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {shellHeader}

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-0">
        {isMobile ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {listSection}
            <Sheet
              open={detailOpen}
              onOpenChange={(open) => {
                setDetailOpen(open);
                if (!open) setSelectedId(null);
              }}
            >
              <SheetContent side="bottom" className="h-[92vh] overflow-hidden p-0">
                <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
                  <SheetTitle className="text-base">Contact</SheetTitle>
                </SheetHeader>
                {detailSection}
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-13rem)] flex-1 grid-cols-1 border-t border-border/60 lg:grid-cols-[minmax(300px,360px)_1fr]">
            {listSection}
            {selected ? (
              detailSection
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
                <Users className="h-8 w-8 opacity-40" />
                <p className="max-w-sm text-sm">
                  Select someone from the list, or {' '}
                  <button
                    type="button"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                    onClick={() => setAddOpen(true)}
                  >
                    add a new contact
                  </button>
                  {' '}to start tracking touchpoints.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <AddContactDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={handleAddContact}
      />
      <ImportContactsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          void reload();
        }}
      />
    </div>
  );
}

function QuickNoteForm({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex gap-2">
      <Input
        placeholder="Add a dated note…"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="text-sm"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onSubmit(val);
            setVal('');
          }
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => {
          onSubmit(val);
          setVal('');
        }}
      >
        Note
      </Button>
    </div>
  );
}
