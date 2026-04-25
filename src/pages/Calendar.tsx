"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileCalendarView } from "@/components/mobile/views/MobileCalendarView";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Info,
  MapPin,
  Palette,
  Plus,
  RefreshCcw,
  Trash2,
  UserPlus
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { formatSlotLabel } from "@/lib/calendar-data";
import type { BookingSlot, CalendarEvent, EventRecurrence, Task as CalendarTask } from "@/lib/calendar-data";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import type { Task as ProductivityTask } from "@/types/productivity";

import { CalendarTimeline } from "./calendar/components/CalendarTimeline";
import { CalendarMonthGrid } from "./calendar/components/CalendarMonthGrid";
import { CalendarMiniMonth } from "./calendar/components/CalendarMiniMonth";
import { EventDetailsPopover } from "./calendar/components/EventDetailsPopover";
import { COLOR_PRESETS } from "./calendar/constants";
import { useCalendarDatabase } from "./calendar/hooks";
import {
  CalendarBlock,
  CalendarDayBlocks,
  CalendarView,
  DraftKind,
  DraftState,
  SelectedBlockState,
  VIEW_OPTIONS
} from "./calendar/types";
import { buildBlocks, formatTimeRange, getUpcomingEventOccurrences, minutesToTime } from "./calendar/utils";

const initialDraftDate = format(new Date(), "yyyy-MM-dd");

const DEFAULT_DRAFT: DraftState = {
  kind: "event",
  title: "",
  description: "",
  date: initialDraftDate,
  endDate: initialDraftDate,
  startTime: "10:00",
  endTime: "11:00",
  allDay: false,
  location: "",
  color: "#2563eb",
  attendees: "",
  recurrenceFrequency: "none",
  recurrenceInterval: 1,
  recurrenceEnd: {
    type: "never",
    date: initialDraftDate,
    count: "10"
  }
};

