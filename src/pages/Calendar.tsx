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
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import {
  BadgeCheck,
  Calendar as CalendarIcon,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  RefreshCcw,
  Settings,
  Share2,
  Target,
  Users
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  BOOKING_STORAGE_KEY,
  DEFAULT_BOOKINGS,
  DEFAULT_EVENTS,
  DEFAULT_PROJECTS,
  DEFAULT_TASKS,
  EVENT_STORAGE_KEY,
  BookingSlot,
  CalendarEvent,
  Project,
  Task,
  formatSlotLabel,
  getPublicBookingUrl,
  getStoredBookings,
  getStoredEvents,
  setStoredBookings,
  setStoredEvents
} from "@/lib/calendar-data";

const WORK_START_MINUTES = 9 * 60;
const WORK_END_MINUTES = 18 * 60;
const DISPLAY_START_MINUTES = 6 * 60;
const DISPLAY_END_MINUTES = 22 * 60;
const HOURS_PER_DAY = DISPLAY_END_MINUTES - DISPLAY_START_MINUTES;
const HOUR_HEIGHT = 52;

const VIEW_OPTIONS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" }
] as const;

type CalendarView = (typeof VIEW_OPTIONS)[number]["id"];

type BlockType = "event" | "task" | "booking";

interface CalendarBlock {
  id: string;
  source: BlockType;
  title: string;
  subtitle?: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
  allDay?: boolean;
  isAvailable?: boolean;
  meta?: Record<string, unknown>;
}

type DraftKind = "event" | "booking";

interface DraftState {
  kind: DraftKind;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  color: string;
  attendees: string;
}

const priorityOrder: Record<Task["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1
};

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e"
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

function minutesToPx(minutes: number) {
  return ((minutes - DISPLAY_START_MINUTES) / 60) * HOUR_HEIGHT;
}

function pxToMinutes(px: number) {
  return Math.round(px / HOUR_HEIGHT) * 60 + DISPLAY_START_MINUTES;
}

function clampToDayRange(start: number, end: number) {
  return {
    start: Math.max(DISPLAY_START_MINUTES, Math.min(start, DISPLAY_END_MINUTES)),
    end: Math.max(DISPLAY_START_MINUTES, Math.min(end, DISPLAY_END_MINUTES))
  };
}

function getBusyIntervals(blocks: CalendarBlock[]) {
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: { start: number; end: number }[] = [];

  sorted.forEach(block => {
    if (!merged.length) {
      merged.push({ start: block.startMinutes, end: block.endMinutes });
      return;
    }

    const last = merged[merged.length - 1];
    if (block.startMinutes <= last.end) {
      last.end = Math.max(last.end, block.endMinutes);
    } else {
      merged.push({ start: block.startMinutes, end: block.endMinutes });
    }
  });

  return merged;
}

function scheduleTasks(
  date: Date,
  tasks: Task[],
  baseBlocks: CalendarBlock[]
): CalendarBlock[] {
  const busyIntervals = getBusyIntervals(baseBlocks);
  const result: CalendarBlock[] = [];
  let cursor = WORK_START_MINUTES;

  const advanceCursor = (minutes: number) => {
    cursor = Math.max(cursor, minutes);
    if (cursor >= WORK_END_MINUTES) {
      cursor = WORK_START_MINUTES;
    }
  };

  const fitWithinDay = (start: number, duration: number) => {
    const end = Math.min(start + duration, WORK_END_MINUTES);
    if (end - start < duration) return null;
    return clampToDayRange(start, end);
  };

  tasks
    .filter(task => !task.completed)
    .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
    .forEach(task => {
      const duration = task.estimatedTime ?? 60;

      let start = cursor;
      let placed = false;

      const tryPlace = (startMinutes: number) => {
        const window = fitWithinDay(startMinutes, duration);
        if (!window) return false;

        const overlaps = busyIntervals.some(interval => {
          return (
            window.start < interval.end &&
            window.end > interval.start
          );
        });

        if (!overlaps) {
          result.push({
            id: `task-${task.id}`,
            source: "task",
            title: task.title,
            subtitle: PRIORITY_LABEL[task.priority],
            date: format(date, "yyyy-MM-dd"),
            startMinutes: window.start,
            endMinutes: window.end,
            color: PRIORITY_COLOR[task.priority]
          });
          busyIntervals.push({ start: window.start, end: window.end });
          busyIntervals.sort((a, b) => a.start - b.start);
          placed = true;
          advanceCursor(window.end + 15);
          return true;
        }
        return false;
      };

      while (!placed && start < WORK_END_MINUTES) {
        if (!tryPlace(start)) {
          const nextBusy = busyIntervals.find(interval => interval.start >= start);
          if (nextBusy) {
            start = Math.max(nextBusy.end + 15, cursor + 15);
          } else {
            start += 30;
          }
        }
      }

      if (!placed) {
        result.push({
          id: `task-${task.id}`,
          source: "task",
          title: task.title,
          subtitle: "Queued",
          date: format(date, "yyyy-MM-dd"),
          startMinutes: WORK_END_MINUTES - 60,
          endMinutes: WORK_END_MINUTES,
          color: "#9ca3af",
          meta: { overflow: true }
        });
      }
    });

  return result;
}

