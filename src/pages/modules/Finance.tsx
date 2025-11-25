import { useEffect } from "react";
import { ModuleTemplate, type ModuleSection, type ModuleStat } from "@/components/ModuleTemplate";
import {
  cashFlowSignals,
  linkedAccounts,
  recurringWatchlist,
  spendingInsights,
  upcomingBills,
} from "./finance/finance-data";
import { LineChart } from "lucide-react";

export default function Finance() {
  useEffect(() => {
    document.title = "Finance — Arlo";
  }, []);

  const stats: ModuleStat[] = [
    { label: "Net worth", value: "$124,650", helper: "+$4,230 this month", tone: "positive" },
    ...cashFlowSignals.map((signal) => ({
      label: signal.label,
      value: signal.value,
      helper: signal.delta,
      tone: signal.tone === "good" ? "positive" : "negative",
    })),
  ];

  const sections: ModuleSection[] = [
    {
      title: "Spending highlights",
      description: "Where your money is flowing right now and the mix across needs, wants, and savings.",
      items: spendingInsights.map((segment) => ({
        title: segment.label,
        description: `${segment.value}% of monthly spend`,
        badge: segment.value >= 30 ? "On watch" : "Stable",
      })),
      span: 7,
    },
    {
      title: "Upcoming bills",
      description: "What’s due next so you can stay ahead of auto-pays and reviews.",
      items: upcomingBills.map((bill) => ({
        title: bill.vendor,
        description: `${bill.amount} due ${bill.due}`,
        badge: bill.status,
      })),
      span: 5,
    },
    {
      title: "Linked accounts",
      description: "Connections across cash, credit, and investments.",
      items: linkedAccounts.map((account) => ({
        title: account.name,
        description: `${account.type} · ${account.balance}`,
        meta: account.lastSync,
        badge: account.status === "connected" ? "Synced" : account.status === "connect" ? "Connect" : "Relink",
      })),
      span: 6,
    },
    {
      title: "Recurring charges",
      description: "Subscriptions Arlo is watching for price changes or pauses.",
      items: recurringWatchlist.map((item) => ({
        title: item.merchant,
        description: `${item.amount} · ${item.status}`,
        badge: item.action,
      })),
      span: 6,
    },
  ];

  return (
    <ModuleTemplate
      icon={LineChart}
      title="Finance"
      description="See your cash, credit, and investments in one quiet rollup with the next decisions front and center."
      primaryAction="Record a transaction"
      secondaryAction="Manage connections"
      stats={stats.slice(0, 4)}
      sections={sections}
    />
  );
}

