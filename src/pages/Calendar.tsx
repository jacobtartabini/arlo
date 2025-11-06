"use client";

import * as React from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  setMonth,
  setYear,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  Link as LinkIcon,
  MapPin,
  Palette,
  Plus,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  BOOKING_STORAGE_KEY,
  DEFAULT_BOOKINGS,
  DEFAULT_EVENTS,
  DEFAULT_TASKS,
  EVENT_STORAGE_KEY,
  formatSlotLabel,
  getPublicBookingUrl
} from "@/lib/calendar-data";
import type { BookingSlot, CalendarEvent, Task } from "@/lib/calendar-data";

import { CalendarTimeline } from "./calendar/components/CalendarTimeline";
import { CalendarMonthGrid } from "./calendar/components/CalendarMonthGrid";
import { CalendarMiniMonth } from "./calendar/components/CalendarMiniMonth";
import { EventDetailsPopover } from "./calendar/components/EventDetailsPopover";
import { COLOR_PRESETS } from "./calendar/constants";
import { useStoredState } from "./calendar/hooks";
import {
  CalendarBlock,
  CalendarDayBlocks,
  CalendarView,
  DraftKind,
  DraftState,
  SelectedBlockState,
  VIEW_OPTIONS
} from "./calendar/types";
import { buildBlocks, minutesToTime } from "./calendar/utils";

const DEFAULT_DRAFT: DraftState = {
  kind: "event",
  title: "",
  description: "",
  date: format(new Date(), "yyyy-MM-dd"),
  startTime: "10:00",
  endTime: "11:00",
  location: "",
  color: "#2563eb",
  attendees: ""
};

