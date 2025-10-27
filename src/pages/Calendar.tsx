"use client";

import * as React from "react";
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  compareAsc,
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const WORK_START_MINUTES = 8 * 60;
const WORK_END_MINUTES = 18 * 60;
const DISPLAY_START_MINUTES = 6 * 60;
const DISPLAY_END_MINUTES = 22 * 60;
const HOUR_HEIGHT = 52;

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: string;
  category: "personal" | "work" | "school" | "meeting" | "project";
  color: string;
  attendees?: string[];
}

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

interface Project {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  milestones: Milestone[];
  color: string;
}

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
