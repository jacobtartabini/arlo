import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ShieldCheck,
  Server,
  AlertTriangle,
  KeyRound,
  Cpu,
  Activity,
  TimerReset,
  Wifi
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const sessions = [
  { device: "MacBook Pro", location: "San Francisco, US", status: "Active", lastSeen: "2m ago" },
  { device: "iPhone 15", location: "San Francisco, US", status: "Secure", lastSeen: "12m ago" },
  { device: "iPad", location: "Austin, US", status: "Idle", lastSeen: "3h ago" }
];

const accessLogs = [
  { event: "Key rotation", actor: "Arlo", time: "09:12" },
  { event: "New device", actor: "Vision Pro", time: "Yesterday" },
  { event: "SSH login", actor: "MacBook Pro", time: "Apr 18" }
];

const metrics = [
  { label: "CPU", value: 42 },
  { label: "GPU", value: 35 },
  { label: "RAM", value: 68 },
  { label: "Disk", value: 51 }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function SystemSecurity() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "System & Security — Arlo";
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">System & Security</h1>
              <p className="text-sm text-muted-foreground">Monitor infrastructure health and keep every device locked in.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <KeyRound className="w-4 h-4 mr-2" />
          Rotate keys
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
              <Card className="glass-intense p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Private Server Security</h2>
                      <p className="text-xs text-muted-foreground">Sessions, alerts, and login telemetry.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    All secure
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  {sessions.map((session) => (
                    <div key={session.device} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{session.device}</p>
                        <p className="text-xs text-muted-foreground">{session.location}</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className={session.status === "Active" ? "text-emerald-400" : "text-muted-foreground"}>{session.status}</p>
                        <p>{session.lastSeen}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-accent/40 p-4 flex items-center gap-3 text-sm text-accent-foreground">
                  <AlertTriangle className="w-5 h-5" />
                  No anomalies detected in the last 24 hours.
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Circl Access</h2>
                      <p className="text-xs text-muted-foreground">Device keychain and access history.</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                    6 devices
                  </Badge>
                </div>
                <div className="space-y-3 text-sm">
                  {accessLogs.map((log) => (
                    <div key={log.event} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">{log.event}</p>
                        <p className="text-xs text-muted-foreground">{log.actor}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-accent/10 p-4 text-xs text-accent-foreground">
                  Next rotation scheduled for Apr 30 — Arlo will handle distribution automatically.
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <Card className="glass p-6 space-y-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">System Monitor</h2>
                  <p className="text-xs text-muted-foreground">Live resource usage, uptime, and network status.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-border/40 p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="text-foreground font-medium">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="rounded-lg border border-border/40 p-3 flex items-center gap-3">
                  <Activity className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Load average</p>
                    <p className="text-foreground font-medium">0.71 • 0.63 • 0.58</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 p-3 flex items-center gap-3">
                  <TimerReset className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="text-foreground font-medium">12d 4h 18m</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/40 p-3 flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Network</p>
                    <p className="text-foreground font-medium">418 Mbps • Stable</p>
                  </div>
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
