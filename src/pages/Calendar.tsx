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
  Info,
  Link as LinkIcon,
  MapPin,
  Palette,
  Plus,
  UserPlus,
  FileText
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
const MINUTE_STEP = 30;
const STEPS_PER_HOUR = 60 / MINUTE_STEP;
const DEFAULT_SELECTION_DURATION = 60;
const COLOR_PRESETS = ["#2563eb", "#7c3aed", "#22c55e", "#f97316", "#ec4899", "#14b8a6"] as const;

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
  const totalMinutes = (px / HOUR_HEIGHT) * 60;
  const snapped = Math.round(totalMinutes / MINUTE_STEP) * MINUTE_STEP;
  return DISPLAY_START_MINUTES + snapped;
}

function clampMinutes(value: number) {
  return Math.min(Math.max(value, DISPLAY_START_MINUTES), DISPLAY_END_MINUTES);
}

function clampToDayRange(start: number, end: number) {
  return {
    start: Math.max(DISPLAY_START_MINUTES, Math.min(start, DISPLAY_END_MINUTES)),
    end: Math.max(DISPLAY_START_MINUTES, Math.min(end, DISPLAY_END_MINUTES))
  };
}

function computeBlockLayout(blocks: CalendarBlock[]) {
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinutes === b.startMinutes) {
      return a.endMinutes - b.endMinutes;
    }
    return a.startMinutes - b.startMinutes;
  });

  type LayoutGroup = {
    blocks: CalendarBlock[];
    windowEnd: number;
  };

  const groups: LayoutGroup[] = [];
  let currentGroup: LayoutGroup | null = null;

  sorted.forEach(block => {
    if (!currentGroup || block.startMinutes >= currentGroup.windowEnd) {
      currentGroup = { blocks: [], windowEnd: block.endMinutes };
      groups.push(currentGroup);
    } else {
      currentGroup.windowEnd = Math.max(currentGroup.windowEnd, block.endMinutes);
    }
    currentGroup.blocks.push(block);
  });

  const layout = new Map<string, { lane: number; columns: number }>();

  groups.forEach(group => {
    const laneEnds: number[] = [];
    let maxLanes = 1;
    const assignments: { id: string; lane: number }[] = [];

    [...group.blocks]
      .sort((a, b) => {
        if (a.startMinutes === b.startMinutes) {
          return a.endMinutes - b.endMinutes;
        }
        return a.startMinutes - b.startMinutes;
      })
      .forEach(block => {
        let laneIndex = laneEnds.findIndex(end => block.startMinutes >= end);
        if (laneIndex === -1) {
          laneIndex = laneEnds.length;
          laneEnds.push(block.endMinutes);
        } else {
          laneEnds[laneIndex] = block.endMinutes;
        }

        maxLanes = Math.max(maxLanes, laneEnds.length);
        assignments.push({ id: block.id, lane: laneIndex });
      });

    assignments.forEach(({ id, lane }) => {
      layout.set(id, { lane, columns: maxLanes });
    });
  });

  return layout;
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

function formatTimeRange(startMinutes: number, endMinutes: number) {
  return `${minutesToTime(startMinutes)} – ${minutesToTime(endMinutes)}`;
}

function hexToRgb(color: string) {
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map(char => char + char)
      .join("");
  }

  if (hex.length !== 6) {
    return null;
  }

  const bigint = Number.parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return { r, g, b };
}

function getContrastTextColor(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) {
    return "#0f172a";
  }

  const srgb = [rgb.r, rgb.g, rgb.b].map(value => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  const luminance = 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  return luminance > 0.55 ? "#0f172a" : "#ffffff";
}

function formatDisplayTime(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return format(date, "h:mm a").toLowerCase();
}

