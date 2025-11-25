import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Flame } from "lucide-react";

const routines = [
  { title: "Morning routine", description: "Wake, hydrate, stretch", badge: "12 day streak" },
  { title: "Evening shutdown", description: "Plan tomorrow + tidy", badge: "9 day streak" },
  { title: "Read 20 pages", description: "Track in Kindle", badge: "6 day streak" },
];

const experiments = [
  { title: "No-meeting mornings", description: "Block 9–11 AM", badge: "Testing" },
  { title: "Screen-free hour", description: "After 9 PM", badge: "New" },
];

const reflections = [
  { title: "Last week", description: "5/7 habits kept", badge: "Recap" },
  { title: "This week", description: "Adjust evening wind-down", badge: "Note" },
];

export default function Habits() {
  useEffect(() => {
    document.title = "Habits — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Active habits", value: "3", helper: "Balanced", tone: "positive" },
    { label: "Longest streak", value: "12 days", helper: "Morning", tone: "positive" },
    { label: "Experiments", value: "2", helper: "Review Friday", tone: "neutral" },
    { label: "Missed", value: "1", helper: "Yesterday", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    { title: "Routines", description: "Keep it short and repeatable.", items: routines },
    { title: "Experiments", description: "Trials you’re running this week.", items: experiments },
    { title: "Reflections", description: "Learnings Arlo captured for you.", items: reflections },
  ];

  return (
    <ModuleTemplate
      icon={Flame}
      title="Habits"
      description="Just the rituals you’re working on, the experiments you’re testing, and a quick reflection to adjust."
      primaryAction="Add habit"
      secondaryAction="Log reflection"
      stats={stats}
      sections={sections}
    />
  );
}

