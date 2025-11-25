import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Wand2 } from "lucide-react";

const automations = [
  { title: "File meeting notes", description: "Save summaries into Notes space", badge: "Running" },
  { title: "Reconcile receipts", description: "Match cards to uploads nightly", badge: "Running" },
  { title: "Share daily brief", description: "Send at 8:00 AM", badge: "Scheduled" },
];

const suggestions = [
  { title: "Silence notifications in focus", description: "Use calendar holds to pause alerts", badge: "Suggested" },
  { title: "Auto-archive completed tasks", description: "Move done items weekly", badge: "Suggested" },
];

const logs = [
  { title: "Expense sync", description: "12 items matched", badge: "Today" },
  { title: "Brief sent", description: "3 recipients", badge: "Today" },
];

export default function Automations() {
  useEffect(() => {
    document.title = "Automations — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Active", value: "3", helper: "Running now", tone: "positive" },
    { label: "Scheduled", value: "1", helper: "8:00 AM daily", tone: "neutral" },
    { label: "Suggestions", value: "2", helper: "Ready to enable", tone: "neutral" },
    { label: "Failures", value: "0", helper: "Past week", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Live automations", description: "Flows that keep Arlo on autopilot.", items: automations },
    { title: "Suggestions", description: "Ideas to simplify your routine.", items: suggestions },
    { title: "Recent runs", description: "At-a-glance execution log.", items: logs },
  ];

  return (
    <ModuleTemplate
      icon={Wand2}
      title="Automations"
      description="Quiet, reusable flows so recurring work disappears without cluttering the screen."
      primaryAction="Create automation"
      secondaryAction="Pause all"
      stats={stats}
      sections={sections}
    />
  );
}

