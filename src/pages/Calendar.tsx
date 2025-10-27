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
  BookMarked,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe,
  Link,
  Plus,
  RefreshCw,
  Settings,
  Target,
  Users,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useToast } from "@/components/ui/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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

type CalendarBlock = {
const WORK_START_MINUTES = 8 * 60;
const WORK_END_MINUTES = 18 * 60;
const DISPLAY_START_MINUTES = 6 * 60;
const DISPLAY_END_MINUTES = 22 * 60;
const HOUR_HEIGHT = 52;

interface CalendarEvent {
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
  date: string;
  category: "personal" | "work" | "school" | "meeting" | "project";
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
interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  category: "personal" | "work" | "school";
  dueDate?: string;
  completed: boolean;
  estimatedTime?: number;
}

interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
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
interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  available: boolean;
  title?: string;
  bookedBy?: string;
}

type CalendarView = "month" | "week" | "day";
type BlockType = "event" | "task" | "booking" | "milestone";

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

const PRIORITY_COLOR: Record<Task["priority"], string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981"
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low"
};

const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Sync",
    description: "Weekly planning with product and design",
    startTime: "09:30",
    endTime: "10:30",
    date: "2024-01-15",
    category: "work",
    color: "#3b82f6",
    attendees: ["alex@arlo.ai", "casey@arlo.ai"]
  },
  {
    id: "2",
    title: "Investor Update",
    description: "Q1 numbers and roadmap discussion",
    startTime: "13:00",
    endTime: "14:00",
    date: "2024-01-16",
    category: "work",
    color: "#8b5cf6"
  },
  {
    id: "3",
    title: "Gym",
    startTime: "18:00",
    endTime: "19:00",
    date: "2024-01-16",
    category: "personal",
    color: "#22c55e"
  }
];

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Revise onboarding flow",
    description: "Audit drop-off points and capture new requirements",
    priority: "high",
    category: "work",
    dueDate: "2024-01-17",
    completed: false,
    estimatedTime: 120
  },
  {
    id: "2",
    title: "Follow up with beta customers",
    priority: "medium",
    category: "work",
    dueDate: "2024-01-19",
    completed: false,
    estimatedTime: 45
  },
  {
    id: "3",
    title: "Deep work: strategy memo",
    description: "Outline positioning for upcoming launch",
    priority: "high",
    category: "work",
    completed: false,
    estimatedTime: 180
  },
  {
    id: "4",
    title: "Personal training",
    priority: "low",
    category: "personal",
    dueDate: "2024-01-20",
    completed: false,
    estimatedTime: 60
  }
];

const initialProjects: Project[] = [
  {
    id: "1",
    name: "Command Center V2",
    description: "Unified productivity hub with AI-native workflows",
    startDate: "2024-01-01",
    endDate: "2024-03-31",
    progress: 42,
    color: "#f97316",
    milestones: [
      { id: "m1", title: "Design freeze", date: "2024-01-22", completed: false },
      { id: "m2", title: "Alpha release", date: "2024-02-12", completed: false },
      { id: "m3", title: "Public launch", date: "2024-03-31", completed: false }
    ]
  }
];

const initialBookings: BookingSlot[] = [
  {
    id: "b1",
    title: "Product demo",
    bookedBy: "jordan@startup.io",
    startTime: "11:00",
    endTime: "11:45",
    date: "2024-01-15",
    available: false
  },
  {
    id: "b2",
    startTime: "15:00",
    endTime: "15:45",
    date: "2024-01-15",
    available: true
  },
  {
    id: "b3",
    title: "Investor intro",
    bookedBy: "maria@vc.com",
    startTime: "10:00",
    endTime: "10:45",
    date: "2024-01-17",
    available: false
  }
];

const calendarConnections = [
  {
    id: "google",
    name: "Google Calendar",
    description: "Two-way sync for events, tasks and meeting links",
    icon: CalendarIcon
  },
  {
    id: "apple",
    name: "Apple Calendar",
    description: "Sync primary and delegated calendars from iCloud",
    icon: CalendarIcon
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Sync work calendars, Teams meetings and bookings",
    icon: CalendarIcon
  }
] as const;

