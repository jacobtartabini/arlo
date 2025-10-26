import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Plus, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const transactions = [
  { id: 1, name: "Grocery Shopping", amount: -87.50, type: "expense", date: "Today" },
  { id: 2, name: "Salary Deposit", amount: 3500.00, type: "income", date: "Yesterday" },
  { id: 3, name: "Coffee Shop", amount: -12.80, type: "expense", date: "2 days ago" },
  { id: 4, name: "Gas Station", amount: -45.00, type: "expense", date: "3 days ago" },
];

export default function Budget() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Budget — Arlo";
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 spatial-grid opacity-30" />

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
            className="glass rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Budget</h1>
          </div>
        </div>
        <Button className="glass-intense">
          <Plus className="w-4 h-4 mr-2" />
          Add Transaction
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Balance Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Card className="glass-intense p-8">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <h2 className="text-4xl font-bold text-foreground">$2,340.50</h2>
                <p className="text-sm text-green-500 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  +12% from last month
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Transactions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Recent Transactions</h3>
            {transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="glass p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === "income" ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {transaction.type === "income" ? (
                          <TrendingUp className="w-6 h-6 text-green-500" />
                        ) : (
                          <TrendingDown className="w-6 h-6 text-red-500" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-foreground">{transaction.name}</h4>
                        <p className="text-sm text-muted-foreground">{transaction.date}</p>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${
                      transaction.type === "income" ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Floating Chat Bar */}
      <FloatingChatBar />
    </div>
  );
}
