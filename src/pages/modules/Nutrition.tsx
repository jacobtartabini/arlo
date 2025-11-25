import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import { UtensilsCrossed } from "lucide-react";

const meals = [
  { title: "Breakfast", description: "Oats + berries", badge: "Logged" },
  { title: "Lunch", description: "Grain bowl", badge: "Planned" },
  { title: "Dinner", description: "Salmon + greens", badge: "Planned" },
];

const targets = [
  { title: "Protein", description: "135g goal", badge: "On track" },
  { title: "Fiber", description: "28g so far", badge: "Add veggies" },
  { title: "Water", description: "72 oz", badge: "Keep sipping" },
];

const shopping = [
  { title: "Restock greens", description: "Spinach, arugula", badge: "Today" },
  { title: "Snacks", description: "Nuts, yogurt", badge: "Low" },
];

export default function Nutrition() {
  useEffect(() => {
    document.title = "Nutrition — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Calories", value: "1,280", helper: "Of 2,100", tone: "neutral" },
    { label: "Protein", value: "92g", helper: "Goal 135g", tone: "neutral" },
    { label: "Water", value: "72 oz", helper: "Goal 96 oz", tone: "neutral" },
    { label: "Prep", value: "2 meals planned", helper: "For today", tone: "positive" },
  ];

  const sections: ModuleSection[] = [
    { title: "Meals", description: "Plan and log without clutter.", items: meals },
    { title: "Targets", description: "Macros and basics worth watching.", items: targets },
    { title: "Shopping", description: "Quick list to keep stocked.", items: shopping },
  ];

  return (
    <ModuleTemplate
      icon={UtensilsCrossed}
      title="Nutrition"
      description="Simple meal planning, a few targets, and a tiny grocery list—all on one calm page."
      primaryAction="Add meal"
      secondaryAction="Share plan"
      stats={stats}
      sections={sections}
    />
  );
}

