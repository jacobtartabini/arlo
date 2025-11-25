import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CircleDashed, PiggyBank, TrendingUp } from "lucide-react";

type NetWorthChartProps = {
  data: number[];
};

export function NetWorthChart({ data }: NetWorthChartProps) {
  return (
    <Card className="glass p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">Spending pace</h2>
            <p className="text-xs text-muted-foreground">Month-over-month bar view inspired by Rocket Money.</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
          <TrendingUp className="w-4 h-4" /> +12% savings
        </Badge>
      </div>

      <div className="h-32 grid grid-cols-12 gap-1">
        {data.map((value, index) => (
          <motion.div
            key={index}
            initial={{ height: 0 }}
            animate={{ height: `${Math.min(100, (value / 700) * 100)}%` }}
            transition={{ delay: index * 0.04, type: "spring", stiffness: 120 }}
            className={`rounded-sm ${index >= 9 ? "bg-primary" : "bg-primary/50"}`}
            title={`Month ${index + 1}: $${value}`}
          />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-primary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <CircleDashed className="w-4 h-4 text-primary" />
        Rocket-style digest: no surprises detected; next best action is to move $420 to savings.
      </div>
    </Card>
  );
}
