import { motion } from "framer-motion";
import { useDashboardData } from "@/hooks/useDashboardData";
import { MobileGreeting } from "./MobileGreeting";
import { MobileTodayCard } from "./cards/MobileTodayCard";
import { MobileHabitsCard } from "./cards/MobileHabitsCard";
import { MobileFinanceCard } from "./cards/MobileFinanceCard";
import { MobileQuickActions } from "./cards/MobileQuickActions";
import { MobileInboxCard } from "./cards/MobileInboxCard";

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
      <div className="min-h-screen bg-background bg-atmosphere">
        <div className="px-5 pt-14 pb-28">
          {/* Skeleton with shimmer */}
          <div className="space-y-3">
            <div className="h-3 w-20 rounded-full shimmer" />
            <div className="h-8 w-44 rounded-lg shimmer" />
            <div className="flex gap-2 mt-4">
              <div className="h-7 w-16 rounded-full shimmer" />
              <div className="h-7 w-20 rounded-full shimmer" />
            </div>
          </div>
          <div className="mt-8 space-y-3">
            <div className="h-44 rounded-2xl shimmer" />
            <div className="h-24 rounded-2xl shimmer" />
            <div className="h-32 rounded-2xl shimmer" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-atmosphere bg-noise">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="pb-28 pt-12 relative z-10"
      >
        {/* Greeting */}
        <MobileGreeting
          tasksToday={totalTasks}
          tasksDone={tasksCompletedToday}
          eventsToday={0}
          habitsToday={totalHabitsToday}
          habitsDone={habitsCompletedToday}
        />

        {/* Cards with staggered animation */}
        <div className="px-4 mt-8 space-y-3">
          {/* Primary: Today tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <MobileHabitsCard
                completed={habitsCompletedToday}
                total={totalHabitsToday}
                streak={currentStreak}
                xp={totalXp}
              />
            </motion.div>
          )}

          {/* Inbox preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <MobileInboxCard
              unreadCount={0}
              emails={[]}
            />
          </motion.div>

          {/* Finance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8"
        >
          <MobileQuickActions />
        </motion.div>
      </motion.div>
    </div>
  );
}
