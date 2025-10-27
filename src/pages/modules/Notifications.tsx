import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FloatingChatBar } from "@/components/FloatingChatBar";
import {
  ArrowLeft,
  BellRing,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  CalendarCheck,
  PauseCircle,
  CheckCircle2
} from "lucide-react";

const initialAlerts = [
  {
    id: 1,
    source: "Finance",
    title: "Upcoming bill",
    description: "Design Tools draft due Apr 28 — autopay queued.",
    icon: Wallet,
    tone: "info"
  },
  {
    id: 2,
    source: "System",
    title: "Tailscale tunnel steady",
    description: "Last quick fix completed 12s ago with no errors.",
    icon: ShieldCheck,
    tone: "success"
  },
  {
    id: 3,
    source: "Productivity",
    title: "Focus block starting",
    description: "Deep work session begins in 10 minutes — notifications muted.",
    icon: CalendarCheck,
    tone: "warning"
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

export default function Notifications() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [snoozeUntil, setSnoozeUntil] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Notifications — Arlo";
  }, []);

  const handleClearAll = () => {
    setAlerts([]);
  };

  const handleSnooze = () => {
    const until = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString();
    setSnoozeUntil(until);
  };

  const toneClasses: Record<string, string> = {
    info: "border-primary/30 text-primary",
    warning: "border-amber-500/30 text-amber-400",
    success: "border-emerald-500/30 text-emerald-400"
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
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
              <p className="text-sm text-muted-foreground">Finance, system, and personal alerts unified into one feed.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSnooze}>
            <PauseCircle className="w-4 h-4 mr-2" /> Snooze 15m
          </Button>
          <Button className="glass-intense" onClick={handleClearAll} disabled={alerts.length === 0}>
            Clear All
          </Button>
        </div>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <Card className="glass-intense p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Unified alert feed</h2>
                    <p className="text-xs text-muted-foreground">
                      Key events from finance, system security, productivity, and automations.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {alerts.length} active
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                {alerts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-primary/30 p-4 text-center text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
                    All clear — Arlo will surface the next update here.
                  </div>
                ) : (
                  alerts.map((alert) => {
                    const Icon = alert.icon;
                    return (
                      <div
                        key={alert.id}
                        className="rounded-lg border border-border/40 p-4 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={toneClasses[alert.tone]}>
                                {alert.source}
                              </Badge>
                              <p className="text-foreground font-medium">{alert.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </motion.div>

          {snoozeUntil ? (
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-4 text-xs text-muted-foreground flex items-center gap-2">
                <PauseCircle className="w-4 h-4 text-primary" />
                Notifications snoozed until {snoozeUntil}. Critical alerts still break through.
              </Card>
            </motion.div>
          ) : null}
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
