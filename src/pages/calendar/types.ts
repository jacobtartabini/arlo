import type { BookingSlot, CalendarEvent, Task } from "@/lib/calendar-data";

export const VIEW_OPTIONS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" }
] as const;

export type CalendarView = (typeof VIEW_OPTIONS)[number]["id"];

export type BlockType = "event" | "task" | "booking";

export type EventSource = "arlo" | "google" | "outlook_ics";

export type CalendarBlock = {
  id: string;
  source: BlockType;
  eventSource?: EventSource; // External calendar source
  title: string;
  subtitle?: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  color: string;
  allDay?: boolean;
  isAvailable?: boolean;
  readOnly?: boolean; // Whether the event can be edited
  meta?: Record<string, unknown>;
};

export type DraftKind = "event" | "booking";

export type DraftState = {
  kind: DraftKind;
  title: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  color: string;
  attendees: string;
  recurrenceFrequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
  recurrenceInterval: number;
  recurrenceEnd: {
    type: "never" | "onDate" | "after";
    date: string;
    count: string;
  };
};

export type SelectedBlockState = {
  block: CalendarBlock;
  target: HTMLElement;
};

export type CalendarDayBlocks = {
  day: Date;
  blocks: CalendarBlock[];
};

export type DragSelection = {
  day: Date;
  dayKey: string;
  startMinutes: number;
  endMinutes: number;
};

export type UpcomingItem = {
  id: string;
  title: string;
  subtitle?: string;
  start: Date;
  color: string;
};
