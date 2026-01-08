import { motion } from "framer-motion";
import { Wallet, TrendingDown, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileModuleCard } from "../MobileModuleCard";

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
    <MobileModuleCard
      title="Finance"
      icon={Wallet}
      onClick={() => navigate("/finance")}
      actionLabel="Details"
      isCompact
    >
      {/* Spending overview */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Spent this month</p>
          <p className="text-xl font-bold text-foreground">
            {formatCurrency(monthlySpending)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">
            {isOverBudget ? "Over budget" : "Remaining"}
          </p>
          <p className={`text-sm font-medium ${isOverBudget ? "text-destructive" : "text-emerald-500"}`}>
            {isOverBudget ? "-" : ""}{formatCurrency(Math.abs(remaining))}
          </p>
        </div>
      </div>

      {/* Budget progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isOverBudget ? "bg-destructive" : "bg-emerald-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(budgetPercent, 100)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Recent transactions */}
      {recentTransactions.length > 0 && (
        <div className="space-y-1 pt-1">
          {recentTransactions.slice(0, 2).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground truncate flex-1">
                {tx.name}
              </span>
              <span className={`text-sm font-medium ${tx.amount < 0 ? "text-foreground" : "text-emerald-500"}`}>
                {tx.amount < 0 ? "-" : "+"}${Math.abs(tx.amount).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </MobileModuleCard>
  );
}
