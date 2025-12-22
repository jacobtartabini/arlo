export interface Habit {
  id: string;
  title: string;
  description?: string;
  category: 'routine' | 'experiment' | 'reflection';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  completedAt: Date;
  notes?: string;
}

export interface HabitWithStreak extends Habit {
  streak: number;
  lastCompleted?: Date;
}
