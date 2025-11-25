import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { CalendarCheck } from "lucide-react";

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
    { label: "Focus mode", value: "On", helper: "90 minutes", tone: "positive" },
    { label: "Today’s completion", value: "62%", helper: "2 tasks left", tone: "neutral" },
    { label: "Next event", value: "Design critique", helper: "Apr 28 · 09:30", tone: "neutral" },
    { label: "Active habits", value: "3", helper: "+12 day streak", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    {
      title: "Today’s priorities",
      description: "A short list that stays focused on what must move today.",
      items: tasks.map((task) => ({
        title: task.label,
        badge: task.done ? "Done" : "Next",
        meta: task.done ? "Completed" : "Unstarted",
      })),
      span: 7,
    },
    {
      title: "Schedule",
      description: "Time blocks already held so you know where to focus.",
      items: schedule.map((item) => ({
        title: item.label,
        description: item.time,
        badge: "On calendar",
      })),
      span: 5,
    },
    {
      title: "Inbox",
      description: "Messages Arlo surfaced as actionable today.",
      items: inboxPreview.map((item) => ({
        title: item.subject,
        description: item.snippet,
        badge: item.source,
      })),
      span: 6,
    },
    {
      title: "Habits",
      description: "Streaks that anchor your day.",
      items: habits.map((habit) => ({
        title: habit.label,
        description: `${habit.streak}-day streak`,
      })),
      span: 6,
    },
  ];

  return (
    <ModuleTemplate
      icon={CalendarCheck}
      title="Productivity"
      description="A calm view of what matters now—focus blocks, the next tasks, and a few rituals to keep you steady."
      primaryAction="Add a task"
      secondaryAction="Start focus mode"
      stats={stats}
      sections={sections}
    />
  );
}

