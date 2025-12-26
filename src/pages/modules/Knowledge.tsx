import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { BookOpen } from "lucide-react";

const collections = [
  { title: "Product", description: "Research, specs, and decisions", badge: "12 docs" },
  { title: "Engineering", description: "Runbooks and checklists", badge: "18 docs" },
  { title: "Personal", description: "Notes and references", badge: "7 docs" },
];

const highlights = [
  { title: "AI pairing notes", description: "Key takeaways from last session", badge: "Updated" },
  { title: "Billing changes", description: "Steps to adjust invoices", badge: "Pinned" },
  { title: "Travel packing", description: "One list across trips", badge: "Pinned" },
];

const requests = [
  { title: "Share onboarding guide", description: "Requested by Mia", badge: "Pending" },
  { title: "Add security FAQ", description: "People ask this often", badge: "Suggested" },
];

export default function Knowledge() {
  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Collections", value: "3", helper: "Curated sets", tone: "neutral" },
    { label: "Documents", value: "37", helper: "With search", tone: "neutral" },
    { label: "Highlights", value: "2 pinned", helper: "Stay visible", tone: "positive" },
    { label: "Requests", value: "1 pending", helper: "From teammates", tone: "neutral" },
  ];

  const sections: ModuleSection[] = [
    { title: "Collections", description: "Lightweight spaces to keep things tidy.", items: collections },
    { title: "Highlights", description: "Pages Arlo keeps surfaced.", items: highlights },
    { title: "Requests", description: "What people asked you to share.", items: requests },
  ];

  return (
    <ModuleTemplate
      icon={BookOpen}
      title="Knowledge"
      description="A simple library: a few collections, highlighted pages, and the requests waiting on you."
      primaryAction="New note"
      secondaryAction="Share collection"
      stats={stats}
      sections={sections}
    />
  );
}

