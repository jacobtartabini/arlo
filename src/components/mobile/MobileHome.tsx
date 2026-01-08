import { useMemo } from "react";
import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MobileGreeting } from "./MobileGreeting";
import { MobileTodayCard } from "./cards/MobileTodayCard";
import { MobileHabitsCard } from "./cards/MobileHabitsCard";
import { MobileFinanceCard } from "./cards/MobileFinanceCard";
import { MobileQuickActions } from "./cards/MobileQuickActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

export function MobileHome() {
  const dashboardData = useDashboardData();
  
  const {
    todayTasks,
    tasksCompletedToday,
    tasksDueToday,
    habitsCompletedToday,
    totalHabitsToday,
    currentStreak,
    totalXp,
    monthlySpending,
    monthlyBudget,
    recentTransactions,
    isLoading,
    onTaskToggle,
    onTaskCreate,
  } = dashboardData;

  const totalTasks = tasksCompletedToday + tasksDueToday;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-5 pt-4 pb-2">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-8 w-48 mb-1" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="px-5 space-y-4 mt-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Scrollable content with safe area padding */}
      <div className="pb-24 overflow-y-auto">
        {/* Greeting section */}
        <MobileGreeting
          tasksToday={totalTasks}
          tasksDone={tasksCompletedToday}
          eventsToday={0}
          habitsToday={totalHabitsToday}
          habitsDone={habitsCompletedToday}
        />

        {/* Cards stack */}
        <div className="px-5 space-y-4 mt-2">
          {/* Primary card - Today/Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <MobileTodayCard
              tasks={todayTasks}
              completedCount={tasksCompletedToday}
              totalCount={totalTasks}
              onTaskToggle={onTaskToggle}
              onTaskCreate={onTaskCreate}
            />
          </motion.div>

          {/* Habits card */}
          {totalHabitsToday > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <MobileHabitsCard
                completed={habitsCompletedToday}
                total={totalHabitsToday}
                streak={currentStreak}
                xp={totalXp}
              />
            </motion.div>
          )}

          {/* Finance snapshot */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <MobileFinanceCard
              monthlySpending={monthlySpending}
              monthlyBudget={monthlyBudget}
              recentTransactions={recentTransactions}
            />
          </motion.div>
        </div>

        {/* Quick actions grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6"
        >
          <MobileQuickActions />
        </motion.div>

        {/* Bottom spacing for tab bar */}
        <div className="h-8" />
      </div>
    </div>
  );
}
