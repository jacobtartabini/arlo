import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Wallet } from "lucide-react";

const categories = [
  { title: "Essentials", description: "38% of budget", badge: "On track" },
  { title: "Growth", description: "22% of budget", badge: "Room left" },
  { title: "Lifestyle", description: "18% of budget", badge: "Watch" },
  { title: "Savings", description: "22% of budget", badge: "Ahead" },
];

const envelopes = [
  { title: "Rent", description: "$1,280 · due May 1", badge: "Auto-pay" },
  { title: "Groceries", description: "$420 remaining", badge: "Weekly" },
  { title: "Subscriptions", description: "$62 pending", badge: "Review" },
];

const adjustments = [
  { title: "Shift $100 from lifestyle", description: "Cover upcoming travel", badge: "Suggestion" },
  { title: "Pause Hulu", description: "Unused for 3 weeks", badge: "Action" },
];

export default function Budget() {
  useEffect(() => {
    document.title = "Budget — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Month to date", value: "$4,230", helper: "Under pace", tone: "positive" },
    { label: "Remaining", value: "$2,140", helper: "Across envelopes", tone: "neutral" },
    { label: "Savings", value: "22%", helper: "Target 20%", tone: "positive" },
    { label: "Alerts", value: "1", helper: "Needs review", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    { title: "Categories", description: "Simple percentages by theme.", items: categories },
    { title: "Envelopes", description: "Specific holds to keep spending calm.", items: envelopes },
    { title: "Adjustments", description: "Arlo’s suggestions to stay aligned.", items: adjustments },
  ];

  return (
    <ModuleTemplate
      icon={Wallet}
      title="Budget"
      description="A streamlined budget: a few categories, the envelopes that matter, and gentle nudges to stay on pace."
      primaryAction="Add envelope"
      secondaryAction="Export report"
      stats={stats}
      sections={sections}
    />
  );
}