const priorityOrder: Record<Task["priority"], number> = {
  high: 3,
  medium: 2,
  low: 1
};

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function clampToDayRange(start: number, end: number) {
  return {
    start: Math.max(0, Math.min(start, 24 * 60)),
    end: Math.max(0, Math.min(end, 24 * 60))
  };
}

interface Interval {
  start: number;
  end: number;
}

function mergeBusyIntervals(intervals: Interval[]): Interval[] {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];

  for (const current of sorted) {
    if (!merged.length) {
      merged.push({ ...current });
      continue;
    }

    const last = merged[merged.length - 1];
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

function computeFreeIntervals(intervals: Interval[]): Interval[] {
  const merged = mergeBusyIntervals(
    intervals
      .map(interval => ({
        start: Math.max(interval.start, WORK_START_MINUTES),
        end: Math.min(interval.end, WORK_END_MINUTES)
      }))
      .filter(interval => interval.end > interval.start)
  );

  const free: Interval[] = [];
  let cursor = WORK_START_MINUTES;

  for (const interval of merged) {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < WORK_END_MINUTES) {
    free.push({ start: cursor, end: WORK_END_MINUTES });
  }

  return free;
}

function priorityComparator(a: Task, b: Task) {
  const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
  if (priorityDiff !== 0) return priorityDiff;

  if (a.dueDate && b.dueDate) {
    return compareAsc(parseISO(a.dueDate), parseISO(b.dueDate));
  }

  if (a.dueDate) return -1;
  if (b.dueDate) return 1;

  return a.title.localeCompare(b.title);
}

interface GenerateScheduleArgs {
  days: Date[];
  tasks: Task[];
  events: CalendarEvent[];
  bookings: BookingSlot[];
}

function generateOptimizedSchedule({ days, tasks, events, bookings }: GenerateScheduleArgs) {
  const queue = tasks.filter(task => !task.completed).sort(priorityComparator);
  const scheduled: CalendarBlock[] = [];

  for (const day of days) {
    if (!queue.length) break;
    const dateKey = format(day, "yyyy-MM-dd");

    const busy: Interval[] = [];
    events
      .filter(event => event.date === dateKey)
      .forEach(event => {
        busy.push({ start: timeToMinutes(event.startTime), end: timeToMinutes(event.endTime) });
      });

    bookings
      .filter(slot => slot.date === dateKey)
      .forEach(slot => {
        busy.push({ start: timeToMinutes(slot.startTime), end: timeToMinutes(slot.endTime) });
      });

    const freeIntervals = computeFreeIntervals(busy);

    for (const interval of freeIntervals) {
      let cursor = interval.start;

      while (cursor < interval.end - 20 && queue.length) {
        const available = interval.end - cursor;
        const taskIndex = queue.findIndex(task => (task.estimatedTime ?? 60) <= available);
        if (taskIndex === -1) break;

        const [task] = queue.splice(taskIndex, 1);
        const duration = task.estimatedTime ?? 60;
        const end = Math.min(cursor + duration, interval.end);

        scheduled.push({
          id: `task-${task.id}-${dateKey}`,
          source: "task",
          title: task.title,
          subtitle: `${PRIORITY_LABEL[task.priority]} priority • ${duration} min`,
          date: dateKey,
          startMinutes: cursor,
          endMinutes: end,
          color: PRIORITY_COLOR[task.priority],
          meta: {
            taskId: task.id,
            dueDate: task.dueDate
          }
        });

        cursor = end + 10;
      }
    }
  }

  return {
    scheduled,
    remaining: queue
  };
}

interface EventComposerProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  draft?: {
    date: string;
    startTime: string;
    endTime: string;
  };
  event?: CalendarEvent | null;
  onSubmit: (event: Omit<CalendarEvent, "id"> & { id?: string }) => void;
  onDelete?: (id: string) => void;
}

