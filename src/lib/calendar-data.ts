import { format } from "date-fns";

export type CalendarCategory = "personal" | "work" | "school" | "meeting" | "project";

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
  bookedBy?: string;
}

export const EVENT_STORAGE_KEY = "arlo-calendar-events";
export const BOOKING_STORAGE_KEY = "arlo-calendar-bookings";

export const DEFAULT_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Sync",
    description: "Weekly planning with product and design",
    startTime: "09:30",
    endTime: "10:30",
    date: "2024-01-15",
    endDate: "2024-01-15",
    category: "work",
    color: "#3b82f6",
    attendees: ["alex@arlo.ai", "casey@arlo.ai"],
    location: "Huddle Room A",
    recurrence: {
      frequency: "weekly",
      interval: 1,
      end: { type: "onDate", date: "2024-05-31" }
    }
  },
  {
    id: "2",
    title: "Investor Update",
    description: "Q1 numbers and roadmap discussion",
    startTime: "13:00",
    endTime: "14:00",
    date: "2024-01-16",
    endDate: "2024-01-16",
    category: "work",
    color: "#8b5cf6",
    location: "Boardroom"
  },
  {
    id: "3",
    title: "Gym",
    startTime: "18:00",
    endTime: "19:00",
    date: "2024-01-16",
    endDate: "2024-01-16",
    category: "personal",
    color: "#22c55e",
    allDay: false
  },
  {
    id: "4",
    title: "Strategy Offsite",
    description: "Quarterly leadership alignment",
    startTime: "00:00",
    endTime: "23:59",
    date: "2024-02-05",
    endDate: "2024-02-07",
    category: "work",
    color: "#f97316",
    allDay: true,
    location: "Napa Valley Retreat"
  },
  {
    id: "5",
    title: "Monthly Product Review",
    description: "Cross-functional roadmap review",
    startTime: "10:00",
    endTime: "11:30",
    date: "2024-01-10",
    endDate: "2024-01-10",
    category: "work",
    color: "#0ea5e9",
    recurrence: {
      frequency: "monthly",
      interval: 1,
      end: { type: "never" }
    }
  },
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: "1",
    title: "Revise onboarding flow",
    description: "Audit drop-off points and capture new requirements",
    priority: "high",
    category: "work",
    dueDate: "2024-01-17",
    completed: false,
    estimatedTime: 120,
  },
  {
    id: "2",
    title: "Follow up with beta customers",
    priority: "medium",
    category: "work",
    dueDate: "2024-01-19",
    completed: false,
    estimatedTime: 45,
  },
  {
    id: "3",
    title: "Deep work: strategy memo",
    description: "Outline positioning for upcoming launch",
    priority: "high",
    category: "work",
    completed: false,
    estimatedTime: 180,
  },
  {
    id: "4",
    title: "Personal training",
    priority: "low",
    category: "personal",
    dueDate: "2024-01-20",
    completed: false,
    estimatedTime: 60,
  },
];

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

export const DEFAULT_BOOKINGS: BookingSlot[] = [
  {
    id: "b1",
    title: "Product demo",
    bookedBy: "jordan@startup.io",
    startTime: "11:00",
    endTime: "11:45",
    date: "2024-01-15",
    available: false,
  },
  {
    id: "b2",
    startTime: "15:00",
    endTime: "15:45",
    date: "2024-01-15",
    available: true,
  },
  {
    id: "b3",
    title: "Investor intro",
    bookedBy: "maria@vc.com",
    startTime: "10:00",
    endTime: "10:45",
    date: "2024-01-17",
    available: false,
  },
];

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
