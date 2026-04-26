import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Store } from "lucide-react";
import { formatCurrency } from "@/lib/finance/budgetMath";
import { getCategoryDef } from "@/lib/finance/categories";
import type { BudgetCategoryKey } from "@/lib/finance/categories";

interface TopMerchantsCardProps {
  merchants: { name: string; amount: number; count: number; key: BudgetCategoryKey }[];
}

export function TopMerchantsCard({ merchants }: TopMerchantsCardProps) {
  if (merchants.length === 0) return null;
  const max = merchants[0]?.amount || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="h-4 w-4" />
          Top merchants this month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {merchants.slice(0, 6).map(m => {
          const def = getCategoryDef(m.key);
          const pct = (m.amount / max) * 100;
          return (
            <div key={m.name} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base leading-none">{def.emoji}</span>
                  <span className="truncate font-medium">{m.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground tabular-nums">
                  <span>
                    {m.count} {m.count === 1 ? "txn" : "txns"}
                  </span>
                  <span className="font-semibold text-foreground">{formatCurrency(m.amount)}</span>
                </div>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: def.hex }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
