import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MobileGreeting } from "./MobileGreeting";
import { MobileTodayCard } from "./cards/MobileTodayCard";
import { MobileHabitsCard } from "./cards/MobileHabitsCard";
import { MobileFinanceCard } from "./cards/MobileFinanceCard";
import { MobileQuickActions } from "./cards/MobileQuickActions";
import { MobileInboxCard } from "./cards/MobileInboxCard";
import { cn } from "@/lib/utils";

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
      <div className="min-h-screen bg-background">
        <div className="px-6 pt-12 pb-24 animate-pulse">
          <div className="h-4 w-24 bg-muted rounded mb-2" />
          <div className="h-8 w-40 bg-muted rounded mb-4" />
          <div className="flex gap-2 mb-8">
            <div className="h-6 w-20 bg-muted rounded-full" />
            <div className="h-6 w-24 bg-muted rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="h-48 bg-muted rounded-2xl" />
            <div className="h-28 bg-muted rounded-2xl" />
            <div className="h-36 bg-muted rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pb-28 pt-12"
      >
        {/* Greeting */}
        <MobileGreeting
          tasksToday={totalTasks}
          tasksDone={tasksCompletedToday}
          eventsToday={0}
          habitsToday={totalHabitsToday}
          habitsDone={habitsCompletedToday}
        />

        {/* Cards */}
        <div className="px-4 mt-6 space-y-3">
          {/* Primary: Today tasks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <MobileTodayCard
              tasks={todayTasks}
              completedCount={tasksCompletedToday}
              totalCount={totalTasks}
              onTaskToggle={onTaskToggle}
              onTaskCreate={onTaskCreate}
            />
          </motion.div>

          {/* Habits */}
          {totalHabitsToday > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <MobileHabitsCard
                completed={habitsCompletedToday}
                total={totalHabitsToday}
                streak={currentStreak}
                xp={totalXp}
              />
            </motion.div>
          )}

          {/* Inbox preview - only if there are emails */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <MobileInboxCard
              unreadCount={0}
              emails={[]}
            />
          </motion.div>

          {/* Finance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
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

        {/* Quick actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-8"
        >
          <MobileQuickActions />
        </motion.div>
      </motion.div>
    </div>
  );
}
