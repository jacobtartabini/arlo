import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  HeartPulse,
  Apple,
  Dumbbell,
  Flame,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  MoonStar,
  Droplet,
  CheckCircle2
} from "lucide-react";
import { FloatingChatBar } from "@/components/FloatingChatBar";

const meals = [
  { time: "08:15", name: "Overnight oats", calories: 420 },
  { time: "12:30", name: "Macro bowl", calories: 610 },
  { time: "16:00", name: "Green smoothie", calories: 210 }
];

const workouts = [
  { day: "Mon", minutes: 45 },
  { day: "Tue", minutes: 35 },
  { day: "Wed", minutes: 50 },
  { day: "Thu", minutes: 40 },
  { day: "Fri", minutes: 55 },
  { day: "Sat", minutes: 20 },
  { day: "Sun", minutes: 0 }
];

const recommendations = [
  "Evening Yoga Flow",
  "Focus Playlist",
  "Apple TV – Documentary queue"
];

const dailyGoals = [
  { label: "Sleep", value: 7.8, target: 8, unit: "hrs" },
  { label: "Water", value: 6, target: 8, unit: "glasses" },
  { label: "Movement", value: 83, target: 100, unit: "%" }
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.05 }
  })
};

export default function Health() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Health & Lifestyle — Arlo";
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
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Health & Lifestyle</h1>
              <p className="text-sm text-muted-foreground">Track wellness metrics, workouts, and media rituals.</p>
            </div>
          </div>
        </div>
        <Button className="glass-intense">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate wellness tip
        </Button>
      </motion.header>

      <main className="relative z-10 p-6 pb-32">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0} className="lg:col-span-2">
              <Card className="glass-intense p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Apple className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">Calorie Tracking</h2>
                      <p className="text-xs text-muted-foreground">Daily log, nutrient balance, and AI insights.</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20">
                    1,840 / 2,250 cal
                  </Badge>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3 text-sm">
                    {meals.map((meal) => (
                      <div key={meal.name} className="rounded-lg border border-border/40 p-3 flex items-center justify-between">
                        <div>
                          <p className="text-foreground font-medium">{meal.name}</p>
                          <p className="text-xs text-muted-foreground">{meal.time}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{meal.calories} cal</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="relative w-40 h-40">
                      <svg className="w-40 h-40 -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="hsl(var(--primary) / 0.08)" strokeWidth="14" fill="none" />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="hsl(var(--primary))"
                          strokeWidth="14"
                          strokeDasharray={`${Math.PI * 2 * 70}`}
                          strokeDashoffset={Math.PI * 2 * 70 * 0.3}
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-sm font-semibold text-primary">
                        Nutrients
                        <span className="text-xs text-muted-foreground">Protein 27% • Carbs 48% • Fat 25%</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-primary/10 px-4 py-3 text-xs text-primary text-center">
                      AI tip: Increase protein at dinner to boost recovery — suggest grilled salmon or tofu bowl.
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
              <Card className="glass p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <Dumbbell className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Exercise Tracking</h2>
                    <p className="text-xs text-muted-foreground">Activity graph, goals, and progress.</p>
                  </div>
                </div>
                <div className="h-28 grid grid-cols-7 gap-1">
                  {workouts.map((workout, index) => (
                    <div key={workout.day} className="flex flex-col items-center justify-end gap-2">
                      <motion.div
                        className="w-full rounded-sm bg-primary/60"
                        initial={{ height: 4 }}
                        animate={{ height: `${Math.max(10, (workout.minutes / 60) * 100)}%` }}
                        transition={{ delay: index * 0.05 }}
                      />
                      <span className="text-[10px] text-muted-foreground">{workout.day}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Goal</span>
                    <span className="text-foreground">300 / 360 min</span>
                  </div>
                  <Progress value={83} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Streak</span>
                    <span className="text-foreground">9 days active</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  Log workout
                </Button>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <Card className="glass p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MoonStar className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Daily Wellness Snapshot</h2>
                    <p className="text-xs text-muted-foreground">Mini trackers keep sleep, hydration, and goals aligned.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Auto-synced wearables
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div className="rounded-lg border border-border/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MoonStar className="w-4 h-4 text-primary" /> Sleep
                  </div>
                  <p className="text-2xl font-semibold text-foreground">7h 48m</p>
                  <p className="text-xs text-muted-foreground">Target 8h — great recovery score.</p>
                </div>
                <div className="rounded-lg border border-border/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Droplet className="w-4 h-4 text-primary" /> Water
                  </div>
                  <p className="text-2xl font-semibold text-foreground">6 / 8</p>
                  <p className="text-xs text-muted-foreground">Refill bottle in 45 minutes to stay on pace.</p>
                </div>
                <div className="rounded-lg border border-border/40 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Daily goals
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Movement</span>
                    <span className="text-foreground font-medium">83% complete</span>
                  </div>
                  <Progress value={dailyGoals[2].value} className="h-2" />
                  <p className="text-xs text-muted-foreground">Add a 12 min walk to close the ring.</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <Card className="glass p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Spotify / Apple TV Hub</h2>
                    <p className="text-xs text-muted-foreground">Control playback and explore recommendations.</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  Now playing
                </Badge>
              </div>
              <div className="rounded-lg border border-border/40 p-4 flex flex-col md:flex-row md:items-center gap-4">
                <div className="aspect-square w-24 rounded-lg bg-gradient-to-br from-primary/40 to-primary/10" />
                <div className="flex-1 text-sm">
                  <p className="text-foreground font-semibold">Chill Vibes</p>
                  <p className="text-xs text-muted-foreground">Spotify • Curated for focus</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-9 w-9">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                    <Button size="icon" className="h-10 w-10">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9">
                      <Pause className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3 text-xs">
                {recommendations.map((item) => (
                  <div key={item} className="rounded-lg border border-border/40 p-3 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <FloatingChatBar />
    </div>
  );
}
