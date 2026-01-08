import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  name: string;
  amount: number;
}

interface MobileFinanceCardProps {
  monthlySpending: number;
  monthlyBudget: number;
  recentTransactions: Transaction[];
}

export function MobileFinanceCard({
  monthlySpending,
  monthlyBudget,
  recentTransactions,
}: MobileFinanceCardProps) {
  const navigate = useNavigate();
  const budgetPercent = monthlyBudget > 0 ? (monthlySpending / monthlyBudget) * 100 : 0;
  const remaining = monthlyBudget - monthlySpending;
  const isOverBudget = remaining < 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate("/finance")}
      className="rounded-2xl bg-card border border-border/50 p-4 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-semibold text-foreground">Finance</h3>
        <span className="text-[12px] font-medium text-primary">Details</span>
      </div>

      {/* Main spending display */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[12px] text-muted-foreground mb-0.5">Spent this month</p>
          <p className="text-[24px] font-bold text-foreground tracking-tight">
            {formatCurrency(monthlySpending)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] text-muted-foreground mb-0.5">
            {isOverBudget ? "Over budget" : "Remaining"}
          </p>
          <p className={cn(
            "text-[15px] font-semibold",
            isOverBudget ? "text-destructive" : "text-emerald-500"
          )}>
            {isOverBudget && "-"}{formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isOverBudget ? "bg-destructive" : "bg-emerald-500"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-border/50">
          {recentTransactions.slice(0, 2).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between">
              <span className="text-[13px] text-muted-foreground truncate flex-1 mr-3">
                {tx.name}
              </span>
              <div className="flex items-center gap-1">
                {tx.amount < 0 ? (
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                )}
                <span className={cn(
                  "text-[13px] font-medium",
                  tx.amount < 0 ? "text-foreground" : "text-emerald-500"
                )}>
                  {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
