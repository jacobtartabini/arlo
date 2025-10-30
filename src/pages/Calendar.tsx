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
import { Calendar as CalendarIcon, CalendarClock, Check, ChevronLeft, ChevronRight, Link as LinkIcon, Plus, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  BOOKING_STORAGE_KEY,
  DEFAULT_BOOKINGS,
  DEFAULT_EVENTS,
  DEFAULT_TASKS,
  EVENT_STORAGE_KEY,
  BookingSlot,
  CalendarEvent,
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

type CalendarBlock = {
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
};

type DraftKind = "event" | "booking";

type DraftState = {
  kind: DraftKind;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  color: string;
  attendees: string;
};

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

  const miniMonthDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
      }),
    [selectedDate]
  );

  const weekdayLabels = React.useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, index) => format(addDays(start, index), "EEE"));
  }, []);

  const upcomingItems = React.useMemo(() => {
    const now = new Date();
    const items: {
      id: string;
      title: string;
      subtitle?: string;
      start: Date;
      color: string;
    }[] = [];

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

  const renderMonthGrid = () => (
    <div className="h-full min-h-[640px] overflow-auto">
      <div className="grid min-h-full grid-cols-7 border-l border-t">
        {days.map(day => {
          const dayBlocks = buildBlocks(events, bookings, day);
          const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex min-h-[120px] flex-col border-b border-r px-3 pb-3 pt-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                !isSameMonth(day, selectedDate) && "bg-muted/60 text-muted-foreground",
                isSelected && "bg-primary/5"
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
                {dayBlocks.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{dayBlocks.length}</span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {dayBlocks.slice(0, 3).map(block => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs"
                    style={{ borderLeft: `3px solid ${block.color}` }}
                  >
                    <span className="truncate font-medium">{block.title}</span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {minutesToTime(block.startMinutes)}
                    </span>
                  </div>
                ))}
                {dayBlocks.length > 3 && (
                  <span className="block text-xs text-muted-foreground">+{dayBlocks.length - 3} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div className="relative h-full min-h-[640px] overflow-auto">
      <div className="flex min-h-full">
        <div className="sticky left-0 z-10 flex w-16 flex-col border-r bg-card text-right text-[11px] text-muted-foreground">
          {Array.from({ length: (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES) / 60 }).map((_, index) => {
            const minutes = DISPLAY_START_MINUTES + index * 60;
            return (
              <div key={minutes} className="h-[52px] px-2 pt-2">
                {minutes % 120 === 0 ? minutesToTime(minutes) : ""}
              </div>
            );
          })}
        </div>
        <div className={cn("grid flex-1", view === "week" ? "min-w-[700px] grid-cols-7" : "grid-cols-1")}> 
          {focusBlocks.map(({ day, blocks }) => (
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              <div className="sticky top-0 z-10 flex h-16 items-end justify-between border-b bg-card/95 px-4 pb-3 backdrop-blur">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{format(day, "EEE")}</p>
                  <p className={cn("text-xl font-semibold", isToday(day) && "text-primary")}>{format(day, "d MMM")}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {blocks.filter(block => block.source === "task").length} focus
                </span>
              </div>
              <div
                className="relative"
                style={{ height: `${(HOURS_PER_DAY / 60) * HOUR_HEIGHT}px` }}
              >
                <div className="absolute inset-0">
                  {Array.from({ length: (HOURS_PER_DAY / 60) + 1 }).map((_, index) => (
                    <div
                      key={index}
                      className="absolute left-0 right-0 border-t border-dashed border-border/70"
                      style={{ top: `${index * HOUR_HEIGHT}px` }}
                    />
                  ))}
                </div>
                {blocks.map(block => {
                  const top = minutesToPx(block.startMinutes);
                  const height = Math.max(44, minutesToPx(block.endMinutes) - top);
                  return (
                    <div
                      key={block.id}
                      className={cn(
                        "absolute left-3 right-3 rounded-xl border border-border/60 bg-card/95 p-3 text-sm shadow-sm backdrop-blur transition",
                        block.source === "task" && "border-dashed"
                      )}
                      style={{ top, height, borderLeft: `4px solid ${block.color}` }}
                    >
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{block.title}</p>
                        {block.subtitle && (
                          <p className="text-xs text-muted-foreground">{block.subtitle}</p>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {minutesToTime(block.startMinutes)} – {minutesToTime(block.endMinutes)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMiniMonth = () => (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{format(selectedDate, "MMMM yyyy")}</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {weekdayLabels.map(label => (
          <span key={label}>{label.slice(0, 2)}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1 text-sm">
        {miniMonthDays.map(day => {
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isCurrentDay = isToday(day);
          const isSelectedDay = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex h-8 items-center justify-center rounded-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                !isCurrentMonth && "text-muted-foreground/60",
                isSelectedDay && "bg-primary text-primary-foreground",
                !isSelectedDay && isCurrentDay && "border border-primary text-primary",
                !isSelectedDay && !isCurrentDay && "hover:bg-muted"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
              <p className="text-sm text-muted-foreground">Intentional time-blocking with a calm, focused layout.</p>
            </div>
            <div className="flex items-center gap-2">
              <ToggleGroup type="single" value={view} onValueChange={value => value && setView(value as CalendarView)}>
                {VIEW_OPTIONS.map(option => (
                  <ToggleGroupItem key={option.id} value={option.id} className="px-3 py-1">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border bg-card">
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
            <Button variant="outline" size="sm" className="gap-2" onClick={() => handleNavigate("today")}>
              <Target className="h-4 w-4" />
              Today
            </Button>
            <span className="text-lg font-medium text-foreground">{rangeLabel}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-6 pb-6 pt-4 lg:pt-6">
        <aside className="hidden w-64 flex-col gap-6 lg:flex">
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <Button className="w-full justify-center gap-2" onClick={() => setDialogOpen(true)}>
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

          {renderMiniMonth()}

          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarIcon className="h-4 w-4" />
              Upcoming
            </div>
            <ScrollArea className="mt-3 max-h-[240px] pr-2">
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

        <main className="flex-1 overflow-hidden rounded-3xl border bg-card shadow-sm">
          {view === "month" ? renderMonthGrid() : renderTimeline()}
        </main>
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
