import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Plus,
  Sparkles,
  Gift,
  BarChart3,
  Flame,
  ChevronRight,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHabits, isScheduledForToday } from "@/hooks/useHabits";
import { ProgressHeader } from "@/components/habits/ProgressHeader";
import { RoutineSection } from "@/components/habits/RoutineSection";
import { QuickHabitItem } from "@/components/habits/QuickHabitItem";
import { QuickRewards } from "@/components/habits/QuickRewards";
import { CreateHabitDialog } from "@/components/habits/CreateHabitDialog";
import { CreateRoutineDialog } from "@/components/habits/CreateRoutineDialog";
import { HabitInsights } from "@/components/habits/HabitInsights";
import { RewardsStore } from "@/components/habits/RewardsStore";
import { toast } from "@/hooks/use-toast";

export default function Habits() {
  const navigate = useNavigate();
  const {
    habits,
    routines,
    progress,
    rewards,
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

  useEffect(() => {
    document.title = "Arlo";
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
  }, [completeHabit]);

  const handleRedeemReward = useCallback(async (rewardId: string) => {
    const success = await redeemReward(rewardId);
    if (success) {
      toast({
        title: "Reward claimed! 🎉",
        description: "Enjoy your well-earned reward",
      });
    }
    return success;
  }, [redeemReward]);

  // Filter today's data
  const todaysHabits = habits.filter(h => h.enabled && isScheduledForToday(h));
  const standaloneHabits = todaysHabits.filter(h => !h.routineId);
  const activeRoutines = routines.filter(r => r.habits.length > 0);

  // Loading state
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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-24">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
              <h1 className="text-2xl font-bold">Habits</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Back
              </Button>
            </div>
          </div>

          {/* Progress Stats */}
          <ProgressHeader 
            progress={progress} 
            habits={habits}
            xpPopup={xpPopup}
          />
        </header>

        {/* Main Content - Unified Flow */}
        <div className="space-y-6">
          {/* Active Routines */}
          {activeRoutines.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground">Routines</h2>
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
                {activeRoutines.map(routine => (
                  <RoutineSection
                    key={routine.id}
                    routine={routine}
                    onCompleteHabit={handleCompleteHabit}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Standalone Habits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {standaloneHabits.length > 0 ? "Today's Habits" : "Habits"}
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => setCreateHabitOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            
            {standaloneHabits.length === 0 && habits.length === 0 && routines.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-8 rounded-2xl border border-dashed bg-muted/30 text-center"
              >
                <Flame className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">Start building your habits</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setCreateHabitOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Habit
                  </Button>
                  <Button variant="outline" onClick={() => setCreateRoutineOpen(true)}>
                    Create Routine
                  </Button>
                </div>
              </motion.div>
            ) : standaloneHabits.length === 0 && habits.filter(h => !h.routineId).length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed bg-muted/30 text-center">
                <p className="text-sm text-muted-foreground mb-3">No standalone habits for today</p>
                <Button variant="outline" size="sm" onClick={() => setCreateHabitOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Habit
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {standaloneHabits.map((habit, index) => (
                  <motion.div
                    key={habit.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <QuickHabitItem
                      habit={habit}
                      onComplete={() => handleCompleteHabit(habit.id)}
                      onSkip={() => handleCompleteHabit(habit.id, true)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Rewards Section */}
          <section>
            <QuickRewards
              rewards={rewards}
              availableXp={progress?.availableXp || 0}
              onRedeem={handleRedeemReward}
              onViewAll={() => {
                setManageTab("rewards");
                setManageSheetOpen(true);
              }}
            />
          </section>

          {/* Insights & More - Bottom Actions */}
          <section className="pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={() => {
                  setManageTab("insights");
                  setManageSheetOpen(true);
                }}
              >
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-sm">View Insights</span>
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
                <span className="text-sm">Manage Rewards</span>
              </Button>
            </div>
          </section>
        </div>
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
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>
              <Tabs value={manageTab} onValueChange={(v) => setManageTab(v as typeof manageTab)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="insights" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Insights
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="gap-2">
                    <Gift className="h-4 w-4" />
                    Rewards
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="insights" className="mt-4">
                  <HabitInsights habits={habits} progress={progress} />
                </TabsContent>

                <TabsContent value="rewards" className="mt-4">
                  <RewardsStore 
                    rewards={rewards}
                    availableXp={progress?.availableXp || 0}
                    onRefresh={loadData}
                  />
                </TabsContent>
              </Tabs>
            </SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}
