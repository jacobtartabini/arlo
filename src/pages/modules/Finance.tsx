import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarDays,
  CircleDashed,
  CreditCard,
  Gift,
  Link2,
  LineChart,
  Receipt,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";
import { AccountsList } from "./finance/components/AccountsList";
import { FinanceHeaderCard } from "./finance/components/FinanceHeaderCard";
import { NetWorthChart } from "./finance/components/NetWorthChart";
import { SpendingSummaryCard } from "./finance/components/SpendingSummaryCard";
import { TimeRangeTabs } from "./finance/components/TimeRangeTabs";
import {
  cashFlowSignals,
  linkedAccounts,
  monthlySpending,
  recurringWatchlist,
  spendingInsights,
  timeRanges,
  upcomingBills
} from "./finance/finance-data";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Finance() {
  const [activeRange, setActiveRange] = useState(timeRanges[0].value);

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
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Timeframe</p>
              <TimeRangeTabs ranges={timeRanges} activeRange={activeRange} onSelect={setActiveRange} />
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
              <Gift className="w-4 h-4" /> Personalized savings for {timeRanges.find((range) => range.value === activeRange)?.label}
            </Badge>
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
              <AccountsList accounts={linkedAccounts} />
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
