import { useEffect, useMemo, useState, useCallback } from "react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import {
  BUDGET_CATEGORIES,
  BudgetCategoryKey,
  categorizeTransaction,
  getCategoryDef,
} from "@/lib/finance/categories";
import { calcPacing, PacingResult, suggestBudget } from "@/lib/finance/budgetMath";

export interface BudgetCategoryState {
  key: BudgetCategoryKey;
  label: string;
  emoji: string;
  hex: string;
  budgetId: string | null;
  budgeted: number;
  spent: number;
  remaining: number;
  pacing: PacingResult;
  carryover: number;
}

export interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  pacing: PacingResult;
  categories: BudgetCategoryState[];
  unbudgetedSpend: { key: BudgetCategoryKey; amount: number }[];
  topMerchants: { name: string; amount: number; count: number; key: BudgetCategoryKey }[];
  monthlyAverages: Map<BudgetCategoryKey, number>;
  loading: boolean;
  refresh: () => Promise<void>;
}

interface UseBudgetDataOptions {
  month?: number; // 1-12
  year?: number;
}

export function useBudgetData(opts: UseBudgetDataOptions = {}): BudgetSummary {
  const { getBudgets, getTransactions } = useFinancePersistence();
  const now = useMemo(() => new Date(), []);
  const month = opts.month ?? now.getMonth() + 1;
  const year = opts.year ?? now.getFullYear();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStart = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return d.toISOString().split("T")[0];
  }, [year, month]);
  const monthEnd = useMemo(() => {
    const d = new Date(year, month, 0);
    return d.toISOString().split("T")[0];
  }, [year, month]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t, h] = await Promise.all([
        getBudgets(month, year),
        getTransactions({ startDate: monthStart, endDate: monthEnd, limit: 500 }),
        // last 90 days for averages/suggestions
        getTransactions({
          startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          limit: 1000,
        }),
      ]);
      setBudgets(b ?? []);
      setTransactions(t ?? []);
      setHistory(h ?? []);
    } finally {
      setLoading(false);
    }
  }, [getBudgets, getTransactions, month, year, monthStart, monthEnd]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo<Omit<BudgetSummary, "loading" | "refresh">>(() => {
    // bucket current-month transactions by friendly category
    const spendByKey = new Map<BudgetCategoryKey, number>();
    const merchantTotals = new Map<string, { amount: number; count: number; key: BudgetCategoryKey }>();

    for (const tx of transactions) {
      if (typeof tx.amount !== "number") continue;
      // Plaid: positive = money out (spend); negative = money in (income/refund)
      if (tx.amount <= 0) continue;
      const key = categorizeTransaction(tx);
      spendByKey.set(key, (spendByKey.get(key) ?? 0) + tx.amount);

      const def = getCategoryDef(key);
      if (def.countsAsSpend) {
        const merchant = (tx.merchant_name || tx.name || "Unknown").toString();
        const cur = merchantTotals.get(merchant) ?? { amount: 0, count: 0, key };
        cur.amount += tx.amount;
        cur.count += 1;
        cur.key = key;
        merchantTotals.set(merchant, cur);
      }
    }

    // monthly averages from 90-day history (per category)
    const histByKeyMonth = new Map<BudgetCategoryKey, number>();
    for (const tx of history) {
      if (typeof tx.amount !== "number" || tx.amount <= 0) continue;
      const key = categorizeTransaction(tx);
      histByKeyMonth.set(key, (histByKeyMonth.get(key) ?? 0) + tx.amount);
    }
    const averages = new Map<BudgetCategoryKey, number>();
    for (const [k, total] of histByKeyMonth.entries()) {
      averages.set(k, total / 3); // 90 days ≈ 3 months
    }

    // build category rows: every budget gets a row; ordered by budget amount desc
    const rows: BudgetCategoryState[] = budgets.map((b: any) => {
      const def = getCategoryDef(b.category);
      const budgeted = Number(b.amount) || 0;
      const carryover = Number(b.carryover_amount) || 0;
      const effective = budgeted + carryover;
      const spent = spendByKey.get(def.key) ?? 0;
      const pacing = calcPacing(spent, effective || budgeted, year, month, now);
      return {
        key: def.key,
        label: def.label,
        emoji: def.emoji,
        hex: def.hex,
        budgetId: b.id,
        budgeted,
        spent,
        remaining: Math.max(0, effective - spent),
        pacing,
        carryover,
      };
    });

    rows.sort((a, b) => b.budgeted - a.budgeted);

    // any spend categories that don't have a budget
    const budgetedKeys = new Set(rows.map(r => r.key));
    const unbudgeted: { key: BudgetCategoryKey; amount: number }[] = [];
    for (const [key, amount] of spendByKey.entries()) {
      const def = getCategoryDef(key);
      if (!def.countsAsSpend) continue;
      if (budgetedKeys.has(key)) continue;
      if (amount <= 0) continue;
      unbudgeted.push({ key, amount });
    }
    unbudgeted.sort((a, b) => b.amount - a.amount);

    // total spent should exclude transfers/loans
    const totalSpent = Array.from(spendByKey.entries())
      .filter(([k]) => getCategoryDef(k).countsAsSpend)
      .reduce((s, [, v]) => s + v, 0);
    const totalBudgeted = rows.reduce((s, r) => s + r.budgeted + r.carryover, 0);
    const totalRemaining = Math.max(0, totalBudgeted - totalSpent);
    const overallPacing = calcPacing(totalSpent, totalBudgeted, year, month, now);

    const topMerchants = Array.from(merchantTotals.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return {
      totalBudgeted,
      totalSpent,
      totalRemaining,
      pacing: overallPacing,
      categories: rows,
      unbudgetedSpend: unbudgeted,
      topMerchants,
      monthlyAverages: averages,
    };
  }, [budgets, transactions, history, year, month, now]);

  return { ...summary, loading, refresh };
}

/** Suggested budgets from spending history, used by the setup wizard. */
export interface SuggestedBudget {
  key: BudgetCategoryKey;
  label: string;
  emoji: string;
  averageMonthly: number;
  suggested: number;
}

export function useBudgetSuggestions(): {
  suggestions: SuggestedBudget[];
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const { getTransactions } = useFinancePersistence();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const t = await getTransactions({ startDate, limit: 1000 });
      setTransactions(t ?? []);
    } finally {
      setLoading(false);
    }
  }, [getTransactions]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const suggestions = useMemo<SuggestedBudget[]>(() => {
    const totals = new Map<BudgetCategoryKey, number>();
    for (const tx of transactions) {
      if (typeof tx.amount !== "number" || tx.amount <= 0) continue;
      const k = categorizeTransaction(tx);
      const def = getCategoryDef(k);
      if (!def.countsAsSpend) continue;
      totals.set(k, (totals.get(k) ?? 0) + tx.amount);
    }
    const out: SuggestedBudget[] = BUDGET_CATEGORIES.filter(c => c.countsAsSpend).map(def => {
      const total = totals.get(def.key) ?? 0;
      const avg = total / 3;
      return {
        key: def.key,
        label: def.label,
        emoji: def.emoji,
        averageMonthly: avg,
        suggested: suggestBudget(avg),
      };
    });
    return out
      .filter(s => s.averageMonthly > 5)
      .sort((a, b) => b.averageMonthly - a.averageMonthly);
  }, [transactions]);

  return { suggestions, loading, refresh };
}
