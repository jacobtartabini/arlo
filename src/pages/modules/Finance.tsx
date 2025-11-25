import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Activity,
  CalendarDays,
  CircleDashed,
  CreditCard,
  Gift,
  ChevronRight,
  Link2,
  LineChart,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";
import { FinanceHeaderCard } from "./finance/components/FinanceHeaderCard";
import { NetWorthChart } from "./finance/components/NetWorthChart";
import { SpendingSummaryCard } from "./finance/components/SpendingSummaryCard";
import {
  cashFlowSignals,
  linkedAccounts,
  monthlySpending,
  recurringWatchlist,
  spendingInsights,
  upcomingBills
} from "./finance/finance-data";

const timeframes = ["Week", "Month", "Quarter", "Year"] as const;

const timeframeCopy: Record<(typeof timeframes)[number], string> = {
  Week: "This week's pulse across cash, credit, and investments.",
  Month: "Month-to-date glidepath across everything you’ve linked.",
  Quarter: "Quarter-to-date read with spend pace and reserves.",
  Year: "Year-to-date view to track momentum and progress.",
};

const getAccountIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "credit":
      return <CreditCard className="w-5 h-5 text-primary" />;
    case "investments":
      return <LineChart className="w-5 h-5 text-primary" />;
    case "wallet":
      return <Gift className="w-5 h-5 text-primary" />;
    default:
      return <PiggyBank className="w-5 h-5 text-primary" />;
  }
};

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
  const [timeframe, setTimeframe] = useState<(typeof timeframes)[number]>("Month");

  useEffect(() => {
    document.title = "Finance — Arlo";
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 spatial-grid opacity-30" />

      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <FinanceHeaderCard />
      </motion.div>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-primary/35 to-primary/15 p-6 md:p-8 shadow-xl relative overflow-hidden"
          >
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute -left-10 -top-16 h-40 w-40 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute right-0 bottom-0 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
            </div>

            <div className="relative flex flex-col gap-6">
              <div className="flex flex-col gap-3 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-sm uppercase tracking-[0.08em] text-white/70">Net worth</p>
                    <p className="text-4xl sm:text-5xl font-semibold drop-shadow-sm">$124,650</p>
                    <p className="text-sm text-white/70">Cash, credit, and investments linked in one rollup.</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-right min-w-[180px]">
                    <p className="text-xs uppercase tracking-wide text-white/70">Spend to date</p>
                    <p className="text-2xl font-semibold leading-tight">$4,230</p>
                    <p className="text-xs text-emerald-100">8% under pace</p>
                  </div>
                </div>

                <p className="text-sm text-white/70">{timeframeCopy[timeframe]}</p>
              </div>

              <div className="flex flex-col gap-4">
                <ToggleGroup
                  type="single"
                  value={timeframe}
                  onValueChange={(value) => value && setTimeframe(value as (typeof timeframes)[number])}
                  className="w-full max-w-xl rounded-xl bg-white/10 border border-white/15 p-1"
                >
                  {timeframes.map((range) => (
                    <ToggleGroupItem
                      key={range}
                      value={range}
                      className="flex-1 text-white/80 data-[state=on]:text-slate-900 data-[state=on]:bg-white data-[state=on]:font-semibold"
                    >
                      {range}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>

                <div className="grid gap-3 sm:grid-cols-3">
                  {["Income", "Spend", "Net"].map((label, index) => {
                    const values = ["$12,400", "$8,170", "+$4,230"];
                    const accents = ["text-emerald-100", "text-white", "text-emerald-200"];

                    return (
                      <div
                        key={label}
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white/80 flex items-center justify-between"
                      >
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
                          <p className="text-lg font-semibold text-white">{values[index]}</p>
                        </div>
                        <span className={`text-xs ${accents[index]}`}>
                          {label === "Net" ? "after tax" : label === "Spend" ? "to date" : "this period"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>

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

          <SpendingSummaryCard signals={cashFlowSignals} />

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

                <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
                  <div className="divide-y divide-border/60">
                    {linkedAccounts.map((account) => (
                      <div key={account.name} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
                          {getAccountIcon(account.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-foreground font-medium truncate">{account.name}</p>
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
                          <p className="text-xs text-muted-foreground mt-1">{account.type} • {account.lastSync}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-lg font-semibold text-foreground text-right tabular-nums">{account.balance}</p>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
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
            <NetWorthChart data={monthlySpending} />
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
