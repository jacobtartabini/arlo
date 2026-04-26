import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import type { BudgetInsight } from "@/hooks/useBudgetInsights";
import { cn } from "@/lib/utils";

interface BudgetInsightsPanelProps {
  insights: BudgetInsight[];
}

const SEVERITY_STYLES: Record<BudgetInsight["severity"], string> = {
  alert: "border-l-destructive bg-destructive/5",
  warning: "border-l-amber-500 bg-amber-500/5",
  tip: "border-l-blue-500 bg-blue-500/5",
  info: "border-l-muted-foreground bg-muted/30",
  win: "border-l-emerald-500 bg-emerald-500/5",
};

export function BudgetInsightsPanel({ insights }: BudgetInsightsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          Insights & nudges
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All clear — nothing needs your attention right now.
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map(insight => (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 rounded-md border-l-2 px-3 py-2",
                  SEVERITY_STYLES[insight.severity],
                )}
              >
                <span className="mt-0.5 text-base leading-none">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
