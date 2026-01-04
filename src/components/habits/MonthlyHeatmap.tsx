import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subMonths,
  getDay,
  isSameDay,
  isToday,
  isFuture,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { HabitWithStreak, HabitLog } from "@/types/habits";

interface MonthlyHeatmapProps {
  habits: HabitWithStreak[];
  logs: HabitLog[];
  className?: string;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthlyHeatmap({ habits, logs, className }: MonthlyHeatmapProps) {
  // Get last 3 months of data
  const months = useMemo(() => {
    const today = new Date();
    return [subMonths(today, 2), subMonths(today, 1), today];
  }, []);

  // Calculate completion rate per day
  const dayData = useMemo(() => {
    const data: Record<string, { completed: number; total: number; rate: number }> = {};

    months.forEach((month) => {
      const days = eachDayOfInterval({
        start: startOfMonth(month),
        end: endOfMonth(month),
      });

      days.forEach((day) => {
        if (isFuture(day)) return;

        const dayKey = format(day, "yyyy-MM-dd");
        const dayOfWeek = getDay(day);

        // Find habits scheduled for this day
        const scheduledHabits = habits.filter((h) => {
          if (!h.enabled) return false;
          const scheduleDays = h.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6];
          return scheduleDays.includes(dayOfWeek);
        });

        // Find completed logs for this day
        const dayLogs = logs.filter((log) => {
          if (log.skipped) return false;
          const logDate = new Date(log.completedAt);
          return isSameDay(logDate, day);
        });

        const completedHabitIds = new Set(dayLogs.map((l) => l.habitId));
        const completedCount = scheduledHabits.filter((h) =>
          completedHabitIds.has(h.id)
        ).length;

        data[dayKey] = {
          completed: completedCount,
          total: scheduledHabits.length,
          rate: scheduledHabits.length > 0 ? completedCount / scheduledHabits.length : 0,
        };
      });
    });

    return data;
  }, [months, habits, logs]);

  const getIntensityClass = (rate: number) => {
    if (rate === 0) return "bg-muted";
    if (rate < 0.25) return "bg-emerald-200 dark:bg-emerald-900/40";
    if (rate < 0.5) return "bg-emerald-300 dark:bg-emerald-800/60";
    if (rate < 0.75) return "bg-emerald-400 dark:bg-emerald-700/80";
    if (rate < 1) return "bg-emerald-500 dark:bg-emerald-600";
    return "bg-emerald-600 dark:bg-emerald-500";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Legend */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Consistency Heatmap
        </h3>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-0.5">
            {[0, 0.25, 0.5, 0.75, 1].map((rate) => (
              <div
                key={rate}
                className={cn("w-3 h-3 rounded-sm", getIntensityClass(rate))}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Months Grid */}
      <div className="space-y-6">
        {months.map((month) => {
          const days = eachDayOfInterval({
            start: startOfMonth(month),
            end: endOfMonth(month),
          });

          const firstDayOfWeek = getDay(startOfMonth(month));
          const paddingDays = Array(firstDayOfWeek).fill(null);

          return (
            <div key={month.toISOString()}>
              <p className="text-sm font-medium mb-2">{format(month, "MMMM yyyy")}</p>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div
                    key={i}
                    className="text-[10px] text-center text-muted-foreground font-medium"
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Padding for first week */}
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}

                {/* Actual days */}
                {days.map((day) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const data = dayData[dayKey];
                  const isTodayDate = isToday(day);
                  const isFutureDate = isFuture(day);

                  return (
                    <motion.div
                      key={dayKey}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: days.indexOf(day) * 0.01 }}
                      className={cn(
                        "aspect-square rounded-sm relative group cursor-default transition-transform hover:scale-110",
                        isFutureDate && "bg-muted/30",
                        !isFutureDate && data && getIntensityClass(data.rate),
                        isTodayDate && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                      title={
                        data
                          ? `${format(day, "MMM d")}: ${data.completed}/${data.total} completed (${Math.round(data.rate * 100)}%)`
                          : format(day, "MMM d")
                      }
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border">
                          {data ? (
                            <>
                              <span className="font-medium">{format(day, "MMM d")}</span>
                              <span className="text-muted-foreground ml-1">
                                {data.completed}/{data.total}
                              </span>
                            </>
                          ) : (
                            format(day, "MMM d")
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 pt-2 border-t">
        {(() => {
          const allDays = Object.values(dayData);
          const totalDays = allDays.length;
          const perfectDays = allDays.filter((d) => d.rate === 1).length;
          const avgRate =
            totalDays > 0
              ? allDays.reduce((sum, d) => sum + d.rate, 0) / totalDays
              : 0;

          return (
            <>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {perfectDays}
                </p>
                <p className="text-xs text-muted-foreground">Perfect Days</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{Math.round(avgRate * 100)}%</p>
                <p className="text-xs text-muted-foreground">Avg Completion</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{totalDays}</p>
                <p className="text-xs text-muted-foreground">Days Tracked</p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