function formatDisplayTimeRange(startMinutes: number, endMinutes: number) {
  const start = formatDisplayTime(startMinutes).split(" ");
  const end = formatDisplayTime(endMinutes).split(" ");

  if (start[1] && end[1] && start[1] === end[1]) {
    return `${start[0]} – ${end[0]}${end[1]}`;
  }

  return `${start.join("")} – ${end.join("")}`;
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
  const [selectedBlock, setSelectedBlock] = React.useState<CalendarBlock | null>(null);
  const [dragSelection, setDragSelection] = React.useState<{
    day: Date;
    dayKey: string;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
  const dragStateRef = React.useRef<{
    day: Date;
    dayKey: string;
    anchorMinutes: number;
    startMinutes: number;
    endMinutes: number;
  } | null>(null);
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
    <div className="relative h-full min-h-[640px] overflow-x-auto overflow-y-auto">
      <div className="flex min-h-full">
        <div className="sticky left-0 z-10 flex w-16 flex-col border-r bg-card text-right text-[11px] text-muted-foreground">
          {Array.from({ length: (HOURS_PER_DAY / 60) + 1 }).map((_, index) => {
            const minutes = DISPLAY_START_MINUTES + index * 60;
            return (
              <div key={minutes} className="h-[52px] px-2 pt-2">
                {minutes % 120 === 0 ? minutesToTime(minutes) : ""}
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            "grid flex-1",
            view === "week" ? "min-w-[960px] grid-cols-7" : "min-w-[360px] grid-cols-1"
          )}
        >
          {focusBlocks.map(({ day, blocks }) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const layout = computeBlockLayout(blocks);
            const selectionForDay = dragSelection && dragSelection.dayKey === dayKey ? dragSelection : null;

            const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
              if ((event.target as HTMLElement).closest("[data-calendar-block]")) {
                return;
              }
              if (event.button !== 0) return;

              const rect = event.currentTarget.getBoundingClientRect();
              const offsetY = event.clientY - rect.top;
              const rawMinutes = clampMinutes(pxToMinutes(offsetY));
              const anchor = clampMinutes(Math.min(rawMinutes, DISPLAY_END_MINUTES - MINUTE_STEP));
              const startMinutes = anchor;
              const endMinutes = clampMinutes(anchor + DEFAULT_SELECTION_DURATION);
              const selection = { day, dayKey, startMinutes, endMinutes };

              dragStateRef.current = { ...selection, anchorMinutes: anchor };
              setDragSelection(selection);
              event.currentTarget.setPointerCapture(event.pointerId);
            };

            const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!dragStateRef.current || dragStateRef.current.dayKey !== dayKey) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const offsetY = event.clientY - rect.top;
              const rawMinutes = clampMinutes(pxToMinutes(offsetY));
              const anchor = dragStateRef.current.anchorMinutes;

              let startMinutes = Math.min(anchor, rawMinutes);
              let endMinutes = Math.max(anchor, rawMinutes);

              if (endMinutes - startMinutes < MINUTE_STEP) {
                if (rawMinutes >= anchor) {
                  endMinutes = clampMinutes(anchor + MINUTE_STEP);
                } else {
                  startMinutes = clampMinutes(anchor - MINUTE_STEP);
                }
              }

              const nextSelection = { day, dayKey, startMinutes, endMinutes };
              dragStateRef.current = { ...nextSelection, anchorMinutes: anchor };
              setDragSelection(nextSelection);
            };

            const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
              if (!dragStateRef.current || dragStateRef.current.dayKey !== dayKey) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              const selection = dragStateRef.current;
              dragStateRef.current = null;
              setDragSelection(null);
              openCreateDialog({
                kind: "event",
                date: dayKey,
                startTime: minutesToTime(selection.startMinutes),
                endTime: minutesToTime(selection.endMinutes)
              });
            };

            const handlePointerCancel = () => {
              dragStateRef.current = null;
              setDragSelection(null);
            };

            return (
              <div key={day.toISOString()} className="relative border-r last:border-r-0">
                <div className="sticky top-0 z-10 flex h-20 flex-col justify-center border-b bg-card/95 px-4 py-3 backdrop-blur">
                  <div className="flex items-center justify-start">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{format(day, "EEE")}</p>
                      <p className={cn("text-xl font-semibold", isToday(day) && "text-primary")}>{format(day, "d MMM")}</p>
                    </div>
                  </div>
                </div>
                <div
                  className="relative cursor-crosshair"
                  style={{ height: `${(HOURS_PER_DAY / 60) * HOUR_HEIGHT}px` }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerCancel}
                >
                  <div className="absolute inset-0">
                    {Array.from({ length: HOURS_PER_DAY / MINUTE_STEP + 1 }).map((_, index) => {
                      const top = (index * MINUTE_STEP * HOUR_HEIGHT) / 60;
                      const isHourMark = index % STEPS_PER_HOUR === 0;
                      return (
                        <div
                          key={index}
                          className={cn(
                            "absolute left-0 right-0 border-border/60",
                            isHourMark ? "border-t" : "border-t border-dashed opacity-60"
                          )}
                          style={{ top: `${top}px` }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute inset-x-3 inset-y-0 pb-6">
                    {selectionForDay && (() => {
                      const top = minutesToPx(selectionForDay.startMinutes);
                      const height = Math.max(32, minutesToPx(selectionForDay.endMinutes) - top);
                      return (
                        <div
                          className="pointer-events-none absolute left-1 right-1 rounded-lg border border-primary/60 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary shadow-sm"
                          style={{ top, height }}
                        >
                          {formatTimeRange(selectionForDay.startMinutes, selectionForDay.endMinutes)}
                        </div>
                      );
                    })()}
                    {blocks.map(block => {
                      const layoutInfo = layout.get(block.id);
                      const top = minutesToPx(block.startMinutes);
                      const height = Math.max(36, minutesToPx(block.endMinutes) - top);
                      const widthPercent = layoutInfo ? 100 / layoutInfo.columns : 100;
                      const leftPercent = layoutInfo ? layoutInfo.lane * widthPercent : 0;
                      const isTask = block.source === "task";
                      const rgb = hexToRgb(block.color);
                      const baseTextColor = isTask ? "#0f172a" : getContrastTextColor(block.color);
                      const subtleTextColor = isTask
                        ? "rgba(15, 23, 42, 0.65)"
                        : baseTextColor === "#ffffff"
                          ? "rgba(255, 255, 255, 0.8)"
                          : "rgba(15, 23, 42, 0.7)";
                      const backgroundColor = isTask && rgb
                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`
                        : block.color;
                      const borderColor = isTask && rgb
                        ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`
                        : "transparent";
                      const timeLabel = block.allDay ? "All day" : formatDisplayTimeRange(block.startMinutes, block.endMinutes);

                      return (
                        <button
                          key={block.id}
                          type="button"
                          data-calendar-block
                          onPointerDown={event => event.stopPropagation()}
                          onClick={() => setSelectedBlock(block)}
                          title={`${block.title} · ${formatTimeRange(block.startMinutes, block.endMinutes)}`}
                          className={cn(
                            "absolute flex h-full flex-col justify-between overflow-hidden rounded-2xl p-3 text-left text-sm shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            isTask && "border border-dashed"
                          )}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPercent}% + 0.25rem)`,
                            width: `calc(${widthPercent}% - 0.5rem)`,
                            backgroundColor,
                            color: baseTextColor,
                            borderColor,
                            boxShadow: isTask
                              ? "0 10px 20px -15px rgba(15, 23, 42, 0.5)"
                              : "0 18px 40px -24px rgba(15, 23, 42, 0.65)"
                          }}
                        >
                          <div className="flex flex-col gap-1 overflow-hidden">
                            <p className="truncate text-sm font-semibold leading-snug">{block.title}</p>
                            <p className="text-xs font-medium" style={{ color: subtleTextColor }}>
                              {timeLabel}
                            </p>
                            {block.subtitle && (
                              <p className="truncate text-xs" style={{ color: subtleTextColor }}>
                                {block.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMiniMonth = () => (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2">
          <Select value={String(selectedDate.getMonth())} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-[140px] justify-between text-left">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedDate.getFullYear())} onValueChange={handleYearSelect}>
            <SelectTrigger className="w-[110px] justify-between text-left">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

            {renderMiniMonth()}
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
              {view === "month" ? renderMonthGrid() : renderTimeline()}
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
        <DialogContent className="sm:max-w-[520px] overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-xl">
          <div className="flex max-h-[calc(100vh-3rem)] flex-col">
            <ScrollArea className="flex-1">
              <div className="space-y-5 px-6 py-5">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Create new item
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground">
                    Publish an event or open a public booking slot.
                  </DialogDescription>
                </DialogHeader>
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
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedBlock)} onOpenChange={open => !open && setSelectedBlock(null)}>
        <DialogContent className="max-w-md">
          {selectedBlock && (() => {
            const blockTypeLabels: Record<CalendarBlock["source"], string> = {
              event: "Event",
              booking: "Booking",
              task: "Task"
            };
            const blockLabel = blockTypeLabels[selectedBlock.source];
            const attendees =
              selectedBlock.source === "event" && Array.isArray(selectedBlock.meta?.attendees)
                ? (selectedBlock.meta.attendees as string[])
                : [];
            const slot = selectedBlock.source === "booking" ? (selectedBlock.meta as BookingSlot | undefined) : undefined;

            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedBlock.title}</DialogTitle>
                  <DialogDescription>
                    {`${format(parseISO(`${selectedBlock.date}T00:00:00`), "EEEE, MMM d yyyy")} · ${formatTimeRange(selectedBlock.startMinutes, selectedBlock.endMinutes)}`}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge variant="outline">{blockLabel}</Badge>
                    {selectedBlock.subtitle && <span className="text-muted-foreground">{selectedBlock.subtitle}</span>}
                  </div>
                  {selectedBlock.source === "event" && selectedBlock.meta?.description && (
                    <p className="text-muted-foreground">{String(selectedBlock.meta.description)}</p>
                  )}
                  {selectedBlock.source === "event" && attendees.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendees</p>
                      <p className="mt-1 text-foreground">{attendees.join(", ")}</p>
                    </div>
                  )}
                  {slot && (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Booking details</p>
                      <p className="text-foreground">
                        {slot.available ? "Open for booking" : slot.bookedBy ? `Booked by ${slot.bookedBy}` : "Unavailable"}
                      </p>
                      {slot.description && <p className="text-muted-foreground">{slot.description}</p>}
                    </div>
                  )}
                  {selectedBlock.source === "task" && (
                    <p className="text-muted-foreground">Focus session scheduled to keep the day on track.</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setSelectedBlock(null)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
