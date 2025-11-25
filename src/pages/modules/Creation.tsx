import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { PenLine } from "lucide-react";

const drafts = [
  { title: "Investor update", description: "Outline ready", badge: "Draft" },
  { title: "Landing page", description: "Copy in review", badge: "Review" },
  { title: "User interview notes", description: "Summaries generated", badge: "Ready" },
];

const assets = [
  { title: "Logo set", description: "For press kit", badge: "Shared" },
  { title: "Screenshots", description: "Latest build", badge: "Updated" },
];

const requests = [
  { title: "Record walkthrough", description: "Send by Friday", badge: "Request" },
  { title: "Polish onboarding copy", description: "Shorten empty states", badge: "Suggested" },
];

export default function Creation() {
  useEffect(() => {
    document.title = "Creation — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Drafts", value: "3", helper: "In progress", tone: "neutral" },
    { label: "Reviews", value: "1", helper: "Needs feedback", tone: "neutral" },
    { label: "Assets", value: "2 sets", helper: "Up to date", tone: "positive" },
    { label: "Requests", value: "2", helper: "From team", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    { title: "Drafts", description: "Work you’re shaping right now.", items: drafts },
    { title: "Assets", description: "Supporting visuals and files.", items: assets },
    { title: "Requests", description: "Asks from others so you can prioritize.", items: requests },
  ];

  return (
    <ModuleTemplate
      icon={PenLine}
      title="Creation"
      description="A focused desk for writing and recording—drafts, assets, and the asks you owe."
      primaryAction="Start new"
      secondaryAction="Share draft"
      stats={stats}
      sections={sections}
    />
  );
}

