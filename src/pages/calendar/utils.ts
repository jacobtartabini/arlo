import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  differenceInCalendarYears,
  differenceInMinutes,
  endOfDay,
  format,
  parseISO,
  startOfDay
} from "date-fns";

import type { BookingSlot, CalendarEvent, Task } from "@/lib/calendar-data";
import { formatSlotLabel } from "@/lib/calendar-data";

import {
  DISPLAY_END_MINUTES,
  DISPLAY_START_MINUTES,
  HOUR_HEIGHT,
  MINUTE_STEP,
  WORK_END_MINUTES,
  WORK_START_MINUTES
} from "./constants";
import type { CalendarBlock } from "./types";

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

type BusyInterval = { start: number; end: number };

type LayoutGroup = {
  blocks: CalendarBlock[];
  windowEnd: number;
};

type BlockLayout = Map<string, { lane: number; columns: number }>;

const MIN_EVENT_DURATION_MINUTES = 30;
const UPCOMING_LOOKAHEAD_MONTHS = 6;

type EventOccurrence = {
  occurrenceStart: Date;
  occurrenceEnd: Date;
  occurrenceIndex: number;
};

function getEventDateRange(event: CalendarEvent) {
  const startDate = event.date;
  const endDate = event.endDate ?? event.date;
  const start = event.allDay
    ? startOfDay(parseISO(`${startDate}T00:00:00`))
    : parseISO(`${startDate}T${(event.startTime || "09:00")}:00`);
  let end = event.allDay
    ? endOfDay(parseISO(`${endDate}T00:00:00`))
    : parseISO(`${endDate}T${(event.endTime || event.startTime || "09:00")}:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (end <= start) {
    end = addMinutes(start, MIN_EVENT_DURATION_MINUTES);
  }

  return { start, end };
}

function computeOccurrenceStart(
  baseStart: Date,
  frequency: "daily" | "weekly" | "monthly" | "yearly",
  interval: number,
  step: number
) {
  switch (frequency) {
    case "weekly":
      return addWeeks(baseStart, step * interval);
    case "monthly":
      return addMonths(baseStart, step * interval);
    case "yearly":
      return addYears(baseStart, step * interval);
    case "daily":
    default:
      return addDays(baseStart, step * interval);
  }
}

function resolveEventOccurrenceForDay(event: CalendarEvent, day: Date): EventOccurrence | null {
  const range = getEventDateRange(event);
  if (!range) return null;

  const { start: baseStart, end: baseEnd } = range;
  const durationMs = baseEnd.getTime() - baseStart.getTime();
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  const recurrence = event.recurrence;

  if (!recurrence) {
    if (baseEnd < dayStart || baseStart > dayEnd) {
      return null;
    }
    return { occurrenceStart: baseStart, occurrenceEnd: baseEnd, occurrenceIndex: 0 };
  }

  if (dayEnd < baseStart) {
    return null;
  }

  const startDay = startOfDay(baseStart);
  const interval = Math.max(1, recurrence.interval ?? 1);

  const frequency = recurrence.frequency;

  const diffDays = differenceInCalendarDays(dayStart, startDay);
  if (diffDays < 0) {
    return null;
  }

  let stepCandidate = 0;

  if (frequency === "daily") {
    stepCandidate = Math.floor(diffDays / interval);
  } else if (frequency === "weekly") {
    const diffWeeks = differenceInCalendarWeeks(dayStart, startDay, { weekStartsOn: 0 });
    if (diffWeeks < 0) return null;
    stepCandidate = Math.floor(diffWeeks / interval);
  } else if (frequency === "monthly") {
    const diffMonths = differenceInCalendarMonths(dayStart, startDay);
    if (diffMonths < 0) return null;
    stepCandidate = Math.floor(diffMonths / interval);
  } else if (frequency === "yearly") {
    const diffYears = differenceInCalendarYears(dayStart, startDay);
    if (diffYears < 0) return null;
    stepCandidate = Math.floor(diffYears / interval);
  }

  const computeStart = (step: number) => computeOccurrenceStart(baseStart, frequency, interval, step);

  let occurrenceIndex = stepCandidate;
  let occurrenceStart = computeStart(occurrenceIndex);

  if (occurrenceStart > dayEnd && occurrenceIndex > 0) {
    occurrenceIndex -= 1;
    occurrenceStart = computeStart(occurrenceIndex);
  }

  if (occurrenceIndex > 0 && occurrenceStart > dayStart) {
    const previousStart = computeStart(occurrenceIndex - 1);
    const previousEnd = new Date(previousStart.getTime() + durationMs);
    if (previousEnd > dayStart) {
      occurrenceIndex -= 1;
      occurrenceStart = previousStart;
    }
  }

  const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);

  if (recurrence.end) {
    if (recurrence.end.type === "after") {
      const maxCount = recurrence.end.count ?? 0;
      if (occurrenceIndex >= maxCount) {
        return null;
      }
    } else if (recurrence.end.type === "onDate") {
      const until = endOfDay(parseISO(`${recurrence.end.date}T00:00:00`));
      if (occurrenceStart > until) {
        return null;
      }
    }
  }

  if (occurrenceEnd < dayStart || occurrenceStart > dayEnd) {
    return null;
  }

  return { occurrenceStart, occurrenceEnd, occurrenceIndex };
}

function clampSegmentToDay(occurrenceStart: Date, occurrenceEnd: Date, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const segmentStart = occurrenceStart > dayStart ? occurrenceStart : dayStart;
  const segmentEnd = occurrenceEnd < dayEnd ? occurrenceEnd : dayEnd;
  return { segmentStart, segmentEnd };
}

export function minutesToPx(minutes: number) {
  return ((minutes - DISPLAY_START_MINUTES) / 60) * HOUR_HEIGHT;
}

export function pxToMinutes(px: number) {
  const totalMinutes = (px / HOUR_HEIGHT) * 60;
  const snapped = Math.round(totalMinutes / MINUTE_STEP) * MINUTE_STEP;
  return DISPLAY_START_MINUTES + snapped;
}

export function clampMinutes(value: number) {
  return Math.min(Math.max(value, DISPLAY_START_MINUTES), DISPLAY_END_MINUTES);
}

export function clampToDayRange(start: number, end: number) {
  return {
    start: Math.max(DISPLAY_START_MINUTES, Math.min(start, DISPLAY_END_MINUTES)),
    end: Math.max(DISPLAY_START_MINUTES, Math.min(end, DISPLAY_END_MINUTES))
  };
}

export function computeBlockLayout(blocks: CalendarBlock[]): BlockLayout {
  const sorted = [...blocks].sort((a, b) => {
    if (a.startMinutes === b.startMinutes) {
      return a.endMinutes - b.endMinutes;
    }
    return a.startMinutes - b.startMinutes;
  });

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

  const layout: BlockLayout = new Map();

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

export function getBusyIntervals(blocks: CalendarBlock[]): BusyInterval[] {
  const sorted = [...blocks].sort((a, b) => a.startMinutes - b.startMinutes);
  const merged: BusyInterval[] = [];

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

export function scheduleTasks(
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
          return window.start < interval.end && window.end > interval.start;
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

export function parseTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatTimeRange(startMinutes: number, endMinutes: number) {
  return `${minutesToTime(startMinutes)} – ${minutesToTime(endMinutes)}`;
}

export function formatHourLabel(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return format(date, "h a");
}

export function hexToRgb(color: string) {
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

export function getContrastTextColor(color: string) {
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

export function formatDisplayTime(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return format(date, "h:mm a");
}

export function formatDisplayTimeRange(startMinutes: number, endMinutes: number) {
  const start = formatDisplayTime(startMinutes).split(" ");
  const end = formatDisplayTime(endMinutes).split(" ");

  if (start[1] === end[1]) {
    return `${start[0]} – ${end[0]} ${end[1]}`;
  }

  return `${start.join(" ")} – ${end.join(" ")}`;
}

export function buildBlocks(
  events: CalendarEvent[],
  bookings: BookingSlot[],
  day: Date,
  tasks: Task[] = []
) {
  const dayStr = format(day, "yyyy-MM-dd");

  const eventBlocks: CalendarBlock[] = [];

  events.forEach(event => {
    const occurrence = resolveEventOccurrenceForDay(event, day);
    if (!occurrence) return;

    const { occurrenceStart, occurrenceEnd, occurrenceIndex } = occurrence;
    const { segmentStart, segmentEnd } = clampSegmentToDay(occurrenceStart, occurrenceEnd, day);

    let startMinutes = differenceInMinutes(segmentStart, startOfDay(day));
    let endMinutes = differenceInMinutes(segmentEnd, startOfDay(day));

    if (event.allDay) {
      startMinutes = DISPLAY_START_MINUTES;
      endMinutes = DISPLAY_END_MINUTES;
    } else {
      startMinutes = Math.max(0, startMinutes);
      endMinutes = Math.max(startMinutes + MIN_EVENT_DURATION_MINUTES, endMinutes);
    }

    eventBlocks.push({
      id: event.id,
      source: "event",
      title: event.title,
      subtitle: event.location || event.category,
      date: dayStr,
      startMinutes,
      endMinutes,
      color: event.color || "#2563eb",
      allDay: Boolean(event.allDay),
      meta: {
        description: event.description,
        attendees: event.attendees,
        location: event.location,
        startDate: event.date,
        endDate: event.endDate ?? event.date,
        occurrenceStart: occurrenceStart.toISOString(),
        occurrenceEnd: occurrenceEnd.toISOString(),
        isOccurrenceStart: occurrenceStart >= startOfDay(day) && occurrenceStart <= endOfDay(day),
        isOccurrenceEnd: occurrenceEnd >= startOfDay(day) && occurrenceEnd <= endOfDay(day),
        occurrenceIndex,
        recurrence: event.recurrence,
        allDay: Boolean(event.allDay)
      }
    });
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

export function getUpcomingEventOccurrences(
  events: CalendarEvent[],
  fromDate: Date,
  maxCount = 6
) {
  const start = startOfDay(fromDate);
  const horizon = endOfDay(addMonths(fromDate, UPCOMING_LOOKAHEAD_MONTHS));
  const seen = new Set<string>();
  const occurrences: { event: CalendarEvent; start: Date; end: Date; occurrenceIndex: number }[] = [];

  for (let cursor = start; cursor <= horizon && occurrences.length < maxCount * 3; cursor = addDays(cursor, 1)) {
    events.forEach(event => {
      const occurrence = resolveEventOccurrenceForDay(event, cursor);
      if (!occurrence) return;

      const key = `${event.id}:${occurrence.occurrenceIndex}`;
      if (seen.has(key)) {
        return;
      }

      const dayStart = startOfDay(cursor);
      const dayEnd = endOfDay(cursor);
      const isOccurrenceStart = occurrence.occurrenceStart >= dayStart && occurrence.occurrenceStart <= dayEnd;

      if (!isOccurrenceStart) {
        if (occurrence.occurrenceEnd <= fromDate) {
          return;
        }
        if (occurrence.occurrenceStart >= dayStart) {
          return;
        }
        // For ongoing events that started earlier, include them once if still active
        if (occurrence.occurrenceEnd <= fromDate) {
          return;
        }
      }

      if (occurrence.occurrenceEnd <= fromDate) {
        return;
      }

      seen.add(key);
      occurrences.push({
        event,
        start: occurrence.occurrenceStart,
        end: occurrence.occurrenceEnd,
        occurrenceIndex: occurrence.occurrenceIndex
      });
    });
  }

  return occurrences
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, maxCount);
}
