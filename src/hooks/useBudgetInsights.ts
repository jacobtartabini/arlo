import { useMemo } from "react";
import type { BudgetSummary } from "@/hooks/useBudgetData";
import { getCategoryDef } from "@/lib/finance/categories";
import { formatCurrency } from "@/lib/finance/budgetMath";

export type InsightSeverity = "info" | "tip" | "warning" | "alert" | "win";

export interface BudgetInsight {
  id: string;
  severity: InsightSeverity;
  icon: string;
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
}

interface UseBudgetInsightsArgs {
  summary: BudgetSummary;
  subscriptions: any[];
  transactions: any[];
  giftCards: any[];
}

export function useBudgetInsights({
  summary,
  subscriptions,
  transactions,
  giftCards,
}: UseBudgetInsightsArgs): BudgetInsight[] {
  return useMemo(() => {
    const out: BudgetInsight[] = [];

    // 1. Overspend / pace warnings per category
    for (const cat of summary.categories) {
      if (cat.pacing.status === "exceeded") {
        out.push({
          id: `over-${cat.key}`,
          severity: "alert",
          icon: "🔴",
          title: `${cat.label} is over budget`,
          detail: `Spent ${formatCurrency(cat.spent)} of ${formatCurrency(cat.budgeted)} this month.`,
        });
      } else if (cat.pacing.status === "over") {
        out.push({
          id: `pace-${cat.key}`,
          severity: "warning",
          icon: "⚠️",
          title: `${cat.label} spending is faster than planned`,
          detail: `Projected to hit ${formatCurrency(cat.pacing.projected)} by month end (budget ${formatCurrency(cat.budgeted)}).`,
        });
      }
    }

    // 2. Categories with no budget but real spend
    for (const item of summary.unbudgetedSpend.slice(0, 3)) {
      const def = getCategoryDef(item.key);
      if (item.amount < 50) continue;
      out.push({
        id: `missing-${item.key}`,
        severity: "tip",
        icon: "💡",
        title: `Set a budget for ${def.label}`,
        detail: `You've spent ${formatCurrency(item.amount)} on ${def.label.toLowerCase()} this month with no limit set.`,
      });
    }

    // 3. Subscriptions you haven't used (no related merchant txns in last 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const recentMerchants = new Set(
      transactions
        .filter(t => t.date >= sixtyDaysAgo)
        .map(t => (t.merchant_name || t.name || "").toLowerCase())
        .filter(Boolean),
    );
    for (const sub of subscriptions.filter(s => s.is_active)) {
      const name = (sub.merchant_name || "").toLowerCase();
      if (!name) continue;
      const seen = Array.from(recentMerchants).some(m => m.includes(name) || name.includes(m));
      if (!seen && sub.amount >= 5) {
        out.push({
          id: `unused-sub-${sub.id}`,
          severity: "tip",
          icon: "🧹",
          title: `Cancel ${sub.merchant_name}?`,
          detail: `${formatCurrency(sub.amount)}/${(sub.frequency || "month").toLowerCase()} — no recent activity in 60 days.`,
        });
      }
      if (sub.price_increased) {
        out.push({
          id: `price-up-${sub.id}`,
          severity: "warning",
          icon: "📈",
          title: `${sub.merchant_name} raised its price`,
          detail: `Now ${formatCurrency(sub.amount)}${sub.previous_amount ? ` (was ${formatCurrency(sub.previous_amount)})` : ""}.`,
        });
      }
    }

    // 4. Gift card free money
    const totalGift = giftCards.reduce((s, c) => s + (c.current_balance || 0), 0);
    if (totalGift >= 25) {
      out.push({
        id: "gift-balance",
        severity: "tip",
        icon: "🎁",
        title: `Use your gift cards`,
        detail: `${formatCurrency(totalGift)} in unused balances — pay with these before cash.`,
      });
    }

    // 5. Wins — under pace overall
    if (summary.totalBudgeted > 0 && summary.pacing.status === "ok" && summary.pacing.pace < -0.1) {
      out.push({
        id: "win-on-track",
        severity: "win",
        icon: "✅",
        title: "You're spending less than planned",
        detail: `${Math.round(Math.abs(summary.pacing.pace) * 100)}% under pace this month — keep it up.`,
      });
    }

    // Cap to a reasonable number, prioritizing alerts/warnings
    const order: Record<InsightSeverity, number> = {
      alert: 0,
      warning: 1,
      tip: 2,
      info: 3,
      win: 4,
    };
    return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 6);
  }, [summary, subscriptions, transactions, giftCards]);
}
