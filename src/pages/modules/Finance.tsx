import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  CreditCard,
  Gift,
  Link2,
  LineChart,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Wallet
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const linkedAccounts = [
  { name: "Chase Checking", type: "Primary", balance: "$4,820", status: "connected", lastSync: "2m ago" },
  { name: "Amex Gold", type: "Credit", balance: "-$1,240", status: "connected", lastSync: "5m ago" },
  { name: "Robinhood", type: "Investments", balance: "$12,450", status: "connect", lastSync: "Connect with Plaid" },
  { name: "Venmo", type: "Wallet", balance: "$180", status: "relink", lastSync: "Relink required" }
];

const recurringWatchlist = [
  { merchant: "Apple One", amount: "$31.90/mo", status: "Due Apr 29", action: "Pause suggestion" },
  { merchant: "Notion", amount: "$18.00/mo", status: "Annual save $24", action: "Switch billing" },
  { merchant: "Hulu", amount: "$12.99/mo", status: "Unused 3 weeks", action: "Cancel in-app" }
];

const cashFlowSignals = [
  { label: "Cash on hand", value: "$18,230", delta: "+$620", tone: "good" },
  { label: "MTD spending", value: "$3,420", delta: "-8% vs last month", tone: "good" },
  { label: "Upcoming bills", value: "$2,140", delta: "$640 due this week", tone: "warn" }
];

const upcomingBills = [
  { vendor: "Workspace Lease", amount: "$1,280.00", due: "May 1", status: "Auto-pay" },
  { vendor: "Cloud Services", amount: "$310.00", due: "May 3", status: "Review" },
  { vendor: "Design Tools", amount: "$42.00", due: "Apr 28", status: "Scheduled" }
];

const spendingInsights = [
  { label: "Essentials", value: 38, color: "var(--primary)" },
  { label: "Growth", value: 22, color: "var(--chart-1, #34d399)" },
  { label: "Lifestyle", value: 18, color: "var(--chart-2, #60a5fa)" },
  { label: "Savings", value: 22, color: "var(--chart-3, #fbbf24)" }
];

const monthlySpending = [620, 540, 580, 610, 560, 640, 590, 630, 670, 610, 580, 550];

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
              <p className="text-sm text-muted-foreground">Rocket Money-inspired clarity with Plaid-powered syncing.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="glass border-emerald-500/30 text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Live sync
          </Badge>
          <Button className="glass-intense" size="sm">
            <Upload className="w-4 h-4 mr-2" /> Link with Plaid
          </Button>
        </div>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {cashFlowSignals.map((signal, index) => (
              <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={index} key={signal.label}>
                <Card className="glass p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{signal.label}</span>
                    <Badge
                      variant="secondary"
                      className={`border ${signal.tone === "warn" ? "border-amber-500/40 text-amber-400 bg-amber-500/10" : "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"}`}
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

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
              <Card className="glass-intense p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Link accounts securely</h2>
                      <p className="text-sm text-muted-foreground">Plaid connects your banks in seconds.</p>
                    </div>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" /> One-tap sync
                  </Badge>
                </div>

                <div className="rounded-lg border border-dashed border-primary/20 p-4 space-y-3 bg-muted/10">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Link2 className="w-4 h-4 text-primary" />
                    Connect checking, credit, and investments to unlock full tracking.
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div className="rounded-md border border-border/40 p-3 flex flex-col gap-1">
                      <p className="text-foreground font-medium">Checking</p>
                      <span>Balances, cash flow</span>
                    </div>
                    <div className="rounded-md border border-border/40 p-3 flex flex-col gap-1">
                      <p className="text-foreground font-medium">Credit</p>
                      <span>Due dates, autopay</span>
                    </div>
                    <div className="rounded-md border border-border/40 p-3 flex flex-col gap-1">
                      <p className="text-foreground font-medium">Investments</p>
                      <span>Holdings, net worth</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button className="glass-intense" size="sm">
                      <ShieldCheck className="w-4 h-4 mr-2" /> Continue with Plaid
                    </Button>
                    <p className="text-xs text-muted-foreground">Bank-grade encryption. 2-minute setup.</p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1} className="lg:col-span-2">
              <Card className="glass p-6 space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Accounts at a glance</h2>
                      <p className="text-sm text-muted-foreground">Clean, Rocket Money-style rollup of every balance.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> Net worth +4.2%
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  {linkedAccounts.map((account) => (
                    <div
                      key={account.name}
                      className="rounded-lg border border-border/40 p-4 bg-muted/30 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground font-medium">{account.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            account.status === "connected"
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : account.status === "relink"
                                ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                                : "border-primary/40 text-primary bg-primary/10"
                          }
                        >
                          {account.status === "connected" ? "Synced" : account.status === "relink" ? "Relink" : "Connect"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{account.type} • {account.lastSync}</p>
                      <p className="text-lg font-semibold text-foreground">{account.balance}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        <Link2 className="w-4 h-4 mr-2" /> {account.status === "connected" ? "Resync" : "Link with Plaid"}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2} className="lg:col-span-2">
              <Card className="glass p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Cash flow radar</h2>
                      <p className="text-xs text-muted-foreground">Upcoming bills, spending pace, and AI notes.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">Next due {upcomingBills[0].due}</Badge>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-3 text-sm">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Upcoming bills</p>
                    {upcomingBills.map((bill) => (
                      <div
                        key={bill.vendor}
                        className="rounded-lg border border-border/40 p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="text-foreground font-medium">{bill.vendor}</p>
                          <p className="text-xs text-muted-foreground">Due {bill.due}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-foreground font-semibold">{bill.amount}</p>
                          <Badge
                            variant="outline"
                            className="mt-1 border-primary/30 text-primary flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" /> {bill.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="h-28 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-md relative overflow-hidden">
                      <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="absolute inset-0"
                      >
                        <svg viewBox="0 0 300 120" className="w-full h-full">
                          <defs>
                            <linearGradient id="cashflow" x1="0" x2="0" y1="0" y2="1">
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
                            fill="url(#cashflow)"
                          />
                        </svg>
                      </motion.div>
                    </div>

                    <div className="grid gap-2 text-xs w-full">
                      {spendingInsights.map((segment) => (
                        <div key={segment.label} className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: segment.color }}
                            />
                            {segment.label}
                          </span>
                          <span className="text-foreground font-medium">{segment.value}%</span>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-dashed border-primary/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                      <CircleDashed className="w-4 h-4 text-primary" />
                      AI notes: spending pace is 8% under plan — redirect $200 to savings.
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
              <Card className="glass p-6 space-y-5 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Recurring guardrails</h2>
                      <p className="text-sm text-muted-foreground">Rocket Money-style subscription control.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    Auto-detected
                  </Badge>
                </div>
                <div className="space-y-3">
                  {recurringWatchlist.map((item) => (
                    <div key={item.merchant} className="flex items-center justify-between text-sm rounded-lg border border-border/40 p-3">
                      <div>
                        <p className="text-foreground font-medium">{item.merchant}</p>
                        <p className="text-xs text-muted-foreground">{item.status}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm text-foreground font-semibold">{item.amount}</p>
                        <Button size="sm" variant="outline" className="w-full">
                          <LineChart className="w-4 h-4 mr-2" /> {item.action}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
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
                {monthlySpending.map((value, index) => (
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
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
