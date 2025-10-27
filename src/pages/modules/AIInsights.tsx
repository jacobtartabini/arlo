import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingChatBar } from "@/components/FloatingChatBar";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  LineChart,
  RefreshCcw,
  Clock3,
  BrainCircuit,
  Activity,
  NotebookPen
} from "lucide-react";

const initialInsights = [
  {
    title: "Productivity uplift",
    summary: "Your productivity was 12% higher this week when focus mode stayed on for 3+ hours.",
    detail: "Arlo compared your last 4 focus blocks with calendar analytics and found a consistent trend.",
    icon: TrendingUp
  },
  {
    title: "Finance balance",
    summary: "Spending dipped 6% below baseline — redirect $420 to savings to stay ahead of the goal.",
    detail: "Derived from finance module's upcoming bills and lifestyle tracking.",
    icon: LineChart
  },
  {
    title: "System pulse",
    summary: "System load stayed under 45% even during automation bursts — safe to schedule GPU render tonight.",
    detail: "Pulled from System & Security telemetry and automation runtime logs.",
    icon: Activity
  }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.06 }
  })
};

export default function AIInsights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(initialInsights);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  useEffect(() => {
    document.title = "AI Insights — Arlo";
  }, []);

  const handleRefresh = () => {
    setLastUpdated(new Date().toLocaleTimeString());
    setInsights((current) =>
      current.map((insight) => ({
        ...insight,
        detail:
          insight.detail.indexOf("Refreshed") === -1
            ? `${insight.detail} (Refreshed with latest signals)`
            : insight.detail
      }))
    );
  };

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
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI Insights</h1>
              <p className="text-sm text-muted-foreground">Arlo synthesizes cross-module data into actionable guidance.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" /> Updated {lastUpdated}
          </Badge>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <Card className="glass-intense p-6 space-y-6">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Weekly intelligence digest</h2>
                  <p className="text-xs text-muted-foreground">Cross-referenced from productivity, finance, health, and system data.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {insights.map((insight) => {
                  const Icon = insight.icon;
                  return (
                    <div key={insight.title} className="rounded-lg border border-border/40 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <p className="text-foreground font-semibold">{insight.title}</p>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{insight.summary}</p>
                      <p className="text-xs text-muted-foreground">{insight.detail}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <NotebookPen className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Action board</h2>
                  <p className="text-xs text-muted-foreground">Arlo suggests the next three moves to capitalize on these insights.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-foreground font-medium">Schedule investor memo revisions</p>
                  <p className="text-xs text-muted-foreground">Use the refreshed finance digest and semantic search pull to update talking points.</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-foreground font-medium">Extend focus mode streak</p>
                  <p className="text-xs text-muted-foreground">Lock a 90-minute deep work block after tomorrow's design critique.</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-foreground font-medium">Queue overnight render</p>
                  <p className="text-xs text-muted-foreground">System load is low — start the automation and notify the design channel.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