function buildBlocks(events: CalendarEvent[], bookings: BookingSlot[], day: Date, tasks: Task[] = []) {
  const dayStr = format(day, "yyyy-MM-dd");

  const eventBlocks: CalendarBlock[] = events
    .filter(event => event.date === dayStr)
    .map(event => {
      const start = parseTime(event.startTime);
      const end = parseTime(event.endTime);
      return {
        id: event.id,
        source: "event",
        title: event.title,
        subtitle: event.location || event.category,
        date: dayStr,
        startMinutes: start,
        endMinutes: end,
        color: event.color || "#2563eb",
        allDay: Boolean(event.allDay),
        meta: {
          description: event.description,
          attendees: event.attendees
        }
      } satisfies CalendarBlock;
    });

  const bookingBlocks: CalendarBlock[] = bookings
    .filter(slot => slot.date === dayStr)
    .map(slot => ({
      id: slot.id,
      source: "booking",
      title: slot.available ? formatSlotLabel(slot) : slot.title ?? formatSlotLabel(slot),
      subtitle: slot.available ? "Available" : slot.bookedBy ? `Booked by ${slot.bookedBy}` : undefined,
      date: slot.date,
      startMinutes: parseTime(slot.startTime),
      endMinutes: parseTime(slot.endTime),
      color: slot.available ? "#22c55e" : "#7c3aed",
      isAvailable: slot.available,
      meta: slot
    }));

  const baseBlocks = [...eventBlocks, ...bookingBlocks].sort((a, b) => a.startMinutes - b.startMinutes);
  const taskBlocks = scheduleTasks(day, tasks, baseBlocks);

  return [...baseBlocks, ...taskBlocks].sort((a, b) => a.startMinutes - b.startMinutes);
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function useStoredState<T>(key: string, defaults: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState<T>(() => {
    if (key === EVENT_STORAGE_KEY) {
      return (getStoredEvents() as T) ?? defaults;
    }
    if (key === BOOKING_STORAGE_KEY) {
      return (getStoredBookings() as T) ?? defaults;
    }
    return defaults;
  });

  React.useEffect(() => {
    if (key === EVENT_STORAGE_KEY) {
      setStoredEvents(state as unknown as CalendarEvent[]);
    }
    if (key === BOOKING_STORAGE_KEY) {
      setStoredBookings(state as unknown as BookingSlot[]);
    }
  }, [key, state]);

  return [state, setState];
}

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
  const [events, setEvents] = useStoredState<CalendarEvent[]>(EVENT_STORAGE_KEY, DEFAULT_EVENTS);
  const [bookings, setBookings] = useStoredState<BookingSlot[]>(BOOKING_STORAGE_KEY, DEFAULT_BOOKINGS);
  const [draft, setDraft] = React.useState<DraftState>(DEFAULT_DRAFT);
  const [isDialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setDraft(prev => ({ ...prev, date: format(selectedDate, "yyyy-MM-dd") }));
  }, [selectedDate]);

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

  const focusBlocks = React.useMemo(() => {
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

  const connectedCalendars = React.useMemo(
    () => ["Google", "Apple", "Outlook"].map(name => ({ id: name.toLowerCase(), name })),
    []
  );

  const nextBooking = React.useMemo(() => {
    const now = new Date();
    return bookings
      .filter(slot => slot.available)
      .map(slot => ({ slot, start: parseISO(`${slot.date}T${slot.startTime}:00`) }))
      .filter(entry => entry.start > now)
      .sort((a, b) => a.start.getTime() - b.start.getTime())[0]?.slot;
  }, [bookings]);

  const bookingLink = React.useMemo(() => getPublicBookingUrl("jacob"), []);

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

  const resetDraft = () => {
    setDraft(DEFAULT_DRAFT);
  };

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

  const handleRemoveBlock = (block: CalendarBlock) => {
    if (block.source === "event") {
      setEvents(prev => prev.filter(event => event.id !== block.id));
      toast({ title: "Event removed", description: `${block.title} was removed.` });
    }
    if (block.source === "booking") {
      setBookings(prev => prev.filter(slot => slot.id !== block.id));
      toast({ title: "Booking removed", description: `${block.title} was removed.` });
    }
  };

  const plannedProjects = React.useMemo(() => DEFAULT_PROJECTS, []);

  const renderMonthGrid = () => (
    <div className="grid grid-cols-7 gap-px rounded-xl border bg-muted">
      {days.map(day => {
        const dayBlocks = buildBlocks(events, bookings, day);
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-[120px] flex-col bg-background p-3",
              !isSameMonth(day, selectedDate) && "bg-muted/60 text-muted-foreground"
            )}
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full",
                  isToday(day) && "bg-primary text-primary-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              <span>{dayBlocks.length}</span>
            </div>
            <div className="mt-2 space-y-1">
              {dayBlocks.slice(0, 3).map(block => (
                <div
                  key={block.id}
                  className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1 text-xs"
                  style={{ borderLeft: `3px solid ${block.color}` }}
                >
                  <span className="truncate font-medium">{block.title}</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {minutesToTime(block.startMinutes)}
                  </span>
                </div>
              ))}
              {dayBlocks.length > 3 && (
                <Button variant="link" className="h-auto p-0 text-xs">
                  +{dayBlocks.length - 3} more
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderTimeline = () => (
    <div className="relative overflow-hidden rounded-2xl border bg-background">
      <div className="absolute inset-y-0 left-16 w-px bg-border" />
      <div className="flex">
        <div
          className="flex w-16 flex-col border-r bg-muted/50 text-right text-xs"
          style={{ lineHeight: `${HOUR_HEIGHT}px` }}
        >
          {Array.from({ length: (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES) / 60 }).map((_, index) => {
            const minutes = DISPLAY_START_MINUTES + index * 60;
            return (
              <div key={minutes} className="h-[52px] px-2 py-3 text-muted-foreground">
                {minutes % 120 === 0 ? minutesToTime(minutes) : ""}
              </div>
            );
          })}
        </div>
        <div className="flex-1">
          <div className={cn("grid", view === "week" ? "grid-cols-7" : "grid-cols-1")}> 
            {focusBlocks.map(({ day, blocks }) => (
              <div key={day.toISOString()} className="relative border-l">
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur">
                  <div>
                    <p className="text-xs text-muted-foreground">{format(day, "EEEE")}</p>
                    <p className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>{format(day, "d MMM")}</p>
                  </div>
                  <Badge variant={isToday(day) ? "default" : "secondary"}>
                    {blocks.filter(block => block.source === "task").length} focus blocks
                  </Badge>
                </div>
                <div
                  className="relative"
                  style={{ height: `${(HOURS_PER_DAY / 60) * HOUR_HEIGHT}px` }}
                >
                  {blocks.map(block => {
                    const top = minutesToPx(block.startMinutes);
                    const height = Math.max(40, minutesToPx(block.endMinutes) - top);
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "group absolute left-4 right-4 cursor-pointer rounded-xl border bg-background shadow-sm transition",
                          block.source === "task" && "border-dashed"
                        )}
                        style={{ top, height, borderLeft: `4px solid ${block.color}` }}
                      >
                        <div className="flex h-full flex-col justify-between p-3">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold leading-tight">{block.title}</p>
                            {block.subtitle && (
                              <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                              {minutesToTime(block.startMinutes)} – {minutesToTime(block.endMinutes)}
                            </span>
                            {block.source !== "task" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                onClick={() => handleRemoveBlock(block)}
                              >
                                <span className="sr-only">Remove block</span>
                                ×
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Badge className="bg-primary/10 text-primary">Unified workspace</Badge>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleNavigate("today")}>
              <Target className="h-4 w-4" />
              Today
            </Button>
            <div className="flex items-center rounded-full border">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleNavigate("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleNavigate("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A calm, Motion-inspired view that blends meetings, bookings and prioritized tasks. Your external booking
            page stays in sync, so confirmed sessions appear instantly.
          </p>
        </div>
        <Card className="w-full max-w-sm border-primary/30">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="h-4 w-4" />
              Public booking link
            </CardTitle>
            <p className="text-xs text-muted-foreground">Share this link to let anyone reserve time on your calendar.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-full border px-3 py-2 text-xs">
              <div className="truncate font-medium">{bookingLink.replace(/^https?:\/\//, "")}</div>
              <div className="text-[10px] text-muted-foreground">Syncs directly with your /calendar board</div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCopyBookingLink}>
                <LinkIcon className="mr-2 h-4 w-4" /> Copy link
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={bookingLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  <span className="sr-only">Open booking link</span>
                </a>
              </Button>
            </div>
            {nextBooking && (
              <div className="rounded-lg border bg-muted/50 p-3 text-xs">
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next available slot
                </p>
                <p className="mt-1 font-medium">{formatSlotLabel(nextBooking)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground">Week of</p>
                <p className="text-base font-semibold">{rangeLabel}</p>
              </div>
            </div>
            <ToggleGroup type="single" value={view} onValueChange={value => value && setView(value as CalendarView)}>
              {VIEW_OPTIONS.map(option => (
                <ToggleGroupItem key={option.id} value={option.id} className="px-3 py-1">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {view === "month" ? renderMonthGrid() : renderTimeline()}
        </div>

        <div className="space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <RefreshCcw className="h-4 w-4" />
                Motion-style plan
              </CardTitle>
              <p className="text-xs text-muted-foreground">Auto-arranged tasks layered with your meetings for deep work.</p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[260px] pr-3">
                <div className="space-y-3">
                  {focusBlocks.map(({ day, blocks }) => (
                    <div key={day.toISOString()} className="rounded-lg border bg-muted/40 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{format(day, "EEEE, MMM d")}</span>
                        <span>{blocks.length} items</span>
                      </div>
                      <div className="mt-2 space-y-2">
                        {blocks.map(block => (
                          <div key={block.id} className="flex items-start gap-3">
                            <div className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: block.color }} />
                            <div>
                              <p className="text-sm font-medium leading-tight">{block.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {minutesToTime(block.startMinutes)} – {minutesToTime(block.endMinutes)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Connected calendars
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {connectedCalendars.map(calendar => (
                <div key={calendar.id} className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{calendar.name} Calendar</p>
                      <p className="text-xs text-muted-foreground">Sync active · two-way availability</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Calendar settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <Tabs defaultValue="tasks" className="w-full">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Workspace streams</CardTitle>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <TabsContent value="tasks" className="space-y-3">
                  {DEFAULT_TASKS.map(task => (
                    <div key={task.id} className="rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{task.title}</p>
                        <Badge style={{ backgroundColor: PRIORITY_COLOR[task.priority], color: "#0f172a" }}>
                          {PRIORITY_LABEL[task.priority]}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  ))}
                </TabsContent>
                <TabsContent value="projects" className="space-y-3">
                  {plannedProjects.map(project => {
                    const start = format(parseISO(project.startDate), "MMM d");
                    const end = format(parseISO(project.endDate), "MMM d, yyyy");
                    return (
                      <div key={project.id} className="rounded-xl border p-3">
                        <p className="text-sm font-semibold">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{project.description}</p>
                        <div className="mt-2 flex items-center justify-between text-xs">
                          <span>{start} – {end}</span>
                          <Badge variant="outline">{project.progress}%</Badge>
                        </div>
                        {project.milestones?.length ? (
                          <div className="mt-3 space-y-1">
                            {project.milestones.slice(0, 2).map(milestone => (
                              <div key={milestone.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                <span>{milestone.title}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create new item</DialogTitle>
            <DialogDescription>Publish an event or open a public booking slot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select
              value={draft.kind}
              onValueChange={value => handleDraftChange("kind", value as DraftKind)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="booking">Public booking slot</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={draft.title}
                onChange={event => handleDraftChange("title", event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={draft.date}
                  onChange={event => handleDraftChange("date", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={draft.color}
                  onChange={event => handleDraftChange("color", event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="time"
                  value={draft.startTime}
                  onChange={event => handleDraftChange("startTime", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="time"
                  value={draft.endTime}
                  onChange={event => handleDraftChange("endTime", event.target.value)}
                />
              </div>
            </div>
            {draft.kind === "event" && (
              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees</Label>
                <Input
                  id="attendees"
                  placeholder="Comma separated emails"
                  value={draft.attendees}
                  onChange={event => handleDraftChange("attendees", event.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Notes</Label>
              <Textarea
                id="description"
                rows={3}
                value={draft.description}
                onChange={event => handleDraftChange("description", event.target.value)}
              />
            </div>
            {draft.kind === "event" && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={draft.location}
                  onChange={event => handleDraftChange("location", event.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
