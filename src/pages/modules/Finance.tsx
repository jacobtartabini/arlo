import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import {
  cashFlowSignals,
  linkedAccounts,
  recurringWatchlist,
  upcomingBills,
} from "./finance/finance-data";
import { BarChart3, CreditCard, LineChart, PiggyBank, Radar, Sparkles } from "lucide-react";

export default function Finance() {
  useEffect(() => {
    document.title = "Finance — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    {
      label: "Net worth",
      value: "$124,650",
      helper: "+$4,230 this month",
      tone: "positive",
      trend: [118, 119, 120, 121, 122, 124, 125],
    },
    ...cashFlowSignals.map((signal) => ({
      label: signal.label,
      value: signal.value,
      helper: signal.delta,
      tone: (signal.tone === "good" ? "positive" : "negative") as "positive" | "negative",
      trend: signal.tone === "good" ? [12, 13, 14, 15] : [8, 7.5, 7],
    })),
  ];

  const sections: ModuleSection[] = [
    {
      title: "Financial posture",
      description: "A bespoke stack for this week: health of cash, spending mix, and signals Arlo is watching for you.",
      variant: "split",
      accent: "positive",
      items: [
        {
          title: "Cash runway",
          description: "Healthy buffer with room to invest without tightening essentials.",
          meta: "Runway: 7.4 months",
          badge: "Calm",
          tone: "positive",
          icon: <PiggyBank className="h-5 w-5" />,
          visual: { type: "progress", value: 74, label: "Safety threshold", tone: "positive" },
          spotlight: true,
        },
        {
          title: "Spending mix",
          description: "Balanced allocation across essentials, growth, lifestyle, and savings.",
          meta: "Essentials 38% · Savings 22%",
          icon: <BarChart3 className="h-5 w-5" />,
          visual: { type: "trend", points: [38, 32, 35, 38, 36], tone: "neutral" },
        },
        {
          title: "Signals on deck",
          description: "Only the anomalies that need a decision in the next 48 hours.",
          badge: "3 noted",
          icon: <Radar className="h-5 w-5" />,
          visual: { type: "pill", label: "Auto-pause Hulu?", tone: "info" },
        },
      ],
    },
    {
      title: "Upcoming decisions",
      description: "Bills, renewals, and holds with the default recommendation baked into each row.",
      items: upcomingBills.map((bill) => ({
        title: bill.vendor,
        description: `${bill.amount} due ${bill.due}`,
        badge: bill.status,
        tone: bill.status === "Review" ? "negative" : "neutral",
        icon: <CreditCard className="h-4 w-4" />,
        visual: bill.status === "Review" ? { type: "progress", value: 52, label: "Review flow" } : undefined,
      })),
    },
    {
      title: "Connections",
      description: "One glassy rail for everything linked. Sync health, balances, and quick fixes at a glance.",
      variant: "grid",
      items: linkedAccounts.map((account) => ({
        title: account.name,
        description: `${account.type} · ${account.balance}`,
        meta: account.lastSync,
        badge: account.status === "connected" ? "Synced" : account.status === "connect" ? "Connect" : "Relink",
        tone: account.status === "connected" ? "positive" : account.status === "connect" ? "info" : "negative",
        icon: <LineChart className="h-4 w-4" />,
      })),
    },
    {
      title: "Recurring watchlist",
      description: "Subscriptions Arlo is monitoring with suggested moves ready to apply.",
      items: recurringWatchlist.map((item) => ({
        title: item.merchant,
        description: `${item.amount} · ${item.status}`,
        badge: item.action,
        tone: item.action.includes("Cancel") ? "negative" : "info",
        icon: <Sparkles className="h-4 w-4" />,
        visual: item.action.includes("Pause")
          ? { type: "progress", value: 40, label: "Usage drop" }
          : { type: "pill", label: "Price check", tone: "info" },
      })),
    },
  ];

  return (
    <ModuleTemplate
      icon={LineChart}
      title="Finance"
      description="See your cash, credit, and investments in one quiet rollup with the next decisions front and center."
      primaryAction="Record a transaction"
      secondaryAction="Manage connections"
      accent="emerald"
      stats={stats.slice(0, 4)}
      sections={sections}
    />
  );
}
