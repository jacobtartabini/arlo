// =============================================================
// Productivity System Types
// =============================================================

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type BlockType = 'focus' | 'soft' | 'break';
export type LinkType = 'link' | 'file' | 'note';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  color: string;
  icon: string;
  startDate?: Date;
  targetDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  taskCount?: number;
  completedTaskCount?: number;
  progress?: number;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description?: string;
  done: boolean;
  priority: number;
  dueDate?: Date;
  scheduledDate?: Date;
  timeEstimateMinutes?: number;
  energyLevel: EnergyLevel;
  category: string;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  // Related data (populated on fetch)
  subtasks?: Subtask[];
  project?: Project;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeBlock {
  id: string;
  taskId?: string;
  calendarEventId?: string;
  startTime: Date;
  endTime: Date;
  blockType: BlockType;
  isCompleted: boolean;
  actualDurationMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Related data
  task?: Task;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  linkType: LinkType;
  createdAt: Date;
}

// =============================================================
// Database Row Types (snake_case)
// =============================================================

export interface DbProject {
  id: string;
  user_id: string | null;
  user_key: string | null;
  name: string;
  description: string | null;
  status: string;
  color: string;
  icon: string;
  start_date: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
  id: string;
  user_id: string | null;
  user_key: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  done: boolean;
  priority: number;
  due_date: string | null;
  scheduled_date: string | null;
  time_estimate_minutes: number | null;
  energy_level: string | null;
  category: string | null;
  order_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubtask {
  id: string;
  task_id: string;
  user_id: string | null;
  user_key: string | null;
  title: string;
  done: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DbTimeBlock {
  id: string;
  user_id: string | null;
  user_key: string | null;
  task_id: string | null;
  calendar_event_id: string | null;
  start_time: string;
  end_time: string;
  block_type: string;
  is_completed: boolean;
  actual_duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProjectLink {
  id: string;
  project_id: string;
  user_id: string | null;
  user_key: string | null;
  title: string;
  url: string;
  link_type: string;
  created_at: string;
}

// =============================================================
// Conversion Helpers
// =============================================================

export const dbToProject = (db: DbProject): Project => ({
  id: db.id,
  name: db.name,
  description: db.description ?? undefined,
  status: db.status as ProjectStatus,
  color: db.color,
  icon: db.icon,
  startDate: db.start_date ? new Date(db.start_date) : undefined,
  targetDate: db.target_date ? new Date(db.target_date) : undefined,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToTask = (db: DbTask): Task => ({
  id: db.id,
  projectId: db.project_id ?? undefined,
  title: db.title,
  description: db.description ?? undefined,
  done: db.done,
  priority: db.priority,
  dueDate: db.due_date ? new Date(db.due_date) : undefined,
  scheduledDate: db.scheduled_date ? new Date(db.scheduled_date) : undefined,
  timeEstimateMinutes: db.time_estimate_minutes ?? undefined,
  energyLevel: (db.energy_level as EnergyLevel) ?? 'medium',
  category: db.category ?? 'general',
  orderIndex: db.order_index ?? 0,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToSubtask = (db: DbSubtask): Subtask => ({
  id: db.id,
  taskId: db.task_id,
  title: db.title,
  done: db.done,
  orderIndex: db.order_index,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToTimeBlock = (db: DbTimeBlock): TimeBlock => ({
  id: db.id,
  taskId: db.task_id ?? undefined,
  calendarEventId: db.calendar_event_id ?? undefined,
  startTime: new Date(db.start_time),
  endTime: new Date(db.end_time),
  blockType: db.block_type as BlockType,
  isCompleted: db.is_completed,
  actualDurationMinutes: db.actual_duration_minutes ?? undefined,
  notes: db.notes ?? undefined,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export const dbToProjectLink = (db: DbProjectLink): ProjectLink => ({
  id: db.id,
  projectId: db.project_id,
  title: db.title,
  url: db.url,
  linkType: db.link_type as LinkType,
  createdAt: new Date(db.created_at),
});
