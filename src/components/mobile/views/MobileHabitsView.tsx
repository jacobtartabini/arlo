import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  Flame,
  Gift,
  BarChart3,
  Calendar,
  Check,
  ChevronRight,
  Zap,
  Target,
  Sparkles,
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
import type { RoutineWithHabits } from "@/types/habits";
import { MobilePageLayout } from "../MobilePageLayout";

export function MobileHabitsView() {
  const navigate = useNavigate();
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
  const [manageSheetOpen, setManageSheetOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"insights" | "rewards">("insights");
  const [xpPopup, setXpPopup] = useState({ amount: 0, visible: false });
  const [focusRoutine, setFocusRoutine] = useState<RoutineWithHabits | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCompleteHabit = useCallback(async (habitId: string, skipped: boolean = false) => {
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
  }, [completeHabit]);

  const handleStartRoutine = useCallback((routine: RoutineWithHabits) => {
    setFocusRoutine(routine);
  }, []);

  const handleCloseFocus = useCallback(() => {
    setFocusRoutine(null);
    loadData();
  }, [loadData]);

  // Filter today's data
  const todaysHabits = habits.filter(h => h.enabled && isScheduledForToday(h));
  const completedToday = todaysHabits.filter(h => 
    logs.some(l => l.habitId === h.id && format(new Date(l.completedAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
  );
  const completionPercentage = todaysHabits.length > 0 
    ? Math.round((completedToday.length / todaysHabits.length) * 100) 
    : 0;

  const today = new Date().getDay();
  const todaysRoutines = routines.filter(r => {
    const isScheduled = r.scheduleDays?.includes(today) ?? true;
    return r.habits.length > 0 && isScheduled;
  });

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
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold flex items-center gap-2"
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
            className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Today's Progress</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{completedToday.length}</span>
                  <span className="text-muted-foreground">/ {todaysHabits.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-amber-500">
                    <Flame className="h-4 w-4" />
                    <span className="font-semibold">{progress?.currentStreak || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Day streak</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span className="font-semibold">{progress?.availableXp || 0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </motion.div>

          {/* Routines */}
          {todaysRoutines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Routines
                </h2>
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
              <div className="space-y-3">
                {todaysRoutines.map((routine, index) => {
                  const completedCount = routine.habits.filter(h =>
                    logs.some(l => l.habitId === h.id && format(new Date(l.completedAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
                  ).length;
                  const routineProgress = routine.habits.length > 0 
                    ? Math.round((completedCount / routine.habits.length) * 100) 
                    : 0;

                  return (
                    <motion.button
                      key={routine.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleStartRoutine(routine)}
                      className="w-full p-4 rounded-xl bg-card border border-border/50 text-left active:scale-[0.98] transition-transform"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Target className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{routine.name}</h3>
                            <p className="text-xs text-muted-foreground">
                              {completedCount}/{routine.habits.length} completed
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <Progress value={routineProgress} className="h-1.5" />
                    </motion.button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Individual Habits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Habits
              </h2>
            </div>

            {todaysHabits.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 rounded-2xl border border-dashed bg-muted/20 text-center"
              >
                <Flame className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">No habits for today</p>
                <Button size="sm" onClick={() => setCreateHabitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Habit
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {todaysHabits.map((habit, index) => {
                  const isCompleted = logs.some(
                    l => l.habitId === habit.id && 
                    format(new Date(l.completedAt), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  );

                  return (
                    <motion.button
                      key={habit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => !isCompleted && handleCompleteHabit(habit.id)}
                      disabled={isCompleted}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98]",
                        isCompleted
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card border-border/50"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        isCompleted
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      )}>
                        {isCompleted && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={cn(
                          "font-medium",
                          isCompleted && "line-through text-muted-foreground"
                        )}>
                          {habit.title}
                        </p>
                        {habit.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {habit.description}
                          </p>
                        )}
                      </div>
                      {habit.difficulty && (
                        <span className="text-xs text-muted-foreground">
                          +{habit.difficulty === 'hard' ? 15 : 10} XP
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setManageTab("insights");
                setManageSheetOpen(true);
              }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm">Insights</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setManageTab("rewards");
                setManageSheetOpen(true);
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
        <Sheet open={manageSheetOpen} onOpenChange={setManageSheetOpen}>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center gap-2">
                {manageTab === "insights" ? (
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
                variant={manageTab === "insights" ? "default" : "outline"}
                size="sm"
                onClick={() => setManageTab("insights")}
              >
                Insights
              </Button>
              <Button
                variant={manageTab === "rewards" ? "default" : "outline"}
                size="sm"
                onClick={() => setManageTab("rewards")}
              >
                Rewards
              </Button>
            </div>

            {manageTab === "insights" ? (
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
