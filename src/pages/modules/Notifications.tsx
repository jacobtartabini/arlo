import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Bell } from "lucide-react";

const inbox = [
  { title: "Arlo brief delivered", description: "Daily summary at 8:00 AM", badge: "Info" },
  { title: "New access request", description: "Finance space", badge: "Action" },
  { title: "Meeting starts in 10", description: "Design critique", badge: "Reminder" },
];

const filters = [
  { title: "Focus mode", description: "Only critical alerts", badge: "On" },
  { title: "Email", description: "Digest once daily", badge: "Batch" },
  { title: "Mobile", description: "Mute after 8 PM", badge: "Quiet" },
];

const preferences = [
  { title: "People", description: "Always allow direct mentions", badge: "Priority" },
  { title: "Systems", description: "Only errors and approvals", badge: "Filtered" },
];

export default function Notifications() {
  useEffect(() => {
    document.title = "Notifications — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Unread", value: "3", helper: "All short", tone: "neutral" },
    { label: "Quiet hours", value: "8 PM – 7 AM", helper: "Daily", tone: "neutral" },
    { label: "Channels", value: "Email + Push", helper: "Synced", tone: "positive" },
    { label: "Rules", value: "4 filters", helper: "Zero noise", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Inbox", description: "Only the essentials make it here.", items: inbox },
    { title: "Filters", description: "Rules that keep things calm.", items: filters },
    { title: "Preferences", description: "People and systems you always allow.", items: preferences },
  ];

  return (
    <ModuleTemplate
      icon={Bell}
      title="Notifications"
      description="A noise-free inbox with a few rules that keep only what matters on your screen."
      primaryAction="Clear all"
      secondaryAction="Adjust filters"
      stats={stats}
      sections={sections}
    />
  );
}

