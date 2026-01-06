// Re-export from productivity types for backwards compatibility
export type { Task, EnergyLevel } from './productivity';

// Legacy Task interface (deprecated - use productivity types)
export interface LegacyTask {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  priority: number;
  dueDate?: Date;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}
