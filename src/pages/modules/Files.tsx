import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { Folder } from "lucide-react";

const recentFiles = [
  { title: "Q2 roadmap.pdf", meta: "Updated 2h ago", badge: "Shared" },
  { title: "Investor brief.pptx", meta: "Edited yesterday", badge: "Review" },
  { title: "Notes - research.md", meta: "Synced from laptop", badge: "Synced" },
];

const sharedSpaces = [
  { title: "Design", meta: "12 people", badge: "Space" },
  { title: "Finance", meta: "6 people", badge: "Space" },
  { title: "Personal", meta: "Private", badge: "Private" },
];

const requests = [
  { title: "Upload receipts", description: "Waiting on 3 items", badge: "Request" },
  { title: "Share meeting recording", description: "Send by Friday", badge: "Reminder" },
];

export default function Files() {
  useEffect(() => {
    document.title = "Files — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Storage used", value: "68%", helper: "42 GB of 64 GB", tone: "neutral" },
    { label: "Sync", value: "Healthy", helper: "Last sync 3m ago", tone: "positive" },
    { label: "Shared", value: "18 files", helper: "3 awaiting review", tone: "neutral" },
    { label: "Alerts", value: "0 issues", helper: "All backups up to date", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Recents", description: "What you touched most recently.", items: recentFiles },
    { title: "Spaces", description: "Folders grouped by team or purpose.", items: sharedSpaces },
    { title: "Requests", description: "Quick asks from collaborators.", items: requests },
  ];

  return (
    <ModuleTemplate
      icon={Folder}
      title="Files"
      description="Clean storage with only the essentials: recent work, shared spaces, and what others need from you."
      primaryAction="Upload"
      secondaryAction="New space"
      stats={stats}
      sections={sections}
    />
  );
}

