import { motion, Variants } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CashFlowSignal } from "../finance-data";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

type SpendingSummaryCardProps = {
  signals: CashFlowSignal[];
};

export function SpendingSummaryCard({ signals }: SpendingSummaryCardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {signals.map((signal, index) => (
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={index} key={signal.label}>
          <Card className="glass p-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{signal.label}</span>
              <Badge
                variant="secondary"
                className={`border ${
                  signal.tone === "warn"
                    ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                    : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                }`}
              >
                {signal.delta}
              </Badge>
            </div>
            <p className="text-2xl font-semibold text-foreground">{signal.value}</p>
            <Progress value={signal.tone === "warn" ? 72 : 92} className="h-1.5" />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
