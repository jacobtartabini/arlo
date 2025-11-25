import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Sparkles } from "lucide-react";

const insights = [
  { title: "Spending under pace", description: "You’re 8% below last month.", badge: "Finance" },
  { title: "Focus pattern", description: "Best deep work is 9–11 AM.", badge: "Productivity" },
  { title: "Travel ETA", description: "Leave by 5:45 AM to reach SFO.", badge: "Travel" },
];

const followUps = [
  { title: "Draft investor update", description: "Based on latest KPIs", badge: "Start" },
  { title: "Book PT follow-up", description: "Hold 30 minutes next week", badge: "Action" },
];

const recaps = [
  { title: "Yesterday", description: "3 tasks completed · 1 meeting recorded", badge: "Digest" },
  { title: "Week-to-date", description: "62% toward goals", badge: "Digest" },
];

export default function AIInsights() {
  useEffect(() => {
    document.title = "Insights — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Signals", value: "3 new", helper: "Updated today", tone: "positive" },
    { label: "Follow-ups", value: "2", helper: "Ready to run", tone: "neutral" },
    { label: "Digests", value: "2", helper: "Saved views", tone: "neutral" },
    { label: "Noise", value: "Filtered", helper: "Only critical", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Latest signals", description: "AI-curated insights by module.", items: insights },
    { title: "Follow-ups", description: "One-tap actions from those insights.", items: followUps },
    { title: "Recaps", description: "Short summaries you can reuse.", items: recaps },
  ];

  return (
    <ModuleTemplate
      icon={Sparkles}
      title="AI Insights"
      description="Arlo distills the noise into a handful of signals, suggested follow-ups, and reusable recaps."
      primaryAction="Run insight"
      secondaryAction="Send digest"
      stats={stats}
      sections={sections}
    />
  );
}

