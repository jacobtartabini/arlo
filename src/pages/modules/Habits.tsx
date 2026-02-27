import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHabitsView } from "@/components/mobile/views/MobileHabitsView";
import { format } from "date-fns";
import {
  Plus,
  ChevronLeft,
  Flame,
  Zap,
  Check,
  SkipForward,
  BarChart3,
  Gift,
  Play,
  Clock,
  ChevronRight,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHabits, isScheduledForToday } from "@/hooks/useHabits";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { CreateRoutineDialog } from "@/components/habits/CreateRoutineDialog";
import { HabitInsights } from "@/components/habits/HabitInsights";
import { RewardsStore } from "@/components/habits/RewardsStore";
import { FocusMode } from "@/components/habits/FocusMode";
import { toast } from "@/hooks/use-toast";
import type { RoutineWithHabits, HabitWithStreak } from "@/types/habits";

export default function Habits() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    habits,
    routines,
    progress,
    rewards,
    logs,
    loading,
    loadData,
    completeHabit,
    redeemReward,
  } = useHabits();

  const [createHabitOpen, setCreateHabitOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "insights" | "rewards">("today");
  const [xpPopup, setXpPopup] = useState({ amount: 0, visible: false });
  const [focusRoutine, setFocusRoutine] = useState<RoutineWithHabits | null>(null);
  const [completingHabits, setCompletingHabits] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Arlo";
    loadData();
  }, [loadData]);

  const handleCompleteHabit = useCallback(async (habitId: string, skipped: boolean = false) => {
    if (completingHabits.has(habitId)) return;
    
    setCompletingHabits(prev => new Set(prev).add(habitId));
    
    try {
      const result = await completeHabit(habitId, skipped);
      
      if (result.success && result.xpEarned > 0) {
        setXpPopup({ amount: result.xpEarned, visible: true });
        setTimeout(() => setXpPopup({ amount: 0, visible: false }), 2000);
        
        if (result.bonuses.length > 0) {
          toast({
            title: skipped ? "Habit skipped" : "Habit completed!",
            description: result.bonuses.join(' • '),
          });
        }
      }
      
      return result;
    } finally {
      setCompletingHabits(prev => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  }, [completeHabit, completingHabits]);

  const handleStartRoutine = useCallback((routine: RoutineWithHabits) => {
    setFocusRoutine(routine);
  }, []);

  const handleCloseFocus = useCallback(() => {
    setFocusRoutine(null);
    loadData();
  }, [loadData]);

  // Filter today's data
  const todaysHabits = habits.filter(h => h.enabled && isScheduledForToday(h));
  const standaloneHabits = todaysHabits.filter(h => !h.routineId);
  const today = new Date().getDay();
  const todaysRoutines = routines.filter(r => {
    const isScheduled = r.scheduleDays?.includes(today) ?? true;
    return r.habits.length > 0 && isScheduled;
  });

  // Calculate progress
  const completedCount = todaysHabits.filter(h => h.completedToday).length;
  const totalCount = todaysHabits.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading habits...</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return <MobileHabitsView />;
  }

  // Build a unified list: routine items (as groups) + standalone habits
  const allItems: Array<{ type: 'routine'; routine: RoutineWithHabits } | { type: 'habit'; habit: HabitWithStreak }> = [];
  todaysRoutines.forEach(r => allItems.push({ type: 'routine', routine: r }));
  standaloneHabits.forEach(h => allItems.push({ type: 'habit', habit: h }));

  return (
    <>
      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {focusRoutine && (
          <FocusMode
            routine={focusRoutine}
            onComplete={handleCompleteHabit}
            onClose={handleCloseFocus}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
          {/* XP Popup */}
          <AnimatePresence>
            {xpPopup.visible && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg"
              >
                <Zap className="h-4 w-4" />
                +{xpPopup.amount} XP
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header — matches Productivity style */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Habits</h1>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(), "EEEE, MMMM d")} · {completedCount}/{totalCount} done
                  {(progress?.currentStreak || 0) > 0 && (
                    <> · <Flame className="inline h-3 w-3 text-orange-500 -mt-0.5" /> {progress?.currentStreak}d streak</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateRoutineOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Routine
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCreateHabitOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Habit
              </Button>
            </div>
          </header>

          {/* Tabs — matches Productivity style */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
              <TabsTrigger value="today" className="gap-2">
                <CalendarCheck className="h-4 w-4" />
                Today
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Insights
              </TabsTrigger>
              <TabsTrigger value="rewards" className="gap-2">
                <Gift className="h-4 w-4" />
                Rewards
                {(progress?.availableXp || 0) > 0 && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full ml-0.5">
                    {progress?.availableXp} XP
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-6">
              {/* Progress bar */}
              {totalCount > 0 && (
                <Progress value={progressPercent} className="h-1.5 mb-6" />
              )}

              {/* Unified habits list */}
              {allItems.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground mb-4">No habits scheduled for today</p>
                  <div className="flex gap-2 justify-center">
                    <Button size="sm" onClick={() => setCreateRoutineOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create Routine
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCreateHabitOpen(true)}>
                      Add Habit
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl">
                  <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden">
                    {allItems.map((item) => {
                      if (item.type === 'routine') {
                        const routine = item.routine;
                        const isComplete = routine.completedCount === routine.totalCount && routine.totalCount > 0;
                        const routineProgress = routine.totalCount > 0
                          ? Math.round((routine.completedCount / routine.totalCount) * 100) : 0;

                        return (
                          <div key={`routine-${routine.id}`}>
                            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                isComplete
                                  ? "bg-emerald-500 text-white"
                                  : "bg-primary/10 text-primary"
                              )}>
                                {isComplete ? <Check className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm font-medium text-foreground",
                                  isComplete && "text-muted-foreground"
                                )}>
                                  {routine.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-muted-foreground">
                                    {routine.completedCount}/{routine.totalCount}
                                  </span>
                                  <Progress value={routineProgress} className={cn("h-1 w-16", isComplete && "[&>div]:bg-emerald-500")} />
                                </div>
                              </div>
                              {!isComplete && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleStartRoutine(routine)}>
                                  Start <ChevronRight className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {routine.habits.map(habit => (
                              <HabitRow
                                key={habit.id}
                                habit={habit}
                                isCompleting={completingHabits.has(habit.id)}
                                onComplete={() => handleCompleteHabit(habit.id)}
                                onSkip={() => handleCompleteHabit(habit.id, true)}
                                indented
                              />
                            ))}
                          </div>
                        );
                      }

                      return (
                        <HabitRow
                          key={item.habit.id}
                          habit={item.habit}
                          isCompleting={completingHabits.has(item.habit.id)}
                          onComplete={() => handleCompleteHabit(item.habit.id)}
                          onSkip={() => handleCompleteHabit(item.habit.id, true)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <HabitInsights habits={habits} progress={progress} logs={logs} />
            </TabsContent>

            <TabsContent value="rewards" className="mt-6">
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
    </>
  );
}

// Clean list-row habit component
function HabitRow({ 
  habit, 
  isCompleting,
  onComplete, 
  onSkip,
  indented = false,
}: { 
  habit: HabitWithStreak; 
  isCompleting: boolean;
  onComplete: () => void; 
  onSkip: () => void;
  indented?: boolean;
}) {
  const isCompleted = habit.completedToday;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 transition-colors bg-card/60",
        "hover:bg-muted/30",
        indented && "pl-14",
        isCompleted && "opacity-60"
      )}
    >
      {/* Checkbox-style button */}
      <button
        onClick={onComplete}
        disabled={isCompleted || isCompleting}
        className={cn(
          "h-6 w-6 rounded-md flex items-center justify-center border-2 transition-all flex-shrink-0",
          isCompleted 
            ? "bg-emerald-500 border-emerald-500 text-white" 
            : "border-border hover:border-primary",
          isCompleting && "opacity-50"
        )}
      >
        {isCompleted && <Check className="h-3.5 w-3.5" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm text-foreground truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {habit.title}
        </p>
        <div className="flex items-center gap-2.5 mt-0.5">
          {habit.streak > 0 && (
            <span className="flex items-center gap-0.5 text-[11px] text-orange-500">
              <Flame className="h-2.5 w-2.5" />
              {habit.streak}d
            </span>
          )}
          {habit.durationMinutes && (
            <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {habit.durationMinutes}m
            </span>
          )}
        </div>
      </div>

      {/* Skip */}
      {!isCompleted && (
        <button
          onClick={onSkip}
          disabled={isCompleting}
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors flex-shrink-0 p-1"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
