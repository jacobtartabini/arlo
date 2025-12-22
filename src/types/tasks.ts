export interface Task {
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
