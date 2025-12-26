import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { HeartPulse } from "lucide-react";

const vitals = [
  { title: "Rest", description: "7h 45m avg", badge: "Steady" },
  { title: "Activity", description: "6,200 steps", badge: "Needs movement" },
  { title: "Recovery", description: "HRV 72 ms", badge: "Balanced" },
];

const appointments = [
  { title: "PT follow-up", description: "May 2 · 2:00 PM", badge: "Confirmed" },
  { title: "Annual physical", description: "Jun 12 · 9:00 AM", badge: "Scheduled" },
];

const notes = [
  { title: "Shoulder exercises", description: "3x weekly · 20 minutes", badge: "Plan" },
  { title: "Supplements", description: "Vitamin D · Omega 3", badge: "Daily" },
];

export default function Health() {
  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Readiness", value: "Good", helper: "No alerts", tone: "positive" },
    { label: "Sleep", value: "7h 45m", helper: "Past week avg", tone: "neutral" },
    { label: "Activity", value: "6.2k steps", helper: "Today", tone: "neutral" },
    { label: "Sessions", value: "2 upcoming", helper: "This week", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    { title: "Vitals", description: "Quick signals from your wearable.", items: vitals },
    { title: "Appointments", description: "What’s already on the calendar.", items: appointments },
    { title: "Care notes", description: "Short guidance saved for you.", items: notes },
  ];

  return (
    <ModuleTemplate
      icon={HeartPulse}
      title="Health"
      description="A calm snapshot from your wearable: vitals, upcoming care, and the routines that keep you steady."
      primaryAction="Log a note"
      secondaryAction="Share with provider"
      stats={stats}
      sections={sections}
    />
  );
}

