import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  Flame,
  Gift,
  BarChart3,
  Check,
  SkipForward,
  Zap,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useHabits, isScheduledForToday } from "@/hooks/useHabits";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { CreateRoutineDialog } from "@/components/habits/CreateRoutineDialog";
import { HabitInsights } from "@/components/habits/HabitInsights";
import { RewardsStore } from "@/components/habits/RewardsStore";
import { FocusMode } from "@/components/habits/FocusMode";
import { toast } from "@/hooks/use-toast";
import type { RoutineWithHabits, HabitWithStreak } from "@/types/habits";
import { MobilePageLayout } from "../MobilePageLayout";

export function MobileHabitsView() {
  const {
    habits,
    routines,
    progress,
    rewards,
    logs,
    loading,
    loadData,
    completeHabit,
  } = useHabits();

  const [createHabitOpen, setCreateHabitOpen] = useState(false);
  const [createRoutineOpen, setCreateRoutineOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"insights" | "rewards">("insights");
  const [xpPopup, setXpPopup] = useState({ amount: 0, visible: false });
  const [focusRoutine, setFocusRoutine] = useState<RoutineWithHabits | null>(null);
  const [completingHabits, setCompletingHabits] = useState<Set<string>>(new Set());

  useEffect(() => {
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
      <MobilePageLayout title="Habits" subtitle={format(new Date(), "EEEE, MMMM d")}>
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading habits...</p>
          </div>
        </div>
      </MobilePageLayout>
    );
  }

  return (
    <>
      <AnimatePresence>
        {focusRoutine && (
          <FocusMode
            routine={focusRoutine}
            onComplete={handleCompleteHabit}
            onClose={handleCloseFocus}
          />
        )}
      </AnimatePresence>

      <MobilePageLayout 
        title="Habits" 
        subtitle={format(new Date(), "EEEE, MMMM d")}
        headerRight={
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => setCreateHabitOpen(true)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        }
      >
        <div className="space-y-6">
          {/* XP Popup */}
          <AnimatePresence>
            {xpPopup.visible && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg"
              >
                <Zap className="h-4 w-4" />
                +{xpPopup.amount} XP
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-card border"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Today's Progress</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{completedCount}</span>
                  <span className="text-lg text-muted-foreground">/ {totalCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-500">
                    <Flame className="h-4 w-4" />
                    <span className="font-bold">{progress?.currentStreak || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">streak</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-500">
                    <Zap className="h-4 w-4" />
                    <span className="font-bold">{progress?.availableXp || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </motion.div>

          {/* Routines */}
          {todaysRoutines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-muted-foreground">Routines</h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setCreateRoutineOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </div>
              <div className="space-y-2">
                {todaysRoutines.map((routine, index) => {
                  const routineProgress = routine.totalCount > 0 
                    ? Math.round((routine.completedCount / routine.totalCount) * 100)
                    : 0;
                  const isComplete = routine.completedCount === routine.totalCount && routine.totalCount > 0;

                  return (
                    <motion.div
                      key={routine.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-4 rounded-xl border bg-card",
                        isComplete && "border-emerald-500/30 bg-emerald-500/5"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            isComplete 
                              ? "bg-emerald-500 text-white" 
                              : "bg-primary/10 text-primary"
                          )}>
                            {isComplete ? <Check className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                          </div>
                          <div>
                            <h3 className="font-medium">{routine.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {routine.completedCount}/{routine.totalCount} completed
                            </p>
                          </div>
                        </div>
                        {!isComplete && (
                          <Button size="sm" onClick={() => handleStartRoutine(routine)}>
                            Start
                          </Button>
                        )}
                      </div>
                      <Progress 
                        value={routineProgress} 
                        className={cn("h-1.5", isComplete && "[&>div]:bg-emerald-500")}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Habits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                {todaysRoutines.length > 0 ? "Individual Habits" : "Habits"}
              </h2>
            </div>

            {standaloneHabits.length === 0 && todaysRoutines.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-xl border border-dashed bg-muted/20 text-center"
              >
                <Flame className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No habits yet</p>
                <Button size="sm" onClick={() => setCreateHabitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Habit
                </Button>
              </motion.div>
            ) : standaloneHabits.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed bg-muted/20 text-center">
                <p className="text-sm text-muted-foreground">No standalone habits</p>
              </div>
            ) : (
              <div className="space-y-2">
                {standaloneHabits.map((habit, index) => (
                  <MobileHabitItem
                    key={habit.id}
                    habit={habit}
                    index={index}
                    isCompleting={completingHabits.has(habit.id)}
                    onComplete={() => handleCompleteHabit(habit.id)}
                    onSkip={() => handleCompleteHabit(habit.id, true)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setSheetTab("insights");
                setSheetOpen(true);
              }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm">Insights</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setSheetTab("rewards");
                setSheetOpen(true);
              }}
            >
              <Gift className="h-5 w-5 text-primary" />
              <span className="text-sm">Rewards</span>
            </Button>
          </section>
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

        {/* Insights & Rewards Sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                {sheetTab === "insights" ? (
                  <>
                    <BarChart3 className="h-5 w-5" />
                    Insights
                  </>
                ) : (
                  <>
                    <Gift className="h-5 w-5" />
                    Rewards
                  </>
                )}
              </SheetTitle>
            </SheetHeader>
            
            <div className="flex gap-2 mb-4">
              <Button
                variant={sheetTab === "insights" ? "default" : "outline"}
                size="sm"
                onClick={() => setSheetTab("insights")}
              >
                Insights
              </Button>
              <Button
                variant={sheetTab === "rewards" ? "default" : "outline"}
                size="sm"
                onClick={() => setSheetTab("rewards")}
              >
                Rewards
              </Button>
            </div>

            {sheetTab === "insights" ? (
              <HabitInsights habits={habits} progress={progress} logs={logs} />
            ) : (
              <RewardsStore 
                rewards={rewards}
                availableXp={progress?.availableXp || 0}
                onRefresh={loadData}
              />
            )}
          </SheetContent>
        </Sheet>
      </MobilePageLayout>
    </>
  );
}

// Mobile habit item component
function MobileHabitItem({ 
  habit, 
  index,
  isCompleting,
  onComplete, 
  onSkip 
}: { 
  habit: HabitWithStreak; 
  index: number;
  isCompleting: boolean;
  onComplete: () => void; 
  onSkip: () => void;
}) {
  const isCompleted = habit.completedToday;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border bg-card transition-all",
        isCompleted && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      {/* Check button */}
      <button
        onClick={onComplete}
        disabled={isCompleted || isCompleting}
        className={cn(
          "h-10 w-10 rounded-lg flex items-center justify-center border-2 transition-all shrink-0",
          isCompleted 
            ? "bg-emerald-500 border-emerald-500 text-white" 
            : "border-border active:scale-95",
          isCompleting && "opacity-50"
        )}
      >
        <Check className={cn("h-5 w-5", !isCompleted && "text-muted-foreground")} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium truncate",
          isCompleted && "text-muted-foreground line-through"
        )}>
          {habit.title}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {habit.streak > 0 && (
            <span className="flex items-center gap-1 text-orange-500">
              <Flame className="h-3 w-3" />
              {habit.streak}d
            </span>
          )}
          <span>+{habit.difficulty === 'hard' ? 25 : habit.difficulty === 'medium' ? 15 : 10} XP</span>
        </div>
      </div>

      {/* Skip button */}
      {!isCompleted && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground shrink-0"
          onClick={onSkip}
          disabled={isCompleting}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
}
