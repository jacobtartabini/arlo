import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TrendingDown, TrendingUp, Calendar as CalIcon } from "lucide-react";
import {
  formatCurrency,
  statusColor,
  statusLabel,
  type PacingResult,
} from "@/lib/finance/budgetMath";

interface BudgetOverviewCardProps {
  totalBudgeted: number;
  totalSpent: number;
  totalRemaining: number;
  pacing: PacingResult;
  month: number;
  year: number;
}

export function BudgetOverviewCard({
  totalBudgeted,
  totalSpent,
  totalRemaining,
  pacing,
  month,
  year,
}: BudgetOverviewCardProps) {
  const pct = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const dayCount = new Date(year, month, 0).getDate();
  const today = new Date().getDate();
  const isCurrentMonth =
    new Date().getMonth() + 1 === month && new Date().getFullYear() === year;
  const dayShown = isCurrentMonth ? today : dayCount;

  const status = pacing.status;
  const color = statusColor(status);
  const trendIcon =
    status === "ok" ? (
      <TrendingDown className="h-3.5 w-3.5" />
    ) : (
      <TrendingUp className="h-3.5 w-3.5" />
    );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Monthly budget · {monthLabel}
            </p>
            <p className="mt-1 text-3xl font-bold">
              {formatCurrency(totalSpent)}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {formatCurrency(totalBudgeted)}
              </span>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {totalRemaining > 0
                ? `${formatCurrency(totalRemaining)} left to spend`
                : `${formatCurrency(Math.abs(totalBudgeted - totalSpent))} over budget`}
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalIcon className="h-3.5 w-3.5" />
              Day {dayShown} of {dayCount}
            </div>
            <Badge
              variant="outline"
              className="gap-1 border-0 px-2.5 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: `${color}1a`, color }}
            >
              {trendIcon}
              {statusLabel(status, pacing.pace)}
            </Badge>
          </div>
        </div>

        {totalBudgeted > 0 ? (
          <div className="space-y-2">
            <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
              {/* Pace marker */}
              <div
                className="absolute inset-y-0 w-px bg-foreground/40"
                style={{ left: `${Math.min(100, pacing.periodElapsed * 100)}%` }}
                title="Expected pace"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(pct)}% spent</span>
              <span>Pace mark: {Math.round(pacing.periodElapsed * 100)}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No budget set yet — add categories below to start tracking.
          </p>
        )}

        {totalBudgeted > 0 && (
          <p className="text-xs text-muted-foreground">
            At this rate, you'll spend ~{formatCurrency(pacing.projected)} by month end.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
