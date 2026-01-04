import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Flame, Calendar, Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStreak, UserProgress, HabitLog } from "@/types/habits";
import { MonthlyHeatmap } from "./MonthlyHeatmap";

interface HabitInsightsProps {
  habits: HabitWithStreak[];
  progress: UserProgress | null;
  logs?: HabitLog[];
}

export function HabitInsights({ habits, progress, logs = [] }: HabitInsightsProps) {
  const insights = useMemo(() => {
    if (habits.length === 0) return null;

    // Most consistent habits (highest streak)
    const sortedByStreak = [...habits].sort((a, b) => b.streak - a.streak);
    const topHabits = sortedByStreak.slice(0, 3);

    // Best performing habits (highest last 7 days ratio)
    const sortedByWeek = [...habits].sort((a, b) => b.last7Days - a.last7Days);
    
    // Calculate weekly alignment trend (mock data for now based on streaks)
    const weeklyData = [
      habits.filter(h => h.last7Days >= 6).length,
      habits.filter(h => h.last7Days >= 5).length,
      habits.filter(h => h.last7Days >= 4).length,
      habits.filter(h => h.last7Days >= 3).length,
    ];

    // Average completion rate
    const avgCompletionRate = habits.length > 0
      ? Math.round(habits.reduce((sum, h) => sum + (h.last7Days / 7) * 100, 0) / habits.length)
      : 0;

    return {
      topHabits,
      sortedByWeek,
      weeklyData,
      avgCompletionRate,
      totalStreak: progress?.currentStreak || 0,
      longestStreak: progress?.longestStreak || 0,
    };
  }, [habits, progress]);

  if (!insights || habits.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">
          Start tracking habits to see your insights
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Weekly Rate</span>
          </div>
          <p className="text-2xl font-bold">{insights.avgCompletionRate}%</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs">Current Streak</span>
          </div>
          <p className="text-2xl font-bold">{insights.totalStreak} days</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Star className="h-4 w-4 text-amber-500" />
            <span className="text-xs">Best Streak</span>
          </div>
          <p className="text-2xl font-bold">{insights.longestStreak} days</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Active Habits</span>
          </div>
          <p className="text-2xl font-bold">{habits.filter(h => h.enabled).length}</p>
        </Card>
      </div>

      {/* Most Consistent Habits */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Most Consistent Habits
        </h3>
        <div className="space-y-3">
          {insights.topHabits.map((habit, index) => (
            <div key={habit.id} className="flex items-center gap-3">
              <span className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                index === 0 && "bg-amber-500/10 text-amber-500",
                index === 1 && "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300",
                index === 2 && "bg-orange-200/50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              )}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{habit.title}</p>
                <p className="text-xs text-muted-foreground">{habit.streak} day streak</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{habit.last7Days}/7</p>
                <p className="text-xs text-muted-foreground">this week</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weekly Performance */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          This Week's Performance
        </h3>
        <div className="space-y-3">
          {habits.slice(0, 5).map((habit) => {
            const percentage = Math.round((habit.last7Days / 7) * 100);
            return (
              <div key={habit.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1">{habit.title}</span>
                  <span className="text-muted-foreground ml-2">{habit.last7Days}/7</span>
                </div>
                <Progress 
                  value={percentage} 
                  className={cn(
                    "h-2",
                    percentage >= 80 && "[&>div]:bg-emerald-500",
                    percentage >= 50 && percentage < 80 && "[&>div]:bg-amber-500",
                    percentage < 50 && "[&>div]:bg-rose-500"
                  )}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Monthly Heatmap */}
      <Card className="p-5">
        <MonthlyHeatmap habits={habits} logs={logs} />
      </Card>

      {/* Tips Section */}
      <Card className="p-5 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-2">💡 Tip</h3>
        <p className="text-sm text-muted-foreground">
          {insights.avgCompletionRate >= 80 
            ? "Amazing consistency! You're in the Daily Win zone. Keep up the momentum!"
            : insights.avgCompletionRate >= 50
            ? "Good progress! Focus on your top habits to build stronger streaks."
            : "Start small! Pick 1-2 habits to focus on and build from there."
          }
        </p>
      </Card>
    </div>
  );
}
