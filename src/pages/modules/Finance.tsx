import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  PiggyBank,
  Upload,
  Gift,
  Receipt,
  LineChart
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const monthlySpending = [620, 540, 580, 610, 560, 640, 590, 630, 670, 610, 580, 550];
const categories = [
  { name: "Housing", value: 35 },
  { name: "Food", value: 22 },
  { name: "Transport", value: 12 },
  { name: "Lifestyle", value: 18 },
  { name: "Savings", value: 13 }
];
const portfolio = [
  { asset: "Index Fund", allocation: "45%", change: "+3.4%" },
  { asset: "Crypto", allocation: "18%", change: "+1.2%" },
  { asset: "Cash", allocation: "22%", change: "+0.4%" },
  { asset: "Alternatives", allocation: "15%", change: "-0.8%" }
];
const receipts = [
  { id: "#2543", vendor: "Whole Foods", total: "$84.21", status: "Auto-tagged" },
  { id: "#2542", vendor: "Uber", total: "$26.40", status: "Categorized" },
  { id: "#2539", vendor: "Apple", total: "$9.99", status: "Subscription" }
];
const giftCards = [
  { vendor: "Airbnb", balance: "$120.00", renews: "Aug 12" },
  { vendor: "Spotify", balance: "$24.00", renews: "May 3" },
  { vendor: "Adobe", balance: "$56.00", renews: "Jun 18" }
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Finance() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Finance — Arlo";
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Finance</h1>
              <p className="text-sm text-muted-foreground">Manage your budgets, assets, and receipts in one place.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Upload className="w-4 h-4 mr-2" />
          Sync Accounts
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              <Card className="glass-intense p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">Budgeting</h2>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    +12% savings
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-3">Monthly spend vs budget</p>
                  <div className="h-32 grid grid-cols-12 gap-1">
                    {monthlySpending.map((value, index) => (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.min(100, (value / 700) * 100)}%` }}
                        transition={{ delay: index * 0.05, type: "spring", stiffness: 120 }}
                        className={`rounded-sm ${index >= 9 ? "bg-primary" : "bg-primary/50"}`}
                        title={`Month ${index + 1}: $${value}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid gap-3">
                  {categories.map((category) => (
                    <div key={category.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{category.name}</span>
                        <span className="text-muted-foreground">{category.value}%</span>
                      </div>
                      <Progress value={category.value} className="h-1.5" />
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/40 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Goal setting</p>
                    <p className="text-xs text-muted-foreground">Emergency fund at 68% — add $420 to stay on track.</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Adjust goals
                  </Button>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <PiggyBank className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Asset Management</h2>
                    <p className="text-sm text-muted-foreground">Portfolio view and net worth trajectory.</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Net worth trend</p>
                      <p className="text-lg font-semibold text-foreground">$128,450</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      <TrendingUp className="w-3 h-3 mr-1" /> 4.2%
                    </Badge>
                  </div>
                  <div className="h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-md relative overflow-hidden">
                    <motion.div
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="absolute inset-0"
                    >
                      <svg viewBox="0 0 300 120" className="w-full h-full">
                        <defs>
                          <linearGradient id="networth" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 80 C40 40, 80 60, 120 42 C160 32, 200 62, 240 30 C270 18, 300 32, 300 32"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M0 120 L0 80 C40 40, 80 60, 120 42 C160 32, 200 62, 240 30 C270 18, 300 32, 300 32 L300 120 Z"
                          fill="url(#networth)"
                        />
                      </svg>
                    </motion.div>
                  </div>
                  <div className="grid gap-2">
                    {portfolio.map((item) => (
                      <div key={item.asset} className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{item.asset}</span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{item.allocation}</span>
                          <span className={item.change.startsWith("-") ? "text-rose-400" : "text-emerald-400"}>{item.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Receipt Scanning</h2>
                      <p className="text-sm text-muted-foreground">Upload, categorize, and store receipts automatically.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <div className="h-28 rounded-lg border border-dashed border-border/50 bg-muted/20 flex flex-col items-center justify-center text-sm text-muted-foreground">
                  <Upload className="w-5 h-5 mb-2" />
                  Drag & drop or browse files
                </div>
                <div className="space-y-3">
                  {receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground font-medium">{receipt.vendor}</p>
                        <p className="text-xs text-muted-foreground">{receipt.id}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{receipt.total}</span>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {receipt.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <Card className="glass p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Gift Cards & Subscriptions</h2>
                    <p className="text-sm text-muted-foreground">Keep track of balances, renewals, and perks.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {giftCards.map((item) => (
                    <div key={item.vendor} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="text-foreground font-medium">{item.vendor}</p>
                        <p className="text-xs text-muted-foreground">Renews {item.renews}</p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {item.balance}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-border/40 p-4 flex items-center gap-3">
                  <LineChart className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Smart renewal reminders</p>
                    <p className="text-xs text-muted-foreground">AI monitors price changes and unused credits for action.</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
