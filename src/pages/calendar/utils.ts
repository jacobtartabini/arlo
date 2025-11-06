import { format } from "date-fns";

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
          attendees: event.attendees,
          location: event.location
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