const CalendarPage: React.FC = () => {
  const { toast } = useToast();
  const [view, setView] = React.useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [events, setEvents] = useStoredState(EVENT_STORAGE_KEY, DEFAULT_EVENTS);
  const [bookings, setBookings] = useStoredState(BOOKING_STORAGE_KEY, DEFAULT_BOOKINGS);
  const [draft, setDraft] = React.useState<DraftState>(DEFAULT_DRAFT);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [selectedBlock, setSelectedBlock] = React.useState<SelectedBlockState | null>(null);

  const timezone = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const scheduleSummary = React.useMemo(() => {
    try {
      const start = parseISO(`${draft.date}T${draft.startTime || "00:00"}:00`);
      const end = parseISO(`${draft.date}T${draft.endTime || "00:00"}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }
      return `${format(start, "EEEE, MMMM d")} · ${format(start, "h:mm a")} – ${format(end, "h:mm a")}`;
    } catch (error) {
      return null;
    }
  }, [draft.date, draft.startTime, draft.endTime]);

  React.useEffect(() => {
    if (!isDialogOpen) {
      setDraft(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
    }
  }, [selectedDate, isDialogOpen]);

  React.useEffect(() => {
    setSelectedBlock(null);
  }, [view, selectedDate]);

  const openCreateDialog = React.useCallback(
    (overrides?: Partial<DraftState>) => {
      setDraft(prev => ({
        ...DEFAULT_DRAFT,
        date: format(selectedDate, "yyyy-MM-dd"),
        color: prev.color,
        ...overrides
      }));
      setDialogOpen(true);
    },
    [selectedDate]
  );

  const visibleRange = React.useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
      return { start, end };
    }

    if (view === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return { start, end };
    }

    return { start: startOfDay(selectedDate), end: startOfDay(selectedDate) };
  }, [selectedDate, view]);

  const days = React.useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }),
    [visibleRange]
  );

  const tasksByDay = React.useMemo(() => {
    if (view === "month") {
      return new Map<string, Task[]>();
    }

    const rangeStart = view === "week"
      ? startOfWeek(selectedDate, { weekStartsOn: 1 })
      : startOfDay(selectedDate);
    const rangeEnd = view === "week"
      ? endOfWeek(selectedDate, { weekStartsOn: 1 })
      : startOfDay(selectedDate);

    const bucket = new Map<string, Task[]>();
    const fallbackKey = format(rangeStart, "yyyy-MM-dd");
    const unscheduled: Task[] = [];

    DEFAULT_TASKS.forEach(task => {
      if (task.completed) return;

      if (task.dueDate) {
        const due = parseISO(task.dueDate);
        const dueKey = format(due, "yyyy-MM-dd");

        if (due < rangeStart) {
          const existing = bucket.get(fallbackKey) ?? [];
          bucket.set(fallbackKey, [...existing, task]);
          return;
        }

        if (due > rangeEnd) {
          if (view === "week") {
            return;
          }

          if (view === "day") {
            return;
          }
        }

        const existing = bucket.get(dueKey) ?? [];
        bucket.set(dueKey, [...existing, task]);
        return;
      }

      unscheduled.push(task);
    });

    if (unscheduled.length) {
      const existing = bucket.get(fallbackKey) ?? [];
      bucket.set(fallbackKey, [...existing, ...unscheduled]);
    }

    return bucket;
  }, [selectedDate, view]);

  const focusBlocks = React.useMemo<CalendarDayBlocks[]>(() => {
    if (view === "month") return [];
    return days.map(day => {
      const key = format(day, "yyyy-MM-dd");
      const dayTasks = tasksByDay.get(key) ?? [];
      return {
        day,
        blocks: buildBlocks(events, bookings, day, dayTasks)
      };
    });
  }, [view, days, events, bookings, tasksByDay]);

  const totalFocusBlocks = React.useMemo(() => {
    if (view === "month") return 0;
    return focusBlocks.reduce((count, entry) => {
      return count + entry.blocks.filter(block => block.source === "task").length;
    }, 0);
  }, [focusBlocks, view]);

  const rangeLabel = React.useMemo(() => {
    if (view === "month") {
      return format(selectedDate, "MMMM yyyy");
    }

    if (view === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }

    return format(selectedDate, "EEEE, d MMM yyyy");
  }, [selectedDate, view]);

  const bookingLink = React.useMemo(() => getPublicBookingUrl("jacob"), []);
  const activeViewLabel = React.useMemo(
    () => VIEW_OPTIONS.find(option => option.id === view)?.label ?? "",
    [view]
  );

  const handleCopyBookingLink = React.useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(bookingLink).then(() => {
        toast({ title: "Link copied", description: "Your booking page URL is ready to share." });
      });
    }
  }, [bookingLink, toast]);

  const handleNavigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setSelectedDate(new Date());
      return;
    }

    const multiplier = direction === "next" ? 1 : -1;
    if (view === "month") {
      setSelectedDate(prev => addMonths(prev, multiplier));
    } else if (view === "week") {
      setSelectedDate(prev => addWeeks(prev, multiplier));
    } else {
      setSelectedDate(prev => addDays(prev, multiplier));
    }
  };

  const handleDraftChange = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const resetDraft = React.useCallback(() => {
    setDraft(prev => ({
      ...DEFAULT_DRAFT,
      date: format(selectedDate, "yyyy-MM-dd"),
      color: prev.color
    }));
  }, [selectedDate]);

  const handleCreate = () => {
    if (!draft.title.trim()) {
      toast({ title: "Add a title", description: "Events need a title before they can be saved." });
      return;
    }

    if (draft.kind === "event") {
      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}`,
        title: draft.title,
        description: draft.description || undefined,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        location: draft.location || undefined,
        attendees: draft.attendees
          .split(",")
          .map(entry => entry.trim())
          .filter(Boolean),
        color: draft.color,
        category: "custom"
      };
      setEvents(prev => [...prev, newEvent]);
      toast({ title: "Event added", description: `${draft.title} was added to your calendar.` });
    } else {
      const newSlot: BookingSlot = {
        id: `booking-${Date.now()}`,
        date: draft.date,
        startTime: draft.startTime,
        endTime: draft.endTime,
        available: true,
        title: draft.title,
        bookedBy: null,
        description: draft.description
      };
      setBookings(prev => [...prev, newSlot]);
      toast({ title: "Booking slot created", description: `${draft.title} is now available publicly.` });
    }

    setDialogOpen(false);
    resetDraft();
  };

  const miniMonthDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
      }),
    [selectedDate]
  );

  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => ({
        value: String(index),
        label: format(new Date(2020, index, 1), "MMMM")
      })),
    []
  );

  const yearOptions = React.useMemo(() => {
    const currentYear = selectedDate.getFullYear();
    return Array.from({ length: 11 }).map((_, index) => {
      const year = currentYear - 5 + index;
      return { value: String(year), label: String(year) };
    });
  }, [selectedDate]);

  const handleMonthSelect = React.useCallback(
    (value: string) => {
      const monthIndex = Number(value);
      setSelectedDate(prev => setMonth(prev, monthIndex));
    },
    [setSelectedDate]
  );

  const handleYearSelect = React.useCallback(
    (value: string) => {
      const year = Number(value);
      setSelectedDate(prev => setYear(prev, year));
    },
    [setSelectedDate]
  );

  const weekdayLabels = React.useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, index) => format(addDays(start, index), "EE"));
  }, []);

  const upcomingItems = React.useMemo(() => {
    const now = new Date();
    const items: { id: string; title: string; subtitle?: string; start: Date; color: string }[] = [];

    events.forEach(event => {
      const start = parseISO(`${event.date}T${event.startTime}:00`);
      if (start < now) return;
      items.push({
        id: event.id,
        title: event.title,
        subtitle: event.location || event.category,
        start,
        color: event.color || "#2563eb"
      });
    });

    bookings
      .filter(slot => !slot.available && slot.bookedBy)
      .forEach(slot => {
        const start = parseISO(`${slot.date}T${slot.startTime}:00`);
        if (start < now) return;
        items.push({
          id: slot.id,
          title: slot.title ?? formatSlotLabel(slot),
          subtitle: slot.bookedBy ?? undefined,
          start,
          color: "#7c3aed"
        });
      });

    return items.sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 6);
  }, [bookings, events]);

  const nextAvailableSlot = React.useMemo(() => {
    const now = new Date();
    return bookings
      .filter(slot => slot.available)
      .map(slot => ({ slot, start: parseISO(`${slot.date}T${slot.startTime}:00`) }))
      .filter(entry => entry.start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.slot;
  }, [bookings]);

  const handleCreateFromSelection = React.useCallback(
    (day: Date, startMinutes: number, endMinutes: number) => {
      openCreateDialog({
        kind: "event",
        date: format(day, "yyyy-MM-dd"),
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes)
      });
    },
    [openCreateDialog]
  );

  const handleBlockSelect = React.useCallback((block: CalendarBlock, target: HTMLElement) => {
    setSelectedBlock({ block, target });
  }, []);

  return (
    <div className="flex h-full w-full flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
              <p className="text-sm text-muted-foreground">Plan your time with clarity and keep every view aligned.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => openCreateDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              New item
            </Button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6 pt-4 sm:px-6 lg:px-10 lg:pt-6">
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[260px,minmax(0,1fr)] 2xl:grid-cols-[260px,minmax(0,1fr),320px]">
          <aside className="hidden min-h-0 flex-col gap-6 lg:flex">
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <Button className="w-full justify-center gap-2" onClick={() => openCreateDialog()}>
                <Plus className="h-4 w-4" />
                New event
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start gap-2 text-muted-foreground"
                onClick={handleCopyBookingLink}
              >
                <LinkIcon className="h-4 w-4" />
                Copy booking link
              </Button>
              <p className="mt-2 truncate text-[11px] text-muted-foreground">{bookingLink.replace(/^https?:\/\//, "")}</p>
              {nextAvailableSlot && (
                <div className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Next available slot
                  </p>
                  <p className="mt-1 font-medium text-foreground">{formatSlotLabel(nextAvailableSlot)}</p>
                </div>
              )}
            </div>

            <CalendarMiniMonth
              selectedDate={selectedDate}
              days={miniMonthDays}
              monthOptions={monthOptions}
              yearOptions={yearOptions}
              weekdayLabels={weekdayLabels}
              onSelectDate={setSelectedDate}
              onMonthChange={handleMonthSelect}
              onYearChange={handleYearSelect}
              onStepMonth={delta => setSelectedDate(prev => addMonths(prev, delta))}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="rounded-2xl border bg-card px-4 py-4 shadow-sm sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center rounded-full border bg-background px-1 py-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => handleNavigate("prev")}
                      aria-label="Previous period"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => handleNavigate("next")}
                      aria-label="Next period"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleNavigate("today")}>
                    Today
                  </Button>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Selected range</span>
                    <span className="text-lg font-semibold text-foreground">{rangeLabel}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={view} onValueChange={value => value && setView(value as CalendarView)}>
                    <SelectTrigger className="w-[120px] justify-between">
                      <SelectValue placeholder="View" />
                    </SelectTrigger>
                    <SelectContent>
                      {VIEW_OPTIONS.map(option => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <main className="flex-1 min-w-0 overflow-hidden rounded-3xl border bg-card shadow-sm">
              {view === "month" ? (
                <CalendarMonthGrid
                  days={days}
                  selectedDate={selectedDate}
                  events={events}
                  bookings={bookings}
                  onSelectDate={setSelectedDate}
                />
              ) : (
                <CalendarTimeline
                  view={view}
                  focusBlocks={focusBlocks}
                  onCreateRequest={handleCreateFromSelection}
                  onBlockSelect={handleBlockSelect}
                />
              )}
            </main>
          </div>

          <aside className="hidden min-h-0 flex-col gap-6 2xl:flex">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Info className="h-4 w-4" />
                Planning insights
              </div>
              <div className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium text-foreground">{totalFocusBlocks} focus sessions</p>
                    <p>Scheduled across the selected range.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Plus className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="font-medium text-foreground">Quick create</p>
                    <p>Drag across any open space to block time instantly.</p>
                  </div>
                </div>
                {nextAvailableSlot && (
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="mt-0.5 h-4 w-4" />
                    <div>
                      <p className="font-medium text-foreground">Next public slot</p>
                      <p>{formatSlotLabel(nextAvailableSlot)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarIcon className="h-4 w-4" />
                Upcoming schedule
              </div>
              <ScrollArea className="mt-3 max-h-[320px] pr-2">
                <div className="space-y-3">
                  {upcomingItems.length ? (
                    upcomingItems.map(item => (
                      <div key={item.id} className="rounded-lg border border-border/60 p-3 text-xs">
                        <p className="text-sm font-medium" style={{ color: item.color }}>
                          {item.title}
                        </p>
                        {item.subtitle && <p className="mt-1 text-muted-foreground">{item.subtitle}</p>}
                        <p className="mt-1 text-muted-foreground">{format(item.start, "EEE, MMM d · p")}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nothing scheduled yet.</p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </aside>
        </div>
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={open => {
          setDialogOpen(open);
          if (!open) {
            resetDraft();
          }
        }}
      >
        <DialogContent className="flex w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-xl sm:max-w-[520px]">
          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-5">
              <div className="space-y-4">
                <Tabs
                  value={draft.kind}
                  onValueChange={value => handleDraftChange("kind", value as DraftKind)}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted/60 p-1 text-xs font-medium">
                    <TabsTrigger
                      value="event"
                      className="rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground"
                    >
                      Event
                    </TabsTrigger>
                    <TabsTrigger
                      value="booking"
                      className="rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground"
                    >
                      Booking slot
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Input
                  value={draft.title}
                  onChange={event => handleDraftChange("title", event.target.value)}
                  placeholder="Add title"
                  className="h-auto border-none bg-transparent px-0 text-2xl font-semibold leading-tight shadow-none focus-visible:border-transparent focus-visible:ring-0"
                />
              </div>
              <div className="space-y-1 rounded-2xl border border-border/60 bg-background/80 p-3 shadow-sm shadow-black/5">
                <div className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
                  <CalendarClock className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Schedule</span>
                      {scheduleSummary && <span className="truncate">{scheduleSummary}</span>}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <Input
                        type="date"
                        value={draft.date}
                        onChange={event => handleDraftChange("date", event.target.value)}
                        className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="time"
                          value={draft.startTime}
                          onChange={event => handleDraftChange("startTime", event.target.value)}
                          className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                        />
                        <Input
                          type="time"
                          value={draft.endTime}
                          onChange={event => handleDraftChange("endTime", event.target.value)}
                          className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Time zone · {timezone}</p>
                  </div>
                </div>
                {draft.kind === "event" && (
                  <div className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
                    <UserPlus className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">Guests</p>
                      <Input
                        value={draft.attendees}
                        onChange={event => handleDraftChange("attendees", event.target.value)}
                        placeholder="Add guests"
                        className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                      />
                      <p className="text-xs text-muted-foreground">Separate email addresses with commas.</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
                  <Palette className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">Color</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {COLOR_PRESETS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleDraftChange("color", color)}
                          className={cn(
                            "h-8 w-8 rounded-full border border-transparent transition-all",
                            draft.color === color
                              ? "ring-2 ring-offset-2 ring-offset-background ring-ring"
                              : "hover:ring-2 hover:ring-ring/40"
                          )}
                          style={{ backgroundColor: color }}
                          aria-label={`Use ${color} for this ${draft.kind}`}
                        />
                      ))}
                      <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-border/70 text-[10px] text-muted-foreground transition-colors hover:border-foreground/60">
                        <span className="sr-only">Choose a custom color</span>
                        <input
                          type="color"
                          value={draft.color}
                          onChange={event => handleDraftChange("color", event.target.value)}
                          className="sr-only"
                        />
                        +
                      </label>
                    </div>
                  </div>
                </div>
                {draft.kind === "event" && (
                  <div className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
                    <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">Location</p>
                      <Input
                        value={draft.location}
                        onChange={event => handleDraftChange("location", event.target.value)}
                        placeholder="Add location"
                        className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60">
                  <FileText className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {draft.kind === "event" ? "Description or attachments" : "Notes"}
                    </p>
                    <Textarea
                      value={draft.description}
                      onChange={event => handleDraftChange("description", event.target.value)}
                      placeholder={draft.kind === "event" ? "Add a description" : "Add internal notes"}
                      rows={3}
                      className="min-h-[60px] border border-transparent bg-muted/50 px-3 py-2 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              type="button"
              className="justify-start px-0 text-sm text-muted-foreground hover:text-foreground"
            >
              More options
            </Button>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Button variant="ghost" type="button" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate}>
                <Check className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedBlock && (
        <EventDetailsPopover
          block={selectedBlock.block}
          target={selectedBlock.target}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </div>
  );
};

export default CalendarPage;
