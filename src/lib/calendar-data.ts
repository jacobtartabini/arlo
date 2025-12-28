import { format } from "date-fns";

export type CalendarCategory = "personal" | "work" | "school" | "meeting" | "project" | "custom";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurrenceEndRule =
  | { type: "never" }
  | { type: "onDate"; date: string }
  | { type: "after"; count: number };

export type EventRecurrence = {
  frequency: RecurrenceFrequency;
  interval?: number;
  end?: RecurrenceEndRule;
};

export type EventSource = "arlo" | "google" | "outlook_ics";

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  endDate?: string;
  category: CalendarCategory;
  color: string;
  attendees?: string[];
  location?: string;
  allDay?: boolean;
  recurrence?: EventRecurrence;
  // External calendar sync fields
  source?: EventSource;
  externalId?: string;
  readOnly?: boolean;
  lastSyncedAt?: string;
}

export type TaskCategory = "personal" | "work" | "school";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate?: string;
  completed: boolean;
  estimatedTime?: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  milestones: Milestone[];
  color: string;
}

export interface BookingSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  available: boolean;
  title?: string;
  bookedBy?: string | null;
  description?: string;
  [key: string]: unknown;
}

export const EVENT_STORAGE_KEY = "arlo-calendar-events";
export const BOOKING_STORAGE_KEY = "arlo-calendar-bookings";

// No default events - real data comes from database
export const DEFAULT_EVENTS: CalendarEvent[] = [];

// No default tasks - real data comes from database  
export const DEFAULT_TASKS: Task[] = [];

export const DEFAULT_PROJECTS: Project[] = [
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
      { id: "m3", title: "Public launch", date: "2024-03-31", completed: false },
    ],
  },
];

// No default bookings - real data comes from database
export const DEFAULT_BOOKINGS: BookingSlot[] = [];

function parseStoredJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as T;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return fallback;
  } catch (error) {
    console.error("Failed to parse stored calendar data", error);
    return fallback;
  }
}

export function getStoredEvents(): CalendarEvent[] {
  if (typeof window === "undefined") {
    return DEFAULT_EVENTS.map(event => ({ ...event }));
  }
  const stored = window.localStorage.getItem(EVENT_STORAGE_KEY);
  return parseStoredJson(stored, DEFAULT_EVENTS).map(event => ({ ...event }));
}

export function setStoredEvents(events: CalendarEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
}

export function getStoredBookings(): BookingSlot[] {
  if (typeof window === "undefined") {
    return DEFAULT_BOOKINGS.map(slot => ({ ...slot }));
  }
  const stored = window.localStorage.getItem(BOOKING_STORAGE_KEY);
  return parseStoredJson(stored, DEFAULT_BOOKINGS).map(slot => ({ ...slot }));
}

export function setStoredBookings(bookings: BookingSlot[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(bookings));
}

export function generateBookingSlug(handle: string) {
  const sanitized = handle.trim();
  if (!sanitized) {
    return "jacob";
  }
  return sanitized.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function getPublicBookingUrl(handle: string) {
  const defaultHost = "https://jacobtartabini.com";
  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : defaultHost;
  const slug = generateBookingSlug(handle);
  if (!slug || slug === "jacob") {
    return `${origin}/book`;
  }
  return `${origin}/book/${slug}`;
}

export function buildBookingTitle(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Booked session";
  }
  return trimmed
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatSlotLabel(slot: BookingSlot) {
  const start = new Date(`${slot.date}T${slot.startTime}:00`);
  return format(start, "EEEE, MMMM d · h:mmaaa");
}
