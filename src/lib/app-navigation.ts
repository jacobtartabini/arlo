import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Calendar,
  CalendarCheck,
  FileText,
  Flame,
  FolderOpen,
  Home,
  Map,
  MessageCircle,
  Orbit,
  NotebookPen,
  PenTool,
  Plane,
  Settings,
  ShieldCheck,
  HeartPulse,
  Users,
  Wallet,
} from "lucide-react";

export type ModulePriority = "center" | "inner" | "outer";
export type ModuleSize = "primary" | "secondary" | "tertiary";

export type Module = {
  id: string;
  title: string;
  icon: LucideIcon;
  route: string;
  color: string;
  size: ModuleSize;
  priority: ModulePriority;
  actionLabel: string; // What clicking does
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

// Modules ordered by priority (center → outer)
export const APP_MODULES: Module[] = [
  // CENTER RING - Most used (2-3 modules, largest)
  {
    id: "productivity",
    title: "Today",
    icon: CalendarCheck,
    route: "/productivity",
    color: "accent",
    size: "primary",
    priority: "center",
    actionLabel: "Start focus",
    summary: "Tasks & focus blocks",
    keywords: ["tasks", "planning", "agenda", "focus"]
  },
  {
    id: "habits",
    title: "Habits",
    icon: Flame,
    route: "/habits",
    color: "accent",
    size: "primary",
    priority: "center",
    actionLabel: "Complete habits",
    summary: "Daily streaks & routines",
    keywords: ["habits", "routines", "streaks", "consistency", "morning", "night"]
  },

  // INNER RING - Frequently used
  {
    id: "notes",
    title: "Notes",
    icon: NotebookPen,
    route: "/notes",
    color: "primary",
    size: "secondary",
    priority: "inner",
    actionLabel: "Open canvas",
    summary: "Canvas workspace",
    keywords: ["notes", "drawing", "handwriting", "canvas", "sketches"]
  },
  {
    id: "finance",
    title: "Finance",
    icon: Wallet,
    route: "/finance",
    color: "primary",
    size: "secondary",
    priority: "inner",
    actionLabel: "View spending",
    summary: "Budget & accounts",
    keywords: ["budgets", "accounts", "cashflow", "investments"]
  },
  {
    id: "maps",
    title: "Maps",
    icon: Map,
    route: "/maps",
    color: "primary",
    size: "secondary",
    priority: "inner",
    actionLabel: "Navigate",
    summary: "Directions & places",
    keywords: ["maps", "navigation", "directions", "places", "traffic", "location"]
  },
  {
    id: "contacts",
    title: "Circles",
    icon: Orbit,
    route: "/contacts",
    color: "primary",
    size: "secondary",
    priority: "inner",
    actionLabel: "Open Circles",
    summary: "Contacts & follow-ups",
    keywords: ["contacts", "people", "network", "crm", "relationships", "follow up", "linkedin", "circles"]
  },

  // OUTER RING - Less frequent / utility
  {
    id: "travel",
    title: "Travel",
    icon: Plane,
    route: "/travel",
    color: "primary",
    size: "tertiary",
    priority: "outer",
    actionLabel: "View trips",
    summary: "Trips & bookings",
    keywords: ["flights", "bookings", "trips", "itinerary"]
  },
  {
    id: "files",
    title: "Files",
    icon: FolderOpen,
    route: "/files",
    color: "primary",
    size: "tertiary",
    priority: "outer",
    actionLabel: "Browse files",
    summary: "Storage & drives",
    keywords: ["filebrowser", "storage", "raspberry pi", "drives"]
  },
  {
    id: "creation",
    title: "Lab",
    icon: PenTool,
    route: "/lab",
    color: "accent",
    size: "tertiary",
    priority: "outer",
    actionLabel: "Open workspace",
    summary: "Projects, 3D, notes & media",
    keywords: ["lab", "design", "3d", "projects", "studio", "mockups", "snippets"]
  },
  {
    id: "health",
    title: "Health",
    icon: HeartPulse,
    route: "/health",
    color: "primary",
    size: "tertiary",
    priority: "outer",
    actionLabel: "View activity",
    summary: "Fitness & wellness",
    keywords: ["wellness", "fitness", "sleep", "nutrition"]
  },
  {
    id: "security",
    title: "Security",
    icon: ShieldCheck,
    route: "/security",
    color: "accent",
    size: "tertiary",
    priority: "outer",
    actionLabel: "Check status",
    summary: "System & devices",
    keywords: ["uptime", "security", "device", "monitoring", "tailscale"]
  },
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
    id: "inbox",
    title: "Inbox",
    description: "Unified messages from all providers",
    route: "/inbox",
    icon: MessageCircle,
    keywords: ["email", "messages", "gmail", "outlook", "teams"]
  },
  {
    id: "chat",
    title: "Chat",
    description: "Conversations with the Arlo assistant",
    route: "/chat",
    icon: MessageCircle,
    keywords: ["assistant", "conversations", "ai", "arlo"]
  },
  {
    id: "calendar",
    title: "Calendar",
    description: "Schedule, availability, and bookings",
    route: "/calendar",
    icon: Calendar,
    keywords: ["events", "availability", "meetings", "schedule"]
  },
  {
    id: "maps",
    title: "Maps",
    description: "Navigation, directions, and places",
    route: "/maps",
    icon: Map,
    keywords: ["navigation", "directions", "places", "location", "traffic"]
  },
  {
    id: "contacts",
    title: "Circles",
    description: "Relationship memory, imports, and follow-up reminders",
    route: "/contacts",
    icon: Orbit,
    keywords: ["contacts", "people", "network", "follow up", "relationships", "circles"]
  },
  {
    id: "notes",
    title: "Notes",
    description: "Canvas-based notes with drawing tools",
    route: "/notes",
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
    id: "notifications-inbox",
    title: "Notifications Inbox",
    description: "Alerts, reminders, and actionable updates",
    route: "/notifications",
    icon: Bell,
    keywords: ["alerts", "reminders", "follow up"]
  },
  {
    id: "focus-session",
    title: "Focus Session",
    description: "Distraction-free timer for deep work",
    route: "/focus",
    icon: CalendarCheck,
    keywords: ["focus", "pomodoro", "timer", "deep work"]
  }
];
