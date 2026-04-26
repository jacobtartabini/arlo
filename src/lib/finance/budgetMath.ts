/**
 * Budget pacing, projection, and status helpers.
 */

export type BudgetStatus = "ok" | "warn" | "over" | "exceeded";

export interface PacingResult {
  /** 0..1 — fraction of period elapsed */
  periodElapsed: number;
  /** 0..1 — fraction of budget spent (can exceed 1) */
  spentFraction: number;
  /** Difference (spentFraction - periodElapsed). Positive = ahead of pace */
  pace: number;
  /** Projected total spend for the full period at current rate */
  projected: number;
  status: BudgetStatus;
}

export function periodBounds(year: number, month: number): { start: Date; end: Date; days: number } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // last day of month
  return { start, end, days: end.getDate() };
}

export function dayOfPeriod(date: Date, year: number, month: number): number {
  const { days } = periodBounds(year, month);
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
    // outside period: clamp
    if (date < new Date(year, month - 1, 1)) return 0;
    return days;
  }
  return date.getDate();
}

export function calcPacing(
  spent: number,
  budget: number,
  year: number,
  month: number,
  now: Date = new Date(),
): PacingResult {
  const { days } = periodBounds(year, month);
  const day = Math.max(1, Math.min(days, dayOfPeriod(now, year, month) || days));
  const periodElapsed = day / days;
  const spentFraction = budget > 0 ? spent / budget : 0;
  const pace = spentFraction - periodElapsed;
  const projected = budget > 0 && periodElapsed > 0 ? spent / periodElapsed : spent;

  let status: BudgetStatus;
  if (spentFraction >= 1) status = "exceeded";
  else if (pace > 0.15) status = "over";
  else if (pace > 0.05 || spentFraction > 0.85) status = "warn";
  else status = "ok";

  return { periodElapsed, spentFraction, pace, projected, status };
}

export function statusColor(status: BudgetStatus): string {
  switch (status) {
    case "exceeded":
      return "hsl(var(--destructive))";
    case "over":
      return "#ef4444";
    case "warn":
      return "#f59e0b";
    case "ok":
    default:
      return "#10b981";
  }
}

export function statusLabel(status: BudgetStatus, pace: number): string {
  switch (status) {
    case "exceeded":
      return "Over budget";
    case "over":
      return `${Math.round(pace * 100)}% over pace`;
    case "warn":
      return "Approaching limit";
    case "ok":
    default:
      return pace < -0.05 ? `${Math.round(Math.abs(pace) * 100)}% under pace` : "On pace";
  }
}

export function formatCurrency(amount: number, opts?: { showCents?: boolean }): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts?.showCents === false ? 0 : 2,
    maximumFractionDigits: opts?.showCents === false ? 0 : 2,
  }).format(amount);
}

/**
 * Suggest a monthly budget from average historical spend.
 * We round down 10% so the goal nudges spend lower than the baseline.
 */
export function suggestBudget(monthlyAverage: number): number {
  if (monthlyAverage <= 0) return 0;
  const target = monthlyAverage * 0.9;
  // Round to nearest $10 for amounts < $1000, else nearest $50
  if (target < 1000) return Math.max(10, Math.round(target / 10) * 10);
  return Math.round(target / 50) * 50;
}