function EventComposer({ open, onOpenChange, draft, event, onSubmit, onDelete }: EventComposerProps) {
  const isEditing = Boolean(event);
  const [formData, setFormData] = React.useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    date: event?.date ?? draft?.date ?? format(new Date(), "yyyy-MM-dd"),
    startTime: event?.startTime ?? draft?.startTime ?? "09:00",
    endTime: event?.endTime ?? draft?.endTime ?? "10:00",
    category: event?.category ?? ("work" as const),
    color: event?.color ?? "#3b82f6"
  });

  React.useEffect(() => {
    if (!open) return;
    setFormData({
      title: event?.title ?? "",
      description: event?.description ?? "",
      date: event?.date ?? draft?.date ?? format(new Date(), "yyyy-MM-dd"),
      startTime: event?.startTime ?? draft?.startTime ?? "09:00",
      endTime: event?.endTime ?? draft?.endTime ?? "10:00",
      category: event?.category ?? ("work" as const),
      color: event?.color ?? "#3b82f6"
    });
  }, [open, event, draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit event" : "Create event"}</DialogTitle>
          <DialogDescription>
            Synced instantly to every connected calendar and your booking page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Title</label>
            <Input
              value={formData.title}
              onChange={event => setFormData(prev => ({ ...prev, title: event.target.value }))}
              placeholder="Event name"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Description</label>
            <Textarea
              value={formData.description}
              onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))}
              placeholder="Agenda, links, or AI briefing notes"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={event => setFormData(prev => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value as CalendarEvent["category"] }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Start</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={event => setFormData(prev => ({ ...prev, startTime: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">End</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={event => setFormData(prev => ({ ...prev, endTime: event.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground">Color</label>
            <div className="flex gap-2">
              {["#3b82f6", "#10b981", "#f97316", "#8b5cf6", "#ef4444"].map(color => (
                <button
                  key={color}
                  type="button"
                  className={cn(
                    "h-8 w-8 rounded-full border-2 border-transparent transition hover:scale-105",
                    formData.color === color && "ring-2 ring-offset-2 ring-ring"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  aria-label={`Use ${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4">
          {isEditing && event ? (
            <Button variant="destructive" type="button" onClick={() => onDelete?.(event.id)}>
              Delete
            </Button>
          ) : (
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={() => onSubmit(isEditing && event ? { ...formData, id: event.id } : formData)}>
            {isEditing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TimeGridProps {
  days: Date[];
  blocks: CalendarBlock[];
  onSelectSlot: (options: { date: string; startMinutes: number }) => void;
  onSelectBlock: (block: CalendarBlock) => void;
}

function TimeGrid({ days, blocks, onSelectSlot, onSelectBlock }: TimeGridProps) {
  const hours = React.useMemo(
    () => Array.from({ length: (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES) / 60 + 1 }, (_, index) => DISPLAY_START_MINUTES + index * 60),
    []
  );
  const timelineHeight = (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES) / 60 * HOUR_HEIGHT;

  return (
    <div className="rounded-2xl border bg-background shadow-sm">
      <div className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="border-b border-r bg-muted/30 px-4 py-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          All day
        </div>
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayBlocks = blocks.filter(block => block.date === dateKey && block.allDay);

          return (
            <div key={dateKey} className="border-b border-l px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">{format(day, "EEE")}</p>
                  <p className={cn("text-lg font-semibold", isToday(day) && "text-primary")}>{format(day, "MMM d")}</p>
                </div>
                {isToday(day) && (
                  <Badge variant="outline" className="text-xs">
                    Today
                  </Badge>
                )}
              </div>
              <div className="mt-3 space-y-2">
                {dayBlocks.length ? (
                  dayBlocks.map(block => (
                    <button
                      key={block.id}
                      onClick={() => onSelectBlock(block)}
                      className="w-full rounded-md border bg-muted/40 px-3 py-2 text-left transition hover:bg-muted/60"
                    >
                      <p className="text-sm font-medium" style={{ color: block.color }}>
                        {block.title}
                      </p>
                      {block.subtitle && <p className="text-xs text-muted-foreground">{block.subtitle}</p>}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No all-day events</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(0, 1fr))` }}>
        <div className="relative border-r text-right text-xs text-muted-foreground">
          {hours.map(minute => (
            <div key={minute} className="h-[52px] border-b px-3">
              <span className="-mt-2 inline-block translate-y-[-50%]">
                {format(addMinutes(startOfDay(new Date()), minute), "ha")}
              </span>
            </div>
          ))}
        </div>

        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayBlocks = blocks.filter(block => block.date === dateKey && !block.allDay);

          return (
            <div key={dateKey} className="relative border-l" style={{ height: timelineHeight }}>
              {Array.from({ length: (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES) / 30 }, (_, index) => index).map(index => {
                const minute = DISPLAY_START_MINUTES + index * 30;
                const isHour = minute % 60 === 0;
                return (
                  <div
                    key={`${dateKey}-${minute}`}
                    className={cn(
                      "absolute left-0 right-0 border-b border-dashed",
                      isHour ? "border-muted" : "border-muted/40"
                    )}
                    style={{ top: ((minute - DISPLAY_START_MINUTES) / 60) * HOUR_HEIGHT }}
                  />
                );
              })}

              <div
                className="absolute inset-0 cursor-crosshair"
                onDoubleClick={event => {
                  const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const relativeY = event.clientY - rect.top;
                  const minutesFromStart = Math.max(0, Math.floor((relativeY / timelineHeight) * (DISPLAY_END_MINUTES - DISPLAY_START_MINUTES)));
                  const startMinutes = DISPLAY_START_MINUTES + Math.round(minutesFromStart / 30) * 30;
                  onSelectSlot({ date: dateKey, startMinutes });
                }}
              />

              {dayBlocks.map(block => {
                const { start, end } = clampToDayRange(block.startMinutes, block.endMinutes);
                if (end <= DISPLAY_START_MINUTES || start >= DISPLAY_END_MINUTES) return null;

                const top = Math.max(start, DISPLAY_START_MINUTES);
                const height = Math.max(32, (Math.min(end, DISPLAY_END_MINUTES) - Math.max(start, DISPLAY_START_MINUTES)) / 60 * HOUR_HEIGHT);

                return (
                  <button
                    key={block.id}
                    onClick={() => onSelectBlock(block)}
                    className={cn(
                      "absolute left-2 right-2 rounded-lg border px-3 py-2 text-left shadow-sm transition focus:outline-none",
                      block.source === "task"
                        ? "bg-primary/10 hover:bg-primary/20"
                        : block.source === "booking" && block.isAvailable
                          ? "bg-emerald-500/10 hover:bg-emerald-500/20"
                          : "bg-background/80 hover:bg-background"
                    )}
                    style={{
                      top: ((top - DISPLAY_START_MINUTES) / 60) * HOUR_HEIGHT,
                      height,
                      borderColor: block.color
                    }}
                  >
                    <div className="flex items-center gap-2 text-xs font-medium" style={{ color: block.color }}>
                      <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: block.color }} />
                      {block.source === "booking" && block.isAvailable ? "Availability" : block.title}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {minutesToTime(Math.max(start, DISPLAY_START_MINUTES))} – {minutesToTime(Math.min(end, DISPLAY_END_MINUTES))}
                    </p>
                    {block.subtitle && <p className="mt-1 text-xs text-muted-foreground">{block.subtitle}</p>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MonthGridProps {
  days: Date[];
  blocks: CalendarBlock[];
  month: Date;
  onSelectDay: (day: Date) => void;
  onSelectBlock: (block: CalendarBlock) => void;
  onCreate: (day: Date) => void;
}

function MonthGrid({ days, blocks, month, onSelectDay, onSelectBlock, onCreate }: MonthGridProps) {
  return (
    <div className="rounded-2xl border bg-background p-4 shadow-sm">
      <div className="grid grid-cols-7 gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="px-2 text-center">
            {format(addDays(startOfWeek(new Date()), index), "EEE")}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayBlocks = blocks.filter(block => block.date === dateKey);
          const isCurrentMonth = isSameMonth(day, month);

          return (
            <div
              key={dateKey}
              className={cn(
                "min-h-[120px] rounded-xl border p-2 transition",
                isCurrentMonth ? "bg-muted/20" : "bg-muted/10 opacity-60",
                isToday(day) && "ring-2 ring-primary"
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onSelectDay(day)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    isToday(day) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {format(day, "d")}
                </button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onCreate(day)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2 text-xs">
                {dayBlocks.length ? (
                  dayBlocks.slice(0, 4).map(block => (
                    <button
                      key={block.id}
                      onClick={() => onSelectBlock(block)}
                      className="flex w-full items-center gap-2 truncate rounded-md bg-background/80 px-2 py-1 text-left shadow-sm transition hover:bg-background"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: block.color }} />
                      <span className="truncate font-medium" style={{ color: block.color }}>
                        {block.title}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-muted-foreground">No events</p>
                )}
                {dayBlocks.length > 4 && <p className="text-[10px] text-muted-foreground">+{dayBlocks.length - 4} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date("2024-01-15T08:00:00"));
  const [view, setView] = React.useState<CalendarView>("week");
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [tasks] = React.useState<Task[]>(initialTasks);
  const [projects] = React.useState<Project[]>(initialProjects);
  const [bookings] = React.useState<BookingSlot[]>(initialBookings);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [draftSlot, setDraftSlot] = React.useState<{ date: string; startTime: string; endTime: string } | undefined>();
  const [connections, setConnections] = React.useState<Record<string, boolean>>({ google: true, apple: false, outlook: false });
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    document.title = "Calendar • Arlo";
  }, []);

  const visibleRange = React.useMemo(() => {
    switch (view) {
      case "day":
        return { start: startOfDay(currentDate), end: startOfDay(currentDate) };
      case "week":
        return { start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) };
      default:
        return { start: startOfWeek(startOfMonth(currentDate)), end: endOfWeek(endOfMonth(currentDate)) };
    }
  }, [currentDate, view]);

  const visibleDays = React.useMemo(() => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }), [visibleRange]);

  const { scheduled: scheduledTasks, remaining: unscheduledTasks } = React.useMemo(
    () => generateOptimizedSchedule({ days: visibleDays, tasks, events, bookings }),
    [visibleDays, tasks, events, bookings]
  );

  const milestoneBlocks = React.useMemo<CalendarBlock[]>(() =>
    projects.flatMap(project =>
      project.milestones.map(milestone => ({
        id: `milestone-${project.id}-${milestone.id}`,
        source: "milestone" as const,
        title: `${milestone.title} · ${project.name}`,
        subtitle: milestone.completed ? "Completed" : "Upcoming milestone",
        date: milestone.date,
        startMinutes: 0,
        endMinutes: 24 * 60,
        color: project.color,
        allDay: true
      }))
    ),
  [projects]);

  const bookingBlocks = React.useMemo<CalendarBlock[]>(() =>
    bookings.map(slot => ({
      id: `booking-${slot.id}`,
      source: "booking" as const,
      title: slot.title ?? (slot.available ? "Available" : "Booked session"),
      subtitle: slot.bookedBy ?? (slot.available ? "Open for scheduling" : undefined),
      date: slot.date,
      startMinutes: timeToMinutes(slot.startTime),
      endMinutes: timeToMinutes(slot.endTime),
      color: slot.available ? "#10b981" : "#2563eb",
      isAvailable: slot.available
    })),
  [bookings]);

  const eventBlocks = React.useMemo<CalendarBlock[]>(() =>
    events.map(event => ({
      id: event.id,
      source: "event" as const,
      title: event.title,
      subtitle: event.description,
      date: event.date,
      startMinutes: timeToMinutes(event.startTime),
      endMinutes: timeToMinutes(event.endTime),
      color: event.color
    })),
  [events]);

  const allBlocks = React.useMemo(
    () => [...eventBlocks, ...bookingBlocks, ...scheduledTasks, ...milestoneBlocks],
    [eventBlocks, bookingBlocks, scheduledTasks, milestoneBlocks]
  );

  const upcomingItems = React.useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return allBlocks
      .filter(block => block.date >= today)
      .sort((a, b) => (a.date === b.date ? a.startMinutes - b.startMinutes : a.date.localeCompare(b.date)))
      .slice(0, 8);
  }, [allBlocks]);

  const navigate = (direction: "next" | "prev") => {
    setCurrentDate(previous => {
      switch (view) {
        case "day":
          return addDays(previous, direction === "next" ? 1 : -1);
        case "week":
          return addWeeks(previous, direction === "next" ? 1 : -1);
        default:
          return addMonths(previous, direction === "next" ? 1 : -1);
      }
    });
  };

  const openComposerForSlot = React.useCallback((date: string, startMinutes: number) => {
    const startTime = minutesToTime(startMinutes);
    const endTime = minutesToTime(startMinutes + 60);
    setDraftSlot({ date, startTime, endTime });
    setEditingEvent(null);
    setComposerOpen(true);
  }, []);

  const handleCreateEvent = (payload: Omit<CalendarEvent, "id"> & { id?: string }) => {
    const normalized: CalendarEvent = {
      id: payload.id ?? crypto.randomUUID(),
      title: payload.title,
      description: payload.description,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
      category: payload.category,
      color: payload.color,
      attendees: payload.attendees ?? []
    };

    setEvents(previous => {
      const existingIndex = previous.findIndex(event => event.id === normalized.id);
      if (existingIndex >= 0) {
        const clone = [...previous];
        clone[existingIndex] = normalized;
        return clone;
      }
      return [...previous, normalized];
    });

    setComposerOpen(false);
    setEditingEvent(null);
  };

  const handleSelectBlock = (block: CalendarBlock) => {
    if (block.source === "event") {
      const selected = events.find(event => event.id === block.id);
      if (selected) {
        setEditingEvent(selected);
        setDraftSlot({ date: selected.date, startTime: selected.startTime, endTime: selected.endTime });
        setComposerOpen(true);
      }
      return;
    }

    if (block.source === "booking" && block.isAvailable) {
      openComposerForSlot(block.date, block.startMinutes);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(previous => previous.filter(event => event.id !== eventId));
    setComposerOpen(false);
    setEditingEvent(null);
  };

  const bookingLink = "https://arlo.ai/schedule/your-link";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/40 p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarIcon className="h-3.5 w-3.5" />
              Calendar intelligence
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Orchestrate your time like Motion</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Tasks, projects, meetings, and bookings live in one timeline. Arlo optimizes your schedule and syncs with Google, Apple, and Outlook automatically.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border bg-background p-1">
              {(["day", "week", "month"] as CalendarView[]).map(mode => (
                <Button
                  key={mode}
                  variant={view === mode ? "default" : "ghost"}
                  className="px-4"
                  onClick={() => setView(mode)}
                >
                  {mode[0].toUpperCase() + mode.slice(1)}
                </Button>
              ))}
            </div>
            <Separator orientation="vertical" className="hidden h-8 lg:block" />
            <Button variant="outline" className="gap-2" onClick={() => setComposerOpen(true)}>
              <Plus className="h-4 w-4" />
              New event
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <Card className="border border-dashed border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-primary">Motion-style automation</p>
                <p className="text-sm text-muted-foreground">
                  Arlo reshuffles tasks, buffers travel, and fills cancellations instantly. Double tap anywhere on the grid to create a block.
                </p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setView("week")}>
              <RefreshCw className="h-4 w-4" />
              Recalculate plan
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-6">
            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base font-semibold">Connected calendars</span>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Globe className="h-3.5 w-3.5" />
                    Sync live
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calendarConnections.map(connection => (
                  <div key={connection.id} className="flex items-start justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <connection.icon className="h-4 w-4 text-muted-foreground" />
                        {connection.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{connection.description}</p>
                    </div>
                    <Switch
                      checked={connections[connection.id]}
                      onCheckedChange={checked => setConnections(prev => ({ ...prev, [connection.id]: checked }))}
                    />
                  </div>
                ))}
                <div className="rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground">
                  Bring in unlimited calendars. Arlo resolves duplicate meetings, merges travel buffers, and routes tasks to the best calendar automatically.
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Public booking page</span>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    External
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Link</label>
                  <div className="mt-1 flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                    <Link className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate text-sm text-foreground">{bookingLink}</span>
                    <Button size="sm" variant="outline" className="ml-auto gap-2" onClick={copyLink}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground">
                  Share this link for instant scheduling. Arlo reads your focus blocks and travel time before confirming invites.
                </div>
              </CardContent>
            </Card>

            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Optimized focus plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-4">
                    {scheduledTasks.length ? (
                      scheduledTasks.map(block => {
                        const dueDate = typeof block.meta?.dueDate === "string" ? block.meta?.dueDate : undefined;

                        return (
                          <div key={block.id} className="space-y-2 rounded-xl border bg-muted/20 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium" style={{ color: block.color }}>
                                {block.title}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {dueDate ? `Due ${format(parseISO(dueDate), "MMM d")}` : "Scheduled"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              {minutesToTime(block.startMinutes)} – {minutesToTime(block.endMinutes)}
                            </div>
                            {block.subtitle && <p className="text-xs text-muted-foreground">{block.subtitle}</p>}
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                        No tasks scheduled yet. Connect a task list and let Arlo orchestrate it.
                      </div>
                    )}
                    {unscheduledTasks.length > 0 && (
                      <div className="rounded-xl border border-dashed bg-amber-50 p-4 text-xs text-amber-900">
                        {unscheduledTasks.length} task(s) still need time. Free up space or extend your working hours to place them.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader className="flex flex-col gap-4 border-b bg-background/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{format(visibleRange.start, "MMMM yyyy")}</p>
                    <h2 className="text-2xl font-semibold text-foreground">{view === "month" ? "Month overview" : view === "week" ? "Week agenda" : "Day focus"}</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    AI optimized
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" className="gap-2" onClick={() => setCurrentDate(new Date())}>
                    <CalendarIcon className="h-4 w-4" />
                    Today
                  </Button>
                  <div className="flex items-center rounded-full border bg-background p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                {view === "month" ? (
                  <MonthGrid
                    days={visibleDays}
                    blocks={allBlocks}
                    month={currentDate}
                    onSelectDay={day => {
                      setCurrentDate(day);
                      setView("day");
                    }}
                    onSelectBlock={handleSelectBlock}
                    onCreate={day => openComposerForSlot(format(day, "yyyy-MM-dd"), WORK_START_MINUTES)}
                  />
                ) : (
                  <TimeGrid
                    days={view === "week" ? visibleDays : [currentDate]}
                    blocks={allBlocks}
                    onSelectBlock={handleSelectBlock}
                    onSelectSlot={({ date, startMinutes }) => openComposerForSlot(date, startMinutes)}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border bg-background/60 backdrop-blur">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="text-base">Unified upcoming</CardTitle>
                <Badge variant="outline" className="gap-1 text-xs">
                  <BookMarked className="h-3.5 w-3.5" />
                  Next 7 items
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingItems.length ? (
                  upcomingItems.map(item => (
                    <div key={`${item.source}-${item.id}`} className="flex items-start justify-between gap-3 rounded-xl border bg-muted/20 p-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium" style={{ color: item.color }}>
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(item.date), "EEE, MMM d")} · {minutesToTime(item.startMinutes)}
                        </p>
                        {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {item.source}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-center text-xs text-muted-foreground">
                    Nothing coming up. Your calendar is clear.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <EventComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        draft={draftSlot}
        event={editingEvent}
        onSubmit={handleCreateEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
