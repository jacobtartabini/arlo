import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  ArrowLeft,
  Workflow,
  Bot,
  Clock,
  Zap,
  ListTree,
  Rocket,
  Plus
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const runningAutomations = [
  {
    name: "Weekly finance digest",
    trigger: "Fridays · 09:00",
    status: "Running",
    lastRun: "Completed 1h ago",
    owner: "Arlo"
  },
  {
    name: "System health check",
    trigger: "Daily · 07:30",
    status: "Running",
    lastRun: "Completed 18m ago",
    owner: "Arlo"
  },
  {
    name: "Investor briefing draft",
    trigger: "On new KPI upload",
    status: "Queued",
    lastRun: "Awaiting data",
    owner: "You"
  }
];

const blueprintGallery = [
  {
    title: "Summon focus playlist",
    description: "When focus mode toggles on, launch ambient playlist and notify Sonos.",
    complexity: "2 steps"
  },
  {
    title: "Travel day autopilot",
    description: "Sync boarding pass, book rideshare, and send ETA to inner circle.",
    complexity: "4 steps"
  },
  {
    title: "Morning status ping",
    description: "Compile overnight alerts, summarize emails, and stage daily brief in Notion.",
    complexity: "3 steps"
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

export default function Automations() {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [automationName, setAutomationName] = useState("");
  const [trigger, setTrigger] = useState("schedule");

  useEffect(() => {
    document.title = "Automations — Arlo";
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
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Automations</h1>
              <p className="text-sm text-muted-foreground">Run playbooks across finance, systems, travel, and personal rituals.</p>
            </div>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="glass-intense">
              <Plus className="w-4 h-4 mr-2" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create automation</DialogTitle>
              <DialogDescription>Give it a name and choose a trigger — Arlo handles the rest.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="automation-name">Automation name</Label>
                <Input
                  id="automation-name"
                  value={automationName}
                  onChange={(event) => setAutomationName(event.target.value)}
                  placeholder="e.g. Monday executive brief"
                />
              </div>
              <div className="grid gap-2">
                <Label>Trigger</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule">Scheduled time</SelectItem>
                    <SelectItem value="event">When a calendar event begins</SelectItem>
                    <SelectItem value="webhook">Incoming webhook</SelectItem>
                    <SelectItem value="manual">Manual start</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setIsDialogOpen(false);
                  setAutomationName("");
                  setTrigger("schedule");
                }}
                disabled={!automationName.trim()}
              >
                Launch automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <Card className="glass-intense p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Running automations</h2>
                    <p className="text-xs text-muted-foreground">Monitor live flows and review the latest run outcomes.</p>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                  {runningAutomations.length} active
                </Badge>
              </div>
              <div className="space-y-3 text-sm">
                {runningAutomations.map((automation) => (
                  <div key={automation.name} className="rounded-lg border border-border/40 p-4 grid gap-2 md:grid-cols-2">
                    <div>
                      <p className="text-foreground font-semibold">{automation.name}</p>
                      <p className="text-xs text-muted-foreground">{automation.trigger}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{automation.owner}</p>
                        <p className="text-xs text-muted-foreground">{automation.lastRun}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          automation.status === "Running"
                            ? "border-emerald-500/30 text-emerald-400"
                            : "border-amber-500/30 text-amber-400"
                        }
                      >
                        {automation.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Upcoming triggers</h2>
                  <p className="text-xs text-muted-foreground">Arlo lines up the next checkpoints and dependencies.</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Next up</p>
                  <p className="text-foreground font-medium">Finance digest</p>
                  <p className="text-xs text-muted-foreground">Tomorrow · 09:00</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Watch</p>
                  <p className="text-foreground font-medium">System health check</p>
                  <p className="text-xs text-muted-foreground">Tonight · 23:00</p>
                </div>
                <div className="rounded-lg border border-border/40 p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Waiting on</p>
                  <p className="text-foreground font-medium">Investor briefing draft</p>
                  <p className="text-xs text-muted-foreground">New KPI upload</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <Card className="glass p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ListTree className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Blueprint gallery</h2>
                    <p className="text-xs text-muted-foreground">Jumpstart with pre-built flows or remix your own.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-accent/30 text-accent-foreground">
                  Powered by Arlo Actions
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                {blueprintGallery.map((blueprint) => (
                  <div key={blueprint.title} className="rounded-lg border border-border/40 p-4 space-y-2">
                    <p className="text-foreground font-semibold">{blueprint.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{blueprint.description}</p>
                    <Badge variant="secondary" className="bg-accent/15 text-accent-foreground border-accent/30 w-fit">
                      {blueprint.complexity}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <Card className="glass p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Automation energy</h2>
                  <p className="text-xs text-muted-foreground">Track run time savings and success rate.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="rounded-lg border border-border/40 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Time saved this week</p>
                  <p className="text-2xl font-semibold text-foreground">6.4 hrs</p>
                  <p className="text-xs text-muted-foreground">Up 18% vs last week</p>
                </div>
                <div className="rounded-lg border border-border/40 p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Success rate</p>
                  <p className="text-2xl font-semibold text-foreground">97%</p>
                  <p className="text-xs text-muted-foreground">No failed runs in the last 48 hours</p>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-accent/40 p-4 text-xs text-muted-foreground flex items-center gap-2">
                <Rocket className="w-4 h-4 text-accent" />
                Tip: chain automations — completion of "Finance digest" can trigger "Investor brief" drafting automatically.
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
