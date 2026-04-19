import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  ChevronRight,
  Download,
  Loader2,
  Orbit,
  Plus,
  Search,
  Smartphone,
  Tag,
  UserPlus,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useContactsPersistence } from '@/hooks/useContactsPersistence';
import { useFilesPersistence, getCachedDriveAccounts } from '@/hooks/useFilesPersistence';
import { buildContactNudges } from '@/lib/contacts-nudges';
import {
  parseVCardFile,
  parseLinkedInConnectionsCsv,
  devicePickedToDrafts,
} from '@/lib/contacts-parsers';
import { uniqStrings } from '@/lib/contacts-normalize';
import { getAuthHeaders } from '@/lib/arloAuth';
import type {
  ContactImportDraft,
  RelationshipCircle,
  RelationshipContact,
  RelationshipContactActivity,
  RelationshipContactReminder,
} from '@/types/contacts';
import type { DriveAccount } from '@/types/files';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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

function circleSortRank(c: RelationshipCircle) {
  if (c === 'inner') return 0;
  if (c === 'middle') return 1;
  return 2;
}

export default function Contacts() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const persistence = useContactsPersistence();
  const { listAccounts } = useFilesPersistence();

  const [booting, setBooting] = useState(true);
  const [contacts, setContacts] = useState<RelationshipContact[]>([]);
  const [reminders, setReminders] = useState<RelationshipContactReminder[]>([]);
  const [activities, setActivities] = useState<RelationshipContactActivity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [circleFilter, setCircleFilter] = useState<RelationshipCircle | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'last'>('name');
  const [importOpen, setImportOpen] = useState(false);
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>(() => getCachedDriveAccounts());
  const [googleAccountId, setGoogleAccountId] = useState<string>('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [quickLog, setQuickLog] = useState('');
  const [profileNotes, setProfileNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState<Date | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contactReminders, setContactReminders] = useState<RelationshipContactReminder[]>([]);

  const reload = useCallback(async () => {
    const [c, r] = await Promise.all([persistence.fetchContacts(), persistence.fetchOpenReminders()]);
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

  const openImport = async () => {
    setImportOpen(true);
    const acc = await listAccounts();
    setDriveAccounts(acc);
    if (acc[0] && !googleAccountId) setGoogleAccountId(acc[0].id);
  };

  const handleGoogleImport = async () => {
    if (!googleAccountId) {
      toast.error('Connect Google in Settings first, then reopen import.');
      return;
    }
    setGoogleLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) throw new Error('Not signed in');
      const res = await fetch(`${SUPABASE_URL}/functions/v1/google-contacts-import`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ drive_account_id: googleAccountId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || payload.message || 'Google import failed');
      }
      const raw = (payload.contacts || []) as Array<{
        display_name: string;
        given_name?: string | null;
        family_name?: string | null;
        emails: string[];
        phones: string[];
        company?: string | null;
        job_title?: string | null;
        linkedin_url?: string | null;
        photo_url?: string | null;
        external_id?: string | null;
      }>;
      const drafts: ContactImportDraft[] = raw.map((row) => ({
        display_name: row.display_name,
        given_name: row.given_name,
        family_name: row.family_name,
        emails: row.emails || [],
        phones: row.phones || [],
        company: row.company,
        job_title: row.job_title,
        linkedin_url: row.linkedin_url,
        photo_url: row.photo_url,
        source: 'google',
        external_id: row.external_id,
      }));
      const { created, merged, error } = await persistence.importDrafts(drafts);
      if (error) throw new Error(error);
      await reload();
      toast.success(`Google: added ${created}, merged ${merged}`);
      setImportOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleVCardFile = async (file: File) => {
    const text = await file.text();
    const drafts = parseVCardFile(text);
    const { created, merged, error } = await persistence.importDrafts(drafts);
    if (error) toast.error(error);
    else {
      await reload();
      toast.success(`vCard: added ${created}, merged ${merged}`);
      setImportOpen(false);
    }
  };

  const handleLinkedInCsv = async (file: File) => {
    const text = await file.text();
    const drafts = parseLinkedInConnectionsCsv(text);
    if (!drafts.length) {
      toast.error('Could not parse CSV. Use LinkedIn “Connections” export.');
      return;
    }
    const { created, merged, error } = await persistence.importDrafts(drafts);
    if (error) toast.error(error);
    else {
      await reload();
      toast.success(`LinkedIn CSV: added ${created}, merged ${merged}`);
      setImportOpen(false);
    }
  };

  const handleDevicePick = async () => {
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<unknown[]> };
    };
    if (!nav.contacts?.select) {
      toast.message('Contact Picker not available', {
        description: 'Use Chrome on Android, or import a vCard file.',
      });
      return;
    }
    try {
      const picked = (await nav.contacts.select(['name', 'email', 'tel'], { multiple: true })) as Array<{
        name?: string[];
        email?: string[];
        tel?: string[];
      }>;
      const drafts = devicePickedToDrafts(picked);
      const { created, merged, error } = await persistence.importDrafts(drafts);
      if (error) toast.error(error);
      else {
        await reload();
        toast.success(`Device: added ${created}, merged ${merged}`);
        setImportOpen(false);
      }
    } catch {
      toast.error('Contact selection was cancelled or failed.');
    }
  };

  const handleCreatePerson = async () => {
    const name = newName.trim();
    if (!name) return;
    const row = await persistence.createContactManual(name);
    if (!row) {
      toast.error('Could not create contact');
      return;
    }
    setNewName('');
    await reload();
    setSelectedId(row.id);
    if (isMobile) setDetailOpen(true);
    toast.success('Contact created');
  };

  const saveProfile = async () => {
    if (!selected) return;
    const tags = uniqStrings(
      tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
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

  const upcomingReminders = useMemo(
    () => reminders.filter((r) => !r.completed_at).slice(0, 6),
    [reminders],
  );

  const listSection = (
    <div className="flex min-h-0 flex-1 flex-col border-r border-border/60 bg-muted/20">
      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search people, tags, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 bg-background"
          />
          <Button type="button" variant="outline" size="icon" className="h-9 shrink-0" onClick={() => openImport()}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'inner', 'middle', 'outer'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={circleFilter === key ? 'default' : 'outline'}
              className="h-8 rounded-full px-3 text-xs"
              onClick={() => setCircleFilter(key)}
            >
              {key === 'all' ? 'All circles' : CIRCLE_LABEL[key]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[120px] flex-1">
            <Tag className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-9 bg-background pl-8 text-xs"
              placeholder="Filter tag…"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'last')}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: Name</SelectItem>
              <SelectItem value="last">Sort: Last touch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New person…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-9 bg-background text-sm"
            onKeyDown={(e) => e.key === 'Enter' && handleCreatePerson()}
          />
          <Button type="button" size="sm" className="h-9 shrink-0" onClick={() => handleCreatePerson()}>
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y divide-border/50">
          {booting
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4">
                  <Skeleton className="mb-2 h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            : filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectRow(c.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/60',
                    selectedId === c.id && 'bg-muted/80',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{c.display_name}</span>
                      <Badge variant="outline" className={cn('text-[10px] font-normal', CIRCLE_BADGE[c.circle])}>
                        {CIRCLE_LABEL[c.circle]}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.job_title, c.company].filter(Boolean).join(' · ') || c.primary_email || '—'}
                    </p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
        </div>
      </ScrollArea>
    </div>
  );

  const detailSection = selected && (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="border-b border-border/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{selected.display_name}</h2>
            <p className="text-sm text-muted-foreground">
              {[selected.primary_email, selected.primary_phone].filter(Boolean).join(' · ') || 'No email / phone'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-muted-foreground">Circle</span>
            <Select value={selected.circle} onValueChange={(v) => changeCircle(v as RelationshipCircle)}>
              <SelectTrigger className="h-9 w-[160px]">
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
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-8 p-5">
          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Standing notes</Label>
            <Textarea
              rows={4}
              value={profileNotes}
              onChange={(e) => setProfileNotes(e.target.value)}
              className="resize-none text-sm"
              placeholder="Context you want at a glance—how you met, preferences, open threads…"
            />
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground">Tags (comma-separated)</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="text-sm" />
            </div>
            <Button type="button" size="sm" onClick={() => saveProfile()}>
              Save profile
            </Button>
          </section>

          <section className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Quick capture</Label>
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
            <p className="text-xs text-muted-foreground">Logging updates last interaction and the timeline.</p>
          </section>

          <section className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground">Scheduled for this person</Label>
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
                      <p className="text-xs text-muted-foreground">{format(new Date(r.due_at), 'MMM d, yyyy')}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => markReminderDone(r.id)}>
                      Done
                    </Button>
                  </div>
                ))}
              {!contactReminders.some((r) => !r.completed_at) && (
                <p className="text-xs text-muted-foreground">No open reminders.</p>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Follow-ups</Label>
              <div className="flex flex-wrap gap-1">
                {[7, 14, 30].map((d) => (
                  <Button key={d} type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => addIntervalReminder(d)}>
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
            <Label className="text-xs uppercase text-muted-foreground">Timeline</Label>
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
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
    <header className="border-b border-border/60 bg-background/80 px-6 py-5 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Orbit className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Circles</h1>
                <p className="text-sm text-muted-foreground">
                  Relationship memory—imports, notes, reminders, and light nudges when it’s time to reconnect.
                </p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => openImport()}>
            <Download className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
        {nudges.length > 0 && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-4 py-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-200/90">Gentle nudges</p>
            <ul className="space-y-1.5 text-sm text-amber-50/90">
              {nudges.map((n) => (
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
          <div className="flex flex-wrap gap-2">
            {upcomingReminders.map((r) => {
              const person = contacts.find((c) => c.id === r.contact_id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRow(r.contact_id)}
                  className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs transition hover:bg-muted/50"
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
    <div className="min-h-screen bg-background text-foreground">
      {shellHeader}

      <div className="mx-auto flex h-[calc(100vh-220px)] max-w-7xl flex-col px-0 lg:h-[calc(100vh-200px)]">
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
              <SheetContent side="bottom" className="h-[90vh] overflow-hidden p-0">
                <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
                  <SheetTitle className="text-base">Contact</SheetTitle>
                </SheetHeader>
                {detailSection}
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 border-t border-border/60 lg:grid-cols-[minmax(280px,360px)_1fr]">
            {listSection}
            {selected ? (
              detailSection
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
                <Search className="h-8 w-8 opacity-40" />
                <p className="max-w-sm text-sm">Select someone from the list or add a new person to start tracking touchpoints.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Import contacts</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6 px-1 text-sm">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google (People API)</h3>
              <p className="text-xs text-muted-foreground">
                Uses your connected Google account. If import fails with a permissions error, disconnect Google in Settings and reconnect once so the Contacts scope is granted.
              </p>
              {driveAccounts.length === 0 ? (
                <p className="text-xs text-amber-200/90">No Google accounts linked. Connect under Settings → Google Drive.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <Select value={googleAccountId} onValueChange={setGoogleAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Google account" />
                    </SelectTrigger>
                    <SelectContent>
                      {driveAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" disabled={googleLoading} onClick={() => handleGoogleImport()}>
                    {googleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Import from Google
                  </Button>
                </div>
              )}
            </section>
            <Separator />
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Device (Contact Picker)</h3>
              <Button type="button" variant="outline" onClick={() => handleDevicePick()}>
                <Smartphone className="mr-2 h-4 w-4" />
                Pick from device
              </Button>
            </section>
            <Separator />
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Files</h3>
              <div className="flex flex-col gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/80 px-3 py-3 text-xs hover:bg-muted/40">
                  <Plus className="h-4 w-4" />
                  <span>Upload vCard (.vcf)</span>
                  <input
                    type="file"
                    accept=".vcf,.vcard,text/vcard"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleVCardFile(f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/80 px-3 py-3 text-xs hover:bg-muted/40">
                  <Plus className="h-4 w-4" />
                  <span>LinkedIn connections CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleLinkedInCsv(f);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Export your network from LinkedIn (Data download → Connections) and upload the CSV here. Arlo merges on email, phone, or LinkedIn URL.
              </p>
            </section>
          </div>
        </SheetContent>
      </Sheet>
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
