export type HabitType = 'check' | 'count' | 'duration';
export type ScheduleType = 'daily' | 'weekdays' | 'weekends' | 'custom' | 'weekly';
export type Difficulty = 'normal' | 'hard';
export type RoutineType = 'morning' | 'night' | 'custom';

export interface Habit {
  id: string;
  title: string;
  description?: string;
  icon: string;
  category: 'routine' | 'experiment' | 'reflection';
  habitType: HabitType;
  targetValue: number;
  scheduleType: ScheduleType;
  scheduleDays: number[];
  weeklyFrequency: number;
  difficulty: Difficulty;
  routineId?: string;
  routineOrder: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: Date;
  value: number;
  skipped: boolean;
  notes?: string;
}

export interface HabitWithStreak extends Habit {
  streak: number;
  lastCompleted?: Date;
  completedToday: boolean;
  last7Days: number;
}

export interface Routine {
  id: string;
  name: string;
  icon: string;
  routineType: RoutineType;
  anchorCue?: string;
  rewardDescription?: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoutineWithHabits extends Routine {
  habits: HabitWithStreak[];
  completedCount: number;
  totalCount: number;
}

export interface UserProgress {
  id: string;
  totalXp: number;
  availableXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: Date;
}

export interface Reward {
  id: string;
  name: string;
  description?: string;
  xpCost: number;
  icon: string;
  enabled: boolean;
  createdAt: Date;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  xpSpent: number;
  redeemedAt: Date;
}

export interface XpEvent {
  id: string;
  eventType: string;
  xpAmount: number;
  description?: string;
  referenceId?: string;
  createdAt: Date;
}

// XP Constants
export const XP_VALUES = {
  HABIT_NORMAL: 10,
  HABIT_HARD: 15,
  ROUTINE_COMPLETE: 25,
  DOUBLE_ROUTINE_BONUS: 40,
  STREAK_CONTINUE: 3,
  STREAK_MILESTONE_7: 20,
  STREAK_MILESTONE_14: 20,
  STREAK_MILESTONE_30: 20,
  DAILY_WIN: 30,
  COMEBACK: 10,
} as const;

// Level thresholds
export const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100, 10500
];

export function calculateLevel(totalXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function xpToNextLevel(totalXp: number): { current: number; next: number; progress: number } {
  const level = calculateLevel(totalXp);
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level] || current + 1000;
  const progress = Math.round(((totalXp - current) / (next - current)) * 100);
  return { current, next, progress };
}
