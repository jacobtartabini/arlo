import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { CalendarCheck, CheckSquare, Clock3, Flame, GaugeCircle, MailCheck } from "lucide-react";

const tasks = [
  { id: 1, label: "Ship design review summary", done: true },
  { id: 2, label: "Respond to research thread", done: false },
  { id: 3, label: "Plan Q2 roadmap milestones", done: false },
  { id: 4, label: "Prep investor update outline", done: true },
];

const schedule = [
  { time: "08:30", label: "Inbox triage" },
  { time: "11:00", label: "AI pairing session" },
  { time: "14:00", label: "Focus block" },
  { time: "16:30", label: "Lecture recording" },
];

const inboxPreview = [
  { source: "Email", subject: "Design QA sign-off", snippet: "Final tweaks applied to hero." },
  { source: "SMS", subject: "Courier", snippet: "Package arriving at 6 PM." },
  { source: "Email", subject: "Team Daily", snippet: "Notes and action items compiled." },
];

const habits = [
  { label: "Morning routine", streak: 12 },
  { label: "Evening shutdown", streak: 9 },
  { label: "Read 20 pages", streak: 6 },
];

export default function Productivity() {
  useEffect(() => {
    document.title = "Productivity — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Focus mode", value: "On", helper: "90 minutes", tone: "positive", trend: [30, 45, 60, 90] },
    { label: "Today’s completion", value: "62%", helper: "2 tasks left", tone: "neutral", trend: [30, 52, 62] },
    { label: "Next event", value: "Design critique", helper: "Apr 28 · 09:30", tone: "neutral", trend: [1, 1.5, 2] },
    { label: "Active habits", value: "3", helper: "+12 day streak", tone: "positive", trend: [1, 2, 3, 3] },
  ];

  const sections: ModuleSection[] = [
    {
      title: "Today’s priorities",
      description: "A calm stack: what moves, where the time is, and which rituals keep you steady.",
      variant: "split",
      items: [
        {
          title: "Deep work lane",
          description: "One focus block is locked. Arlo will buffer pings for 90 minutes.",
          badge: "Active",
          tone: "positive",
          icon: <GaugeCircle className="h-5 w-5" />,
          visual: { type: "progress", value: 62, label: "Block progress" },
          spotlight: true,
        },
        ...tasks.map((task) => ({
          title: task.label,
          badge: task.done ? "Done" : "Next",
          tone: (task.done ? "positive" : "info") as "positive" | "info",
          meta: task.done ? "Completed" : "Unstarted",
          icon: <CheckSquare className="h-4 w-4" />,
          visual: task.done ? { type: "pill" as const, label: "Logged" } : { type: "progress" as const, value: 40 },
        })),
      ],
    },
    {
      title: "Schedule rail",
      description: "A slim, glanceable timeline that keeps the day ordered without stealing attention.",
      variant: "timeline",
      accent: "info",
      items: schedule.map((item) => ({
        title: item.label,
        description: item.time,
        badge: "On calendar",
        icon: <Clock3 className="h-4 w-4" />,
      })),
    },
    {
      title: "Inbox surfaces",
      description: "Only messages with clear, prepped actions. Each badge is the suggested path.",
      items: inboxPreview.map((item) => ({
        title: item.subject,
        description: item.snippet,
        badge: item.source,
        tone: "info",
        icon: <MailCheck className="h-4 w-4" />,
        visual: { type: "pill", label: "Reply draft", tone: "info" },
      })),
    },
    {
      title: "Habits",
      description: "Streaks that anchor your day and keep Arlo calibrated to your rhythm.",
      items: habits.map((habit) => ({
        title: habit.label,
        description: `${habit.streak}-day streak`,
        badge: "Keep warm",
        tone: "positive",
        icon: <Flame className="h-4 w-4" />,
        visual: { type: "progress", value: Math.min(100, habit.streak * 5), label: "Momentum" },
      })),
    },
  ];

  return (
    <ModuleTemplate
      icon={CalendarCheck}
      title="Productivity"
      description="A calm view of what matters now—focus blocks, the next tasks, and a few rituals to keep you steady."
      primaryAction="Add a task"
      secondaryAction="Start focus mode"
      accent="violet"
      stats={stats}
      sections={sections}
    />
  );
}
