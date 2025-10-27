import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  CalendarCheck,
  PenLine,
  Mic,
  Inbox,
  Sparkles,
  Flame,
  Clock3,
  Target,
  CalendarDays,
  ListChecks
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const tasks = [
  { id: 1, label: "Ship design review summary", done: true },
  { id: 2, label: "Respond to research thread", done: false },
  { id: 3, label: "Plan Q2 roadmap milestones", done: false },
  { id: 4, label: "Prep investor update outline", done: true }
];

const schedule = [
  { time: "08:30", label: "Inbox triage" },
  { time: "11:00", label: "AI pairing session" },
  { time: "14:00", label: "Focus block" },
  { time: "16:30", label: "Lecture recording" }
];

const inboxPreview = [
  { source: "Email", subject: "Design QA sign-off", snippet: "Final tweaks applied to hero." },
  { source: "SMS", subject: "Courier", snippet: "Package arriving at 6 PM." },
  { source: "Email", subject: "Team Daily", snippet: "Notes and action items compiled." }
];

const habits = [
  { label: "Morning routine", streak: 12 },
  { label: "Evening shutdown", streak: 9 },
  { label: "Read 20 pages", streak: 6 }
];

const recentTasks = [
  { title: "Archive sprint retro", status: "Completed · 2h ago" },
  { title: "Update onboarding doc", status: "In review · Due tomorrow" },
  { title: "Sync with AI research", status: "Scheduled · Thu 10:30" }
];

