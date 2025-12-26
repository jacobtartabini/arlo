import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Flame,
  Sun,
  Moon,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Trophy,
  Zap,
  SkipForward,
  TrendingUp,
  Gift,
  Settings,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHabitSystem } from "@/hooks/useHabitSystem";
import type { HabitWithStreak, RoutineWithHabits, UserProgress, Reward } from "@/types/habits";
import { xpToNextLevel } from "@/types/habits";
import { HabitCard } from "@/components/habits/HabitCard";
import { RoutineCard } from "@/components/habits/RoutineCard";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { CreateRoutineDialog } from "@/components/habits/CreateRoutineDialog";
import { RewardsStore } from "@/components/habits/RewardsStore";
import { HabitInsights } from "@/components/habits/HabitInsights";
import { toast } from "@/hooks/use-toast";

export default function Habits() {
  const navigate = useNavigate();
  const {
    fetchHabitsWithStreaks,
    fetchRoutinesWithHabits,
    fetchUserProgress,
    fetchRewards,
    logHabitCompletion,
    isScheduledForToday,
  } = useHabitSystem();

  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [routines, setRoutines] = useState<RoutineWithHabits[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"today" | "routines" | "insights" | "rewards">("today");
  const [createHabitOpen, setCreateHabitOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [xpPopup, setXpPopup] = useState<{ amount: number; visible: boolean }>({ amount: 0, visible: false });

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [habitsData, routinesData, progressData, rewardsData] = await Promise.all([
      fetchHabitsWithStreaks(),
      fetchRoutinesWithHabits(),
      fetchUserProgress(),
      fetchRewards(),
    ]);
    setHabits(habitsData);
    setRoutines(routinesData);
    setProgress(progressData);
    setRewards(rewardsData);
    setLoading(false);
  }, [fetchHabitsWithStreaks, fetchRoutinesWithHabits, fetchUserProgress, fetchRewards]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteHabit = async (habitId: string, skipped: boolean = false) => {
    const { log, xpEarned, bonuses } = await logHabitCompletion(habitId, 1, skipped);
    
    if (log) {
      if (xpEarned > 0) {
        setXpPopup({ amount: xpEarned, visible: true });
        setTimeout(() => setXpPopup({ amount: 0, visible: false }), 2500);
      }
      
      const bonusText = bonuses.length > 0 ? ` • ${bonuses.join(' • ')}` : '';
      
      toast({
        title: skipped ? "Habit skipped" : "Habit completed!",
        description: skipped 
          ? "No worries, streak preserved" 
          : `+${xpEarned} XP earned${bonusText}`,
      });
      
      loadData();
    }
  };

  // Calculate daily stats
  const todaysHabits = habits.filter(h => h.enabled && isScheduledForToday(h));
  const standaloneHabits = todaysHabits.filter(h => !h.routineId);
  const completedCount = todaysHabits.filter(h => h.completedToday).length;
  const totalCount = todaysHabits.length;
  const alignmentScore = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isDailyWin = alignmentScore >= 80;
  const xpProgress = progress ? xpToNextLevel(progress.totalXp) : { current: 0, next: 100, progress: 0 };

  const morningRoutine = routines.find(r => r.routineType === 'morning');
  const nightRoutine = routines.find(r => r.routineType === 'night');
  const customRoutines = routines.filter(r => r.routineType === 'custom');

  return (
    <div className="min-h-screen bg-background">
      {/* XP Popup */}
      <AnimatePresence>
        {xpPopup.visible && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 rounded-full bg-amber-500/90 px-4 py-2 text-white font-bold shadow-lg">
              <Zap className="h-5 w-5" />
              +{xpPopup.amount} XP
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:px-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
              <h1 className="text-2xl font-bold text-foreground">Habits</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Back
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <Card className="p-4 bg-card/80 backdrop-blur border-border/60">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {/* Alignment Score */}
              <div className="col-span-2 sm:col-span-1">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl font-bold text-lg",
                    isDailyWin 
                      ? "bg-amber-500/10 text-amber-500" 
                      : "bg-primary/10 text-primary"
                  )}>
                    {alignmentScore}%
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Daily Alignment</p>
                    <p className="text-sm font-medium">
                      {isDailyWin && <span className="text-amber-500">Daily Win! 🎉</span>}
                      {!isDailyWin && `${completedCount}/${totalCount} done`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Level & XP */}
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground mb-1">Level {progress?.currentLevel || 1}</p>
                <Progress value={xpProgress.progress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {progress?.totalXp || 0} / {xpProgress.next} XP
                </p>
              </div>

              {/* Available XP */}
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <div className="flex items-center gap-1">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <span className="font-bold text-lg">{progress?.availableXp || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">XP to spend</p>
              </div>

              {/* Streak */}
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <div className="flex items-center gap-1">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="font-bold text-lg">{progress?.currentStreak || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
            </div>
          </Card>
        </header>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="today" className="gap-1">
              <Sun className="h-4 w-4" />
              <span className="hidden sm:inline">Today</span>
            </TabsTrigger>
            <TabsTrigger value="routines" className="gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Routines</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="rewards" className="gap-1">
              <Gift className="h-4 w-4" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
          </TabsList>

          {/* Today View */}
          <TabsContent value="today" className="space-y-6">
            {/* Active Routines */}
            {(morningRoutine || nightRoutine) && (
              <section>
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Active Routines</h2>
                <div className="space-y-3">
                  {morningRoutine && (
                    <RoutineCard
                      routine={morningRoutine}
                      onCompleteHabit={handleCompleteHabit}
                    />
                  )}
                  {nightRoutine && (
                    <RoutineCard
                      routine={nightRoutine}
                      onCompleteHabit={handleCompleteHabit}
                    />
                  )}
                  {customRoutines.map(routine => (
                    <RoutineCard
                      key={routine.id}
                      routine={routine}
                      onCompleteHabit={handleCompleteHabit}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Individual Habits */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {standaloneHabits.length > 0 ? "Today's Habits" : "No habits for today"}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => setCreateHabitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              
              {standaloneHabits.length === 0 && habits.length === 0 && (
                <Card className="p-8 text-center bg-muted/30 border-dashed">
                  <Flame className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">Start building your habits</p>
                  <Button onClick={() => setCreateHabitOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create your first habit
                  </Button>
                </Card>
              )}

              <div className="space-y-2">
                {standaloneHabits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    onComplete={() => handleCompleteHabit(habit.id)}
                    onSkip={() => handleCompleteHabit(habit.id, true)}
                  />
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Routines View */}
          <TabsContent value="routines" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Your Routines</h2>
                <p className="text-sm text-muted-foreground">
                  Ordered sequences of habits for consistent execution
                </p>
              </div>
              <Button onClick={() => setCreateRoutineOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Routine
              </Button>
            </div>

            {routines.length === 0 ? (
              <Card className="p-8 text-center bg-muted/30 border-dashed">
                <Moon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  Create a Morning or Night routine to start
                </p>
                <Button onClick={() => setCreateRoutineOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Routine
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {routines.map(routine => (
                  <Card key={routine.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl",
                        routine.routineType === 'morning' && "bg-amber-500/10 text-amber-500",
                        routine.routineType === 'night' && "bg-indigo-500/10 text-indigo-500",
                        routine.routineType === 'custom' && "bg-primary/10 text-primary",
                      )}>
                        {routine.routineType === 'morning' && <Sun className="h-5 w-5" />}
                        {routine.routineType === 'night' && <Moon className="h-5 w-5" />}
                        {routine.routineType === 'custom' && <Flame className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{routine.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {routine.habits.length} habits · {routine.anchorCue || "No anchor set"}
                        </p>
                      </div>
                    </div>
                    
                    {routine.habits.length > 0 && (
                      <div className="space-y-2 pl-4 border-l-2 border-border">
                        {routine.habits.map((habit, index) => (
                          <div key={habit.id} className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">{index + 1}.</span>
                            <span>{habit.title}</span>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {habit.streak} day streak
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {/* All Habits */}
            <section className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">All Habits</h2>
                <Button variant="outline" size="sm" onClick={() => setCreateHabitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {habits.map(habit => (
                  <Card key={habit.id} className="p-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{habit.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {habit.scheduleType} · {habit.difficulty} · {habit.streak} day streak
                      </p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      habit.routineId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {habit.routineId ? "In routine" : "Standalone"}
                    </span>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Insights View */}
          <TabsContent value="insights">
            <HabitInsights habits={habits} progress={progress} />
          </TabsContent>

          {/* Rewards View */}
          <TabsContent value="rewards">
            <RewardsStore 
              rewards={rewards} 
              availableXp={progress?.availableXp || 0}
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateHabitDialog 
        open={createHabitOpen} 
        onOpenChange={setCreateHabitOpen}
        routines={routines}
        onCreated={loadData}
      />
      <CreateRoutineDialog
        open={createRoutineOpen}
        onOpenChange={setCreateRoutineOpen}
        onCreated={loadData}
      />
    </div>
  );
}
