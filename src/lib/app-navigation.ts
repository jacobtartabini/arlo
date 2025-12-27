import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BellRing,
  Calendar,
  CalendarCheck,
  FileText,
  Flame,
  FolderOpen,
  Home,
  Library,
  MessageCircle,
  NotebookPen,
  PenTool,
  Plane,
  Settings,
  Sparkles,
  Users,
  Wallet,
  Workflow,
  ShieldCheck,
  HeartPulse
} from "lucide-react";

export type Module = {
  id: string;
  title: string;
  icon: LucideIcon;
  route: string;
  color: string;
  size: "small" | "medium" | "large";
  summary?: string;
  keywords?: string[];
};

export type NavigationItem = {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: LucideIcon;
  keywords?: string[];
};

export const APP_MODULES: Module[] = [
  {
    id: "finance",
    title: "Finance",
    icon: Wallet,
    route: "/finance",
    color: "primary",
    size: "large",
    summary: "Spend vs. budget • Net worth update",
    keywords: ["budgets", "accounts", "cashflow", "investments"]
  },
  {
    id: "productivity",
    title: "Productivity",
    icon: CalendarCheck,
    route: "/productivity",
    color: "accent",
    size: "large",
    summary: "62% tasks done • Next focus block",
    keywords: ["tasks", "planning", "agenda", "focus"]
  },
  {
    id: "travel",
    title: "Travel",
    icon: Plane,
    route: "/travel",
    color: "primary",
    size: "medium",
    summary: "Flight DL204 on-time • 72°F",
    keywords: ["flights", "bookings", "trips", "itinerary"]
  },
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    route: "/security",
    color: "accent",
    size: "medium",
    summary: "All systems secure • 6 devices",
    keywords: ["uptime", "security", "device", "monitoring", "tailscale"]
  },
  {
    id: "health",
    title: "Health & Lifestyle",
    icon: HeartPulse,
    route: "/health",
    color: "primary",
    size: "medium",
    summary: "Calorie burn 82% • Streak 9 days",
    keywords: ["wellness", "fitness", "sleep", "nutrition"]
  },
  {
    id: "files",
    title: "Files & Storage",
    icon: FolderOpen,
    route: "/files",
    color: "primary",
    size: "medium",
    summary: "Drives mounted • Filebrowser running",
    keywords: ["filebrowser", "storage", "raspberry pi", "drives"]
  },
  {
    id: "creation",
    title: "Creation & Design",
    icon: PenTool,
    route: "/creation",
    color: "accent",
    size: "large",
    summary: "2 drafts awaiting review",
    keywords: ["design", "drafts", "content", "studio"]
  },
  {
    id: "knowledge",
    title: "Knowledge & Archives",
    icon: Library,
    route: "/knowledge",
    color: "primary",
    size: "medium",
    summary: "Today's brief • 3 new archives",
    keywords: ["docs", "brief", "history", "research"]
  },
  {
    id: "automations",
    title: "Automations",
    icon: Workflow,
    route: "/automations",
    color: "accent",
    size: "medium",
    summary: "3 active • 6.4h saved",
    keywords: ["workflows", "bots", "routines", "automation"]
  },
  {
    id: "insights",
    title: "AI Insights",
    icon: Sparkles,
    route: "/insights",
    color: "primary",
    size: "medium",
    summary: "12% uplift • New actions",
    keywords: ["ai", "analytics", "recommendations", "intel"]
  },
  {
    id: "notifications",
    title: "Notifications",
    icon: BellRing,
    route: "/notifications",
    color: "accent",
    size: "small",
    summary: "3 alerts • Snooze active",
    keywords: ["alerts", "inbox", "updates", "reminders"]
  },
  {
    id: "notes",
    title: "Smart Notes",
    icon: NotebookPen,
    route: "/notes-dashboard",
    color: "primary",
    size: "large",
    summary: "Canvas notes • Embedded modules",
    keywords: ["notes", "drawing", "handwriting", "canvas", "sketches"]
  },
  {
    id: "habits",
    title: "Habits",
    icon: Flame,
    route: "/habits",
    color: "accent",
    size: "medium",
    summary: "Daily alignment • Streaks & XP",
    keywords: ["habits", "routines", "streaks", "consistency", "morning", "night"]
  }
];

export const APP_PAGES: NavigationItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Unified command center overview",
    route: "/dashboard",
    icon: Home,
    keywords: ["overview", "home", "widgets"]
  },
  {
    id: "chat",
    title: "Chat",
    description: "Conversations with the Arlo assistant",
    route: "/chat",
    icon: MessageCircle,
    keywords: ["assistant", "conversations", "messages"]
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Schedule, availability, and bookings",
    route: "/calendar",
    icon: Calendar,
    keywords: ["events", "availability", "meetings"]
  },
  {
    id: "notes",
    title: "Smart Notes",
    description: "Canvas-based notes with drawing tools",
    route: "/notes-dashboard",
    icon: NotebookPen,
    keywords: ["notes", "drawing", "canvas", "writing", "handwriting"]
  },
  {
    id: "settings",
    title: "Settings",
    description: "Account, preferences, and integrations",
    route: "/settings",
    icon: Settings,
    keywords: ["profile", "preferences", "integrations"]
  },
  {
    id: "habits",
    title: "Habits",
    description: "Daily alignment, routines, and streaks",
    route: "/habits",
    icon: Flame,
    keywords: ["habits", "routines", "streaks", "morning", "night", "xp"]
  }
];

export const APP_RESOURCES: NavigationItem[] = [
  {
    id: "public-booking",
    title: "Public Booking Page",
    description: "Shareable scheduling for external guests",
    route: "/book",
    icon: Users,
    keywords: ["meeting", "booking", "calendar", "availability"]
  },
  {
    id: "security-status",
    title: "Security Status",
    description: "Live security health and Tailscale devices",
    route: "/security",
    icon: ShieldCheck,
    keywords: ["uptime", "monitoring", "status", "tailscale", "security"]
  },
  {
    id: "knowledge-brief",
    title: "Knowledge Briefs",
    description: "Latest research digests and archives",
    route: "/knowledge",
    icon: FileText,
    keywords: ["documents", "reports", "archives"]
  },
  {
    id: "notifications-inbox",
    title: "Notifications Inbox",
    description: "Alerts, reminders, and actionable updates",
    route: "/notifications",
    icon: Bell,
    keywords: ["alerts", "reminders", "follow up"]
  }
];