const upcomingEvents = [
  { time: "Apr 28 · 09:30", title: "Design critique", location: "Studio" },
  { time: "Apr 29 · 13:00", title: "Investor sync", location: "Holo call" }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Productivity() {
  const navigate = useNavigate();
  const [focusMode, setFocusMode] = useState(true);

  useEffect(() => {
    document.title = "Productivity — Arlo";
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
              <CalendarCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Productivity</h1>
              <p className="text-sm text-muted-foreground">Plan your day, track progress, and let AI keep you ahead.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate daily brief
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
            <Card className="glass p-6 space-y-6 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
                  <Target className="w-5 h-5 text-accent" />
                </div>
                <div className="space-y-2">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Focus Mode</h2>
                    <p className="text-sm text-muted-foreground">
                      Silence non-essential notifications, tighten calendar holds, and surface only critical work.
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5" /> Upcoming focus locks sync from the connected calendar API.
                    </div>
                    {upcomingEvents.map((event) => (
                      <div key={event.time} className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                        <span className="text-foreground font-medium">{event.title}</span>
                        <span>• {event.time} — {event.location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={focusMode} onCheckedChange={setFocusMode} />
                <div className="text-sm text-foreground font-medium">
                  {focusMode ? "Active" : "Paused"}
                  <p className="text-xs text-muted-foreground">
                    {focusMode ? "Notifications muted for 90 minutes." : "Focus automations paused until resumed."}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1} className="xl:col-span-2">
              <Card className="glass-intense p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">To-Do & Reminders</h2>
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                    62% complete
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {tasks.map((task) => (
                    <label
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm hover:border-accent/40 transition-colors"
                    >
                      <Checkbox checked={task.done} />
                      <span className={task.done ? "line-through text-muted-foreground" : "text-foreground"}>{task.label}</span>
                    </label>
                  ))}
                </div>
                <div className="rounded-lg bg-muted/20 p-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Completion trend</p>
                    <div className="mt-3 h-20 grid grid-cols-7 gap-1">
                      {[55, 62, 48, 70, 65, 78, 82].map((value, index) => (
                        <motion.div
                          key={index}
                          initial={{ height: 0 }}
                          animate={{ height: `${value}%` }}
                          transition={{ delay: index * 0.05 }}
                          className="rounded-sm bg-accent/40"
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Today’s schedule</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {schedule.map((item) => (
                        <div key={item.time} className="flex items-center justify-between text-muted-foreground">
                          <span>{item.time}</span>
                          <span className="text-foreground">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <PenLine className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Notes</h2>
                    <p className="text-xs text-muted-foreground">Capture thoughts and let AI summarize.</p>
                  </div>
                </div>
                <Textarea placeholder="Capture quick notes..." className="min-h-[160px] text-sm" />
                <div className="rounded-lg border border-border/40 bg-muted/20 p-3 text-sm">
                  <p className="text-xs text-muted-foreground mb-1">AI summary</p>
                  <p className="text-foreground leading-relaxed">
                    Product roadmap converges on automation features. Highlight new partner integrations and ship recap.
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3} className="lg:col-span-2">
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Lecture Recorder & Summarizer</h2>
                      <p className="text-xs text-muted-foreground">Record, transcribe, and auto-summarize sessions.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Mic className="w-4 h-4 mr-2" />
                    Start recording
                  </Button>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg border border-border/40 p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Transcript</p>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      “...Focusing on modular APIs unlocks faster partner onboarding and reduces support time by 40%...”
                    </p>
                  </div>
                  <div className="rounded-lg bg-accent/10 p-3">
                    <p className="text-xs text-accent uppercase tracking-wide">Summary</p>
                    <p className="mt-2 text-sm text-accent-foreground">
                      Key actions: Align analytics dashboards, update onboarding scripts, plan beta invite next week.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Email & Text Manager</h2>
                    <p className="text-xs text-muted-foreground">Unified inbox with AI triage.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {inboxPreview.map((item) => (
                    <div key={item.subject} className="rounded-lg border border-border/40 p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px] border-accent/30 text-accent-foreground">
                          {item.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Smart priority</span>
                      </div>
                      <p className="text-foreground font-medium">{item.subject}</p>
                      <p className="text-xs text-muted-foreground mt-1">{item.snippet}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <ListChecks className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Recent Tasks</h2>
                    <p className="text-xs text-muted-foreground">Track quick wins and open loops Arlo is watching.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {recentTasks.map((task) => (
                    <div key={task.title} className="rounded-lg border border-border/40 p-3">
                      <p className="text-foreground font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{task.status}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Flame className="w-5 h-5 text-accent" />
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">Habit Tracking</h2>
                      <p className="text-xs text-muted-foreground">Stay consistent with progress rings and streaks.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-accent/20 text-accent-foreground border-accent/30">
                    9 day streak
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {habits.map((habit, index) => (
                    <div key={habit.label} className="flex items-center gap-4">
                      <div className="relative w-12 h-12">
                        <svg className="w-12 h-12 -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="hsl(var(--accent) / 0.12)" strokeWidth="4" fill="none" />
                          <motion.circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="hsl(var(--accent))"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: "0 125.6" }}
                            animate={{ strokeDasharray: `${Math.min(125.6, 12 * habit.streak)} 125.6` }}
                            transition={{ delay: index * 0.1, duration: 0.8, ease: "easeOut" }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-accent-foreground">
                          {habit.streak}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{habit.label}</p>
                        <p className="text-xs text-muted-foreground">{habit.streak}-day streak</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={7}>
              <Card className="glass p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock3 className="w-5 h-5 text-accent" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Peak Day Planner</h2>
                    <p className="text-xs text-muted-foreground">Visualize energy and focus windows.</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Focus hours</span>
                    <span className="text-foreground">09:00 – 12:00 • 14:00 – 17:00</span>
                  </div>
                  <div className="h-28 rounded-lg bg-gradient-to-r from-accent/10 via-transparent to-accent/10 relative overflow-hidden">
                    <div className="absolute inset-0 flex">
                      {["6a", "9a", "12p", "3p", "6p"].map((mark, index) => (
                        <div key={mark} className="flex-1 border-l border-border/40">
                          <span className="absolute top-2 text-[10px] text-muted-foreground" style={{ left: `${(index / 4) * 100}%` }}>
                            {mark}
                          </span>
                        </div>
                      ))}
                    </div>
                    <motion.div
                      className="absolute top-1/2 left-[15%] h-10 w-[35%] -translate-y-1/2 rounded-full bg-accent/30 backdrop-blur"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.4 }}
                    />
                    <motion.div
                      className="absolute top-1/2 left-[58%] h-10 w-[28%] -translate-y-1/2 rounded-full bg-accent/30 backdrop-blur"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    />
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
