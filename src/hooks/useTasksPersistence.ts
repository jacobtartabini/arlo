import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/types/tasks";

interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  done: boolean;
  priority: number;
  due_date: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

const dbToTask = (db: DbTask): Task => ({
  id: db.id,
  title: db.title,
  description: db.description ?? undefined,
  done: db.done,
  priority: db.priority,
  dueDate: db.due_date ? new Date(db.due_date) : undefined,
  category: db.category,
  createdAt: new Date(db.created_at),
  updatedAt: new Date(db.updated_at),
});

export function useTasksPersistence() {
  const fetchTasks = async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }

    return (data as DbTask[]).map(dbToTask);
  };

  const createTask = async (
    title: string,
    description?: string,
    category?: string,
    dueDate?: Date
  ): Promise<Task | null> => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        user_id: userData.user.id,
        title,
        description: description ?? null,
        category: category ?? "general",
        due_date: dueDate?.toISOString() ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return null;
    }

    return dbToTask(data as DbTask);
  };

  const updateTask = async (
    id: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
  ): Promise<boolean> => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.done !== undefined) dbUpdates.done = updates.done;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate?.toISOString() ?? null;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    const { error } = await supabase
      .from("tasks")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error);
      return false;
    }

    return true;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      return false;
    }

    return true;
  };

  const toggleTask = async (id: string, done: boolean): Promise<boolean> => {
    return updateTask(id, { done });
  };

  return {
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
  };
}