const CalendarPage: React.FC = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Mobile view - render early before other hooks that may have side effects
  if (isMobile) {
    return <MobileCalendarView />;
  }
  const [view, setView] = React.useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [events, setEvents, bookings, setBookings, isCalendarLoading, isCalendarAuthenticated] = useCalendarDatabase();
  const { fetchTasks } = useTasksPersistence();
  const [scheduledTasks, setScheduledTasks] = React.useState<CalendarTask[]>([]);
  const [draft, setDraft] = React.useState<DraftState>(DEFAULT_DRAFT);
  const [isDialogOpen, setDialogOpen] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [selectedBlock, setSelectedBlock] = React.useState<SelectedBlockState | null>(null);
  const [editingContext, setEditingContext] = React.useState<{ kind: DraftKind; id: string } | null>(null);

  // Load scheduled tasks
  React.useEffect(() => {
    if (!isCalendarAuthenticated) return;
    
    const loadScheduledTasks = async () => {
      const tasks = await fetchTasks();
      // Filter to only include scheduled tasks that are not done and map to calendar Task type
      const scheduled: CalendarTask[] = tasks
        .filter(t => t.scheduledDate && !t.done)
        .map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          priority: t.priority >= 2 ? 'high' : t.priority === 1 ? 'medium' : 'low' as CalendarTask['priority'],
          category: 'work' as CalendarTask['category'],
          dueDate: t.scheduledDate?.toISOString().split('T')[0],
          completed: t.done,
          estimatedTime: t.timeEstimateMinutes,
        }));
      setScheduledTasks(scheduled);
    };
    
    loadScheduledTasks();
  }, [isCalendarAuthenticated, fetchTasks, events]); // Re-fetch when events change

  const timezone = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );

  const scheduleSummary = React.useMemo(() => {
    try {
      const startTime = draft.allDay ? "00:00" : draft.startTime || "00:00";
      const endTime = draft.allDay ? "23:59" : draft.endTime || "00:00";
      const start = parseISO(`${draft.date}T${startTime}:00`);
      const endDateValue = draft.endDate || draft.date;
      const end = parseISO(`${endDateValue}T${endTime}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return null;
      }

      const sameDay = isSameDay(start, end);
      const baseLabel = sameDay
        ? `${format(start, "EEEE, MMMM d")}`
        : `${format(start, "EEE, MMM d")} – ${format(end, "EEE, MMM d")}`;

      const timeLabel = draft.allDay
        ? "All day"
        : sameDay
          ? `${format(start, "p")} – ${format(end, "p")}`
          : `${format(start, "p")} – ${format(end, "p")}`;

      let summary = `${baseLabel} · ${timeLabel}`;

      if (draft.kind === "event" && draft.recurrenceFrequency !== "none") {
        const interval = Math.max(1, draft.recurrenceInterval || 1);
        const frequencyLabel =
          draft.recurrenceFrequency === "daily"
            ? interval === 1
              ? "daily"
              : `every ${interval} days`
            : draft.recurrenceFrequency === "weekly"
              ? interval === 1
                ? "weekly"
                : `every ${interval} weeks`
              : draft.recurrenceFrequency === "monthly"
                ? interval === 1
                  ? "monthly"
                  : `every ${interval} months`
                : interval === 1
                  ? "yearly"
                  : `every ${interval} years`;

        let endLabel = "";
        if (draft.recurrenceEnd.type === "onDate" && draft.recurrenceEnd.date) {
          const endRuleDate = parseISO(`${draft.recurrenceEnd.date}T00:00:00`);
          if (!Number.isNaN(endRuleDate.getTime())) {
            endLabel = ` until ${format(endRuleDate, "MMM d, yyyy")}`;
          }
        } else if (draft.recurrenceEnd.type === "after" && draft.recurrenceEnd.count) {
          endLabel = ` for ${draft.recurrenceEnd.count} times`;
        }

        summary = `${summary} · Repeats ${frequencyLabel}${endLabel}`;
      }

      return summary;
    } catch (error) {
      return null;
    }
  }, [
    draft.allDay,
    draft.date,
    draft.endDate,
    draft.endTime,
    draft.kind,
    draft.recurrenceEnd.count,
    draft.recurrenceEnd.date,
    draft.recurrenceEnd.type,
    draft.recurrenceFrequency,
    draft.recurrenceInterval,
    draft.startTime
  ]);

  const recurrenceDescription = React.useMemo(() => {
    if (draft.kind !== "event" || draft.recurrenceFrequency === "none") {
      return "Does not repeat.";
    }

    const interval = Math.max(1, draft.recurrenceInterval || 1);
    const baseLabel =
      draft.recurrenceFrequency === "daily"
        ? interval === 1
          ? "Repeats daily"
          : `Repeats every ${interval} days`
        : draft.recurrenceFrequency === "weekly"
          ? interval === 1
            ? "Repeats weekly"
            : `Repeats every ${interval} weeks`
          : draft.recurrenceFrequency === "monthly"
            ? interval === 1
              ? "Repeats monthly"
              : `Repeats every ${interval} months`
            : interval === 1
              ? "Repeats yearly"
              : `Repeats every ${interval} years`;

    let suffix = "";
    if (draft.recurrenceEnd.type === "onDate" && draft.recurrenceEnd.date) {
      const endDate = parseISO(`${draft.recurrenceEnd.date}T00:00:00`);
      if (!Number.isNaN(endDate.getTime())) {
        suffix = ` until ${format(endDate, "MMM d, yyyy")}`;
      }
    } else if (draft.recurrenceEnd.type === "after" && draft.recurrenceEnd.count) {
      suffix = ` for ${draft.recurrenceEnd.count} times`;
    }

    return `${baseLabel}${suffix}`;
  }, [
    draft.kind,
    draft.recurrenceEnd.count,
    draft.recurrenceEnd.date,
    draft.recurrenceEnd.type,
    draft.recurrenceFrequency,
    draft.recurrenceInterval
  ]);

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
      setEditingContext(null);
      const baseDate = overrides?.date ?? format(selectedDate, "yyyy-MM-dd");
      const baseEndDate = overrides?.endDate ?? baseDate;
      setShowAdvanced(false);
      setDraft(prev => ({
        ...DEFAULT_DRAFT,
        date: baseDate,
        endDate: baseEndDate,
        color: prev.color,
        recurrenceEnd: overrides?.recurrenceEnd
          ? { ...DEFAULT_DRAFT.recurrenceEnd, ...overrides.recurrenceEnd }
          : { ...DEFAULT_DRAFT.recurrenceEnd, date: baseEndDate },
        ...overrides
      }));
      setDialogOpen(true);
    },
    [selectedDate]
  );

  const visibleRange = React.useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 });
      return { start, end };
    }

    if (view === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return { start, end };
    }

    return { start: startOfDay(selectedDate), end: startOfDay(selectedDate) };
  }, [selectedDate, view]);

  const days = React.useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end }),
    [visibleRange]
  );

  // Group scheduled tasks by date
  const tasksByDay = React.useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    scheduledTasks.forEach(task => {
      if (task.dueDate) {
        const key = task.dueDate; // Already in yyyy-MM-dd format
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    });
    return map;
  }, [scheduledTasks]);

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
      const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
      return `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`;
    }

    return format(selectedDate, "EEEE, d MMM yyyy");
  }, [selectedDate, view]);

  const activeViewLabel = React.useMemo(
    () => VIEW_OPTIONS.find(option => option.id === view)?.label ?? "",
    [view]
  );

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
    setDraft(prev => {
      const next = { ...prev, [key]: value } as DraftState;

      if (key === "date" && typeof value === "string") {
        if (next.endDate < value) {
          next.endDate = value;
        }
        if (next.recurrenceEnd.date < value) {
          next.recurrenceEnd = { ...next.recurrenceEnd, date: value };
        }
      }

      if (key === "endDate" && typeof value === "string") {
        if (value < next.date) {
          next.endDate = next.date;
        }
        if (next.recurrenceEnd.type === "onDate" && next.recurrenceEnd.date < next.date) {
          next.recurrenceEnd = { ...next.recurrenceEnd, date: next.date };
        }
      }

      if (key === "allDay" && value === true) {
        next.startTime = "00:00";
        next.endTime = "23:59";
      }

      if (key === "kind" && value === "booking") {
        next.recurrenceFrequency = "none";
        next.allDay = false;
        next.endDate = next.date;
        next.recurrenceEnd = {
          ...next.recurrenceEnd,
          type: "never",
          date: next.date,
          count: DEFAULT_DRAFT.recurrenceEnd.count
        };
      }

      if (key === "recurrenceFrequency") {
        if (value === "none") {
          next.recurrenceEnd = {
            ...next.recurrenceEnd,
            type: "never",
            date: next.endDate,
            count: DEFAULT_DRAFT.recurrenceEnd.count
          };
        } else if (next.recurrenceEnd.type === "onDate" && next.recurrenceEnd.date < next.date) {
          next.recurrenceEnd = { ...next.recurrenceEnd, date: next.endDate };
        }
      }

      return next;
    });
  };

  const handleRecurrenceEndChange = (patch: Partial<DraftState["recurrenceEnd"]>) => {
    setDraft(prev => ({
      ...prev,
      recurrenceEnd: { ...prev.recurrenceEnd, ...patch }
    }));
  };

  const resetDraft = React.useCallback(() => {
    const dateValue = format(selectedDate, "yyyy-MM-dd");
    setDraft(prev => ({
      ...DEFAULT_DRAFT,
      date: dateValue,
      endDate: dateValue,
      color: prev.color,
      recurrenceEnd: {
        ...DEFAULT_DRAFT.recurrenceEnd,
        date: dateValue
      }
    }));
  }, [selectedDate]);

  const handleCreate = () => {
    if (!draft.title.trim()) {
      toast({ title: "Add a title", description: "Events need a title before they can be saved." });
      return;
    }

    if (draft.kind === "event") {
      if (!draft.allDay && (!draft.startTime || !draft.endTime)) {
        toast({ title: "Add a time", description: "Please select a start and end time." });
        return;
      }

      const startTime = draft.allDay ? "00:00" : draft.startTime || "00:00";
      const endTime = draft.allDay ? "23:59" : draft.endTime || "00:00";
      const startDate = draft.date;
      const endDate = draft.endDate && draft.endDate >= draft.date ? draft.endDate : draft.date;
      const start = parseISO(`${startDate}T${startTime}:00`);
      const end = parseISO(`${endDate}T${endTime}:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        toast({ title: "Invalid time", description: "Please provide a valid start and end time." });
        return;
      }

      if (isAfter(start, end)) {
        toast({ title: "Check the timing", description: "The event end must be after it starts." });
        return;
      }

      const attendees = draft.attendees
        .split(",")
        .map(entry => entry.trim())
        .filter(Boolean);

      const recurrence: EventRecurrence | undefined = draft.recurrenceFrequency === "none"
        ? undefined
        : {
            frequency: draft.recurrenceFrequency,
            interval: Math.max(1, draft.recurrenceInterval || 1),
            end:
              draft.recurrenceEnd.type === "onDate" && draft.recurrenceEnd.date
                ? { type: "onDate" as const, date: draft.recurrenceEnd.date }
                : draft.recurrenceEnd.type === "after" && Number(draft.recurrenceEnd.count) > 0
                  ? { type: "after" as const, count: Number(draft.recurrenceEnd.count) }
                  : draft.recurrenceEnd.type === "never"
                    ? { type: "never" as const }
                    : undefined
          };

      if (editingContext?.kind === "event") {
        const existing = events.find(event => event.id === editingContext.id);
        setEvents(prev =>
          prev.map(event =>
            event.id === editingContext.id
              ? {
                  ...event,
                  title: draft.title,
                  description: draft.description || undefined,
                  date: startDate,
                  endDate,
                  startTime,
                  endTime,
                  location: draft.location || undefined,
                  attendees,
                  color: draft.color,
                  allDay: draft.allDay,
                  recurrence,
                  // preserve recurrence when undefined to clear it
                  ...(recurrence ? {} : { recurrence: undefined })
                }
              : event
          )
        );
        toast({ title: "Event updated", description: `${draft.title} was updated in your calendar.` });
        if (!existing) {
          console.warn("Attempted to update missing event", editingContext.id);
        }
      } else {
        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}`,
          title: draft.title,
          description: draft.description || undefined,
          date: startDate,
          endDate,
          startTime,
          endTime,
          location: draft.location || undefined,
          attendees,
          color: draft.color,
          category: "custom",
          allDay: draft.allDay,
          recurrence
        };
        setEvents(prev => [...prev, newEvent]);
        toast({ title: "Event added", description: `${draft.title} was added to your calendar.` });
      }
    } else {
      if (editingContext?.kind === "booking") {
        const existing = bookings.find(slot => slot.id === editingContext.id);
        setBookings(prev =>
          prev.map(slot =>
            slot.id === editingContext.id
              ? {
                  ...slot,
                  title: draft.title || slot.title,
                  date: draft.date,
                  startTime: draft.startTime,
                  endTime: draft.endTime,
                  description: draft.description || undefined
                }
              : slot
          )
        );
        const slotLabel = draft.title || (existing ? formatSlotLabel(existing) : "Booking slot");
        toast({ title: "Slot updated", description: `${slotLabel} has been updated.` });
        if (!existing) {
          console.warn("Attempted to update missing booking slot", editingContext.id);
        }
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
    }

    setDialogOpen(false);
    setEditingContext(null);
    resetDraft();
  };

  const handleDelete = React.useCallback(() => {
    if (!editingContext) {
      return;
    }

    if (editingContext.kind === "event") {
      let removedTitle: string | undefined;
      setEvents(prev =>
        prev.filter(event => {
          if (event.id === editingContext.id) {
            removedTitle = event.title;
            return false;
          }
          return true;
        })
      );

      if (removedTitle) {
        toast({ title: "Event deleted", description: `${removedTitle} was removed from your calendar.` });
      } else {
        toast({ title: "Event not found", description: "The selected event could not be found." });
      }
    } else {
      let removedTitle: string | undefined;
      setBookings(prev =>
        prev.filter(slot => {
          if (slot.id === editingContext.id) {
            removedTitle = slot.title || formatSlotLabel(slot);
            return false;
          }
          return true;
        })
      );

      if (removedTitle) {
        toast({ title: "Slot removed", description: `${removedTitle} was removed.` });
      } else {
        toast({ title: "Booking not found", description: "The selected booking slot could not be found." });
      }
    }

    setDialogOpen(false);
    setEditingContext(null);
    resetDraft();
  }, [editingContext, resetDraft, setBookings, setEvents, toast]);

  const miniMonthDays = React.useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 })
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
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    return Array.from({ length: 7 }).map((_, index) => format(addDays(start, index), "EE"));
  }, []);

  const upcomingItems = React.useMemo(() => {
    const now = new Date();
    const items: { id: string; title: string; subtitle?: string; start: Date; color: string; allDay?: boolean }[] = [];

    getUpcomingEventOccurrences(events, now, 6).forEach(({ event, start }) => {
      items.push({
        id: `${event.id}-${start.toISOString()}`,
        title: event.title,
        subtitle: event.location || event.category,
        start,
        color: event.color || "#2563eb",
        allDay: Boolean(event.allDay)
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
        endDate: format(day, "yyyy-MM-dd"),
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
        allDay: false
      });
    },
    [openCreateDialog]
  );

  const handleBlockSelect = React.useCallback((block: CalendarBlock, target: HTMLElement) => {
    setSelectedBlock({ block, target });
  }, []);

  const handleEditBlock = React.useCallback(
    (block: CalendarBlock) => {
      if (block.source === "task") {
        setSelectedBlock(null);
        return;
      }

      if (block.source === "event") {
        const event = events.find(item => item.id === block.id);
        if (!event) return;
        setEditingContext({ kind: "event", id: block.id });
        const endDate = event.endDate ?? event.date;
        const recurrence = event.recurrence;
        const nextRecurrenceEnd: DraftState["recurrenceEnd"] = recurrence?.end
          ? recurrence.end.type === "onDate"
            ? { type: "onDate", date: recurrence.end.date, count: DEFAULT_DRAFT.recurrenceEnd.count }
            : recurrence.end.type === "after"
              ? {
                  type: "after",
                  date: endDate,
                  count: String(recurrence.end.count ?? "")
                }
              : { type: "never", date: endDate, count: DEFAULT_DRAFT.recurrenceEnd.count }
          : { ...DEFAULT_DRAFT.recurrenceEnd, date: endDate };

        setDraft(prev => ({
          ...DEFAULT_DRAFT,
          kind: "event",
          title: event.title,
          description: event.description ?? "",
          date: event.date,
          endDate,
          startTime: event.startTime,
          endTime: event.endTime,
          allDay: Boolean(event.allDay),
          location: event.location ?? "",
          color: event.color ?? prev.color,
          attendees: event.attendees?.join(", ") ?? "",
          recurrenceFrequency: recurrence?.frequency ?? "none",
          recurrenceInterval: recurrence?.interval ?? 1,
          recurrenceEnd: nextRecurrenceEnd
        }));
        setShowAdvanced(
          Boolean(
            event.description ||
              event.location ||
              (event.attendees && event.attendees.length > 0) ||
              event.recurrence
          )
        );
      } else if (block.source === "booking") {
        const slot = bookings.find(item => item.id === block.id);
        if (!slot) return;
        const slotDescription = (slot as BookingSlot & { description?: string }).description ?? "";
        setEditingContext({ kind: "booking", id: block.id });
        setDraft(prev => ({
          ...DEFAULT_DRAFT,
          kind: "booking",
          title: slot.title ?? "",
          description: slotDescription,
          date: slot.date,
          endDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          allDay: false,
          location: "",
          color: block.color ?? prev.color,
          attendees: "",
          recurrenceFrequency: "none",
          recurrenceInterval: 1,
          recurrenceEnd: { ...DEFAULT_DRAFT.recurrenceEnd, type: "never", date: slot.date }
        }));
        setShowAdvanced(Boolean(slotDescription));
      }

      setDialogOpen(true);
      setSelectedBlock(null);
    },
    [bookings, events]
  );

  const handleBlockMove = React.useCallback(
    (block: CalendarBlock, day: Date, startMinutes: number, endMinutes: number) => {
      const dateString = format(day, "yyyy-MM-dd");
      const startTime = minutesToTime(startMinutes);
      const endTime = minutesToTime(endMinutes);
      const whenLabel = `${format(day, "EEE, MMM d")} · ${block.allDay ? "All day" : formatTimeRange(startMinutes, endMinutes)}`;

      if (block.source === "event") {
        const event = events.find(item => item.id === block.id);
        if (!event) {
          setSelectedBlock(null);
          return;
        }

        if (event.recurrence) {
          toast({
            title: "Recurring events",
            description: "Drag to reschedule is not yet supported for repeating events."
          });
          setSelectedBlock(null);
          return;
        }

        const originalStart = parseISO(`${event.date}T00:00:00`);
        const newStart = startOfDay(day);
        const dayShift = differenceInCalendarDays(newStart, originalStart);
        const endDate = event.endDate ?? event.date;
        const newEndDate = format(addDays(parseISO(`${endDate}T00:00:00`), dayShift), "yyyy-MM-dd");

        setEvents(prev =>
          prev.map(item =>
            item.id === block.id
              ? {
                  ...item,
                  date: dateString,
                  endDate: newEndDate,
                  startTime: item.allDay ? "00:00" : startTime,
                  endTime: item.allDay ? "23:59" : endTime
                }
              : item
          )
        );
        toast({ title: "Event rescheduled", description: `${block.title} moved to ${whenLabel}.` });
      } else if (block.source === "booking") {
        setBookings(prev =>
          prev.map(slot =>
            slot.id === block.id
              ? { ...slot, date: dateString, startTime, endTime }
              : slot
          )
        );
        toast({ title: "Slot updated", description: `${block.title} now occurs ${whenLabel}.` });
      }

      setSelectedBlock(null);
    },
    [events, setBookings, setEvents, toast]
  );

  return (
    <div className="flex h-full w-full flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          {/* Left: Navigation controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border bg-background px-1 py-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => handleNavigate("prev")}
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full"
                onClick={() => handleNavigate("next")}
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8" onClick={() => handleNavigate("today")}>
              Today
            </Button>
            <span className="hidden sm:block text-lg font-semibold text-foreground">{rangeLabel}</span>
          </div>

          {/* Right: View selector and Create button */}
          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={value => value && setView(value as CalendarView)}>
              <SelectTrigger className="h-8 w-[100px] text-sm">
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
            <Button onClick={() => openCreateDialog()} size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </Button>
          </div>
        </div>
        {/* Mobile range label */}
        <div className="sm:hidden px-4 pb-2">
          <span className="text-base font-semibold text-foreground">{rangeLabel}</span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-2 pb-2 pt-2 sm:px-3 lg:px-4">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[220px,minmax(0,1fr)] 2xl:grid-cols-[220px,minmax(0,1fr),260px]">
          <aside className="hidden min-h-0 flex-col gap-4 lg:flex">
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

          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm">
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
                  onBlockMove={handleBlockMove}
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
                        <p className="mt-1 text-muted-foreground">
                          {item.allDay
                            ? `${format(item.start, "EEE, MMM d")} · All day`
                            : format(item.start, "EEE, MMM d · p")}
                        </p>
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
            setEditingContext(null);
            setShowAdvanced(false);
          }
        }}
      >
        <DialogContent className="flex w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background p-0 shadow-xl sm:max-w-[520px]">
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="space-y-6 px-6 py-5">
              <div className="space-y-3">
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
              <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm shadow-black/5">
                <div className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border/60">
                  <CalendarClock className="mt-1 h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Schedule</p>
                        {scheduleSummary && (
                          <p className="text-xs text-muted-foreground">{scheduleSummary}</p>
                        )}
                      </div>
                      {draft.kind === "event" && (
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <Switch
                            checked={draft.allDay}
                            onCheckedChange={checked => handleDraftChange("allDay", checked)}
                          />
                          <span>All day</span>
                        </div>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Start date
                          </Label>
                          <Input
                            type="date"
                            value={draft.date}
                            onChange={event => handleDraftChange("date", event.target.value)}
                            className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                          />
                        </div>
                        {!draft.allDay && (
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Start time
                            </Label>
                            <Input
                              type="time"
                              value={draft.startTime}
                              onChange={event => handleDraftChange("startTime", event.target.value)}
                              className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            End date
                          </Label>
                          <Input
                            type="date"
                            value={draft.endDate}
                            onChange={event => handleDraftChange("endDate", event.target.value)}
                            disabled={draft.kind === "booking"}
                            className={cn(
                              "h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20",
                              draft.kind === "booking" && "cursor-not-allowed opacity-70"
                            )}
                          />
                        </div>
                        {!draft.allDay && (
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              End time
                            </Label>
                            <Input
                              type="time"
                              value={draft.endTime}
                              onChange={event => handleDraftChange("endTime", event.target.value)}
                              className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Time zone · {timezone}</p>
                  </div>
                </div>
                {draft.kind === "event" && (
                  <div className="flex items-start gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-border/60">
                    <RefreshCcw className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">Recurrence</p>
                        <p className="text-xs text-muted-foreground">{recurrenceDescription}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Frequency
                          </Label>
                          <Select
                            value={draft.recurrenceFrequency}
                            onValueChange={value =>
                              handleDraftChange("recurrenceFrequency", value as DraftState["recurrenceFrequency"])
                            }
                          >
                            <SelectTrigger className="h-9 justify-between text-sm">
                              <SelectValue placeholder="Does not repeat" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Does not repeat</SelectItem>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {draft.recurrenceFrequency !== "none" && (
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Repeat every
                            </Label>
                            <Input
                              type="number"
                              min={1}
                              value={draft.recurrenceInterval}
                              onChange={event =>
                                handleDraftChange(
                                  "recurrenceInterval",
                                  Math.max(1, Number(event.target.value) || 1)
                                )
                              }
                              className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                            />
                          </div>
                        )}
                      </div>
                      {draft.recurrenceFrequency !== "none" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Ends
                            </Label>
                            <Select
                              value={draft.recurrenceEnd.type}
                              onValueChange={value => {
                                if (value === "never") {
                                  handleRecurrenceEndChange({
                                    type: "never",
                                    date: draft.endDate,
                                    count: DEFAULT_DRAFT.recurrenceEnd.count
                                  });
                                } else if (value === "onDate") {
                                  handleRecurrenceEndChange({
                                    type: "onDate",
                                    date: draft.endDate,
                                    count: DEFAULT_DRAFT.recurrenceEnd.count
                                  });
                                } else {
                                  handleRecurrenceEndChange({ type: "after", count: draft.recurrenceEnd.count || "10" });
                                }
                              }}
                            >
                              <SelectTrigger className="h-9 justify-between text-sm">
                                <SelectValue placeholder="Never" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="never">Never</SelectItem>
                                <SelectItem value="onDate">On date</SelectItem>
                                <SelectItem value="after">After</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {draft.recurrenceEnd.type === "onDate" && (
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                End date
                              </Label>
                              <Input
                                type="date"
                                value={draft.recurrenceEnd.date}
                                min={draft.date}
                                onChange={event => handleRecurrenceEndChange({ date: event.target.value })}
                                className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                              />
                            </div>
                          )}
                          {draft.recurrenceEnd.type === "after" && (
                            <div className="space-y-1">
                              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Occurrences
                              </Label>
                              <Input
                                type="number"
                                min={1}
                                value={draft.recurrenceEnd.count}
                                onChange={event => handleRecurrenceEndChange({ count: event.target.value })}
                                className="h-9 border border-transparent bg-muted/50 px-3 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-primary transition hover:text-primary"
                    >
                      <span>{showAdvanced ? "Hide advanced options" : "More options"}</span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-3">
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
                          <LocationAutocomplete
                            value={draft.location}
                            onChange={value => handleDraftChange("location", value)}
                            placeholder="Add location"
                            className="h-9 border border-transparent bg-muted/50 text-sm shadow-none focus-visible:border-ring/80 focus-visible:ring-2 focus-visible:ring-ring/20"
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
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex flex-col gap-2 border-t border-border/60 bg-muted/40 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            {editingContext && (
              <Button
                variant="destructive"
                type="button"
                onClick={handleDelete}
                className="w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            )}
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
          onEdit={handleEditBlock}
        />
      )}
    </div>
  );
};

export default CalendarPage;
