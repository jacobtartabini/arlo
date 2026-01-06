import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  ListTodo,
  Filter,
  SortAsc,
} from "lucide-react";
import { DraggableTaskList } from "./DraggableTaskList";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useSubtasksPersistence } from "@/hooks/useSubtasksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { toast } from "@/hooks/use-toast";
import type { Task } from "@/types/tasks";
import type { Subtask, Project } from "@/types/productivity";

type FilterStatus = "all" | "pending" | "completed";
type SortOption = "priority" | "dueDate" | "created" | "name";

interface TaskListViewProps {
  initialProjectId?: string;
  onTasksChange?: () => void;
}

export function TaskListView({ initialProjectId, onTasksChange }: TaskListViewProps) {
  const { fetchTasks, updateTask, deleteTask, toggleTask, assignToProject } = useTasksPersistence();
  const { fetchSubtasksForTasks, createSubtask, toggleSubtask, deleteSubtask, updateSubtask } = useSubtasksPersistence();
  const { fetchProjects } = useProjectsPersistence();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [subtasksByTask, setSubtasksByTask] = useState<Map<string, Subtask[]>>(new Map());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [projectFilter, setProjectFilter] = useState<string>(initialProjectId || "all");
  const [sortBy, setSortBy] = useState<SortOption>("priority");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [fetchedTasks, fetchedProjects] = await Promise.all([
      fetchTasks(),
      fetchProjects(),
    ]);
    
    setTasks(fetchedTasks);
    setProjects(fetchedProjects);
    
    // Load subtasks for all tasks
    if (fetchedTasks.length > 0) {
      const subtasks = await fetchSubtasksForTasks(fetchedTasks.map(t => t.id));
      setSubtasksByTask(subtasks);
    }
    
    setLoading(false);
  }, [fetchTasks, fetchProjects, fetchSubtasksForTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistic task toggle
  const handleToggle = useCallback(async (taskId: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    const success = await toggleTask(taskId, done);
    if (!success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
    onTasksChange?.();
  }, [toggleTask, onTasksChange]);

  // Update task
  const handleUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    const success = await updateTask(taskId, updates);
    if (!success) {
      loadData(); // Reload on failure
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  }, [updateTask, loadData]);

  // Delete task
  const handleDelete = useCallback(async (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const success = await deleteTask(taskId);
    if (!success) {
      if (taskToDelete) setTasks(prev => [...prev, taskToDelete]);
      toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
    } else {
      toast({ title: "Task deleted" });
      onTasksChange?.();
    }
  }, [deleteTask, tasks, onTasksChange]);

  // Reorder tasks
  const handleReorder = useCallback(async (reorderedTasks: Task[]) => {
    setTasks(reorderedTasks);
    // Update order indices in database
    await Promise.all(
      reorderedTasks.map((task, index) => 
        updateTask(task.id, { orderIndex: index })
      )
    );
  }, [updateTask]);

  // Assign to project
  const handleAssignProject = useCallback(async (taskId: string, projectId: string | null) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, projectId: projectId ?? undefined } : t));
    const success = await assignToProject(taskId, projectId);
    if (!success) {
      loadData();
      toast({ title: "Error", description: "Failed to assign project", variant: "destructive" });
    } else {
      toast({ title: projectId ? "Task assigned to project" : "Task removed from project" });
      onTasksChange?.();
    }
  }, [assignToProject, loadData, onTasksChange]);

  // Subtask handlers
  const handleSubtaskToggle = useCallback(async (subtaskId: string, done: boolean) => {
    // Optimistic update
    setSubtasksByTask(prev => {
      const newMap = new Map(prev);
      for (const [taskId, subtasks] of newMap) {
        const index = subtasks.findIndex(s => s.id === subtaskId);
        if (index !== -1) {
          const updated = [...subtasks];
          updated[index] = { ...updated[index], done };
          newMap.set(taskId, updated);
          break;
        }
      }
      return newMap;
    });
    
    const success = await toggleSubtask(subtaskId, done);
    if (!success) {
      loadData();
    }
  }, [toggleSubtask, loadData]);

  const handleSubtaskCreate = useCallback(async (taskId: string, title: string) => {
    const subtask = await createSubtask(taskId, title);
    if (subtask) {
      setSubtasksByTask(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(taskId) || [];
        newMap.set(taskId, [...existing, subtask]);
        return newMap;
      });
    } else {
      toast({ title: "Error", description: "Failed to create subtask", variant: "destructive" });
    }
  }, [createSubtask]);

  const handleSubtaskDelete = useCallback(async (subtaskId: string) => {
    // Find and remove optimistically
    let deletedTaskId: string | null = null;
    setSubtasksByTask(prev => {
      const newMap = new Map(prev);
      for (const [taskId, subtasks] of newMap) {
        const filtered = subtasks.filter(s => s.id !== subtaskId);
        if (filtered.length !== subtasks.length) {
          deletedTaskId = taskId;
          newMap.set(taskId, filtered);
          break;
        }
      }
      return newMap;
    });
    
    const success = await deleteSubtask(subtaskId);
    if (!success) {
      loadData();
    }
  }, [deleteSubtask, loadData]);

  const handleSubtaskUpdate = useCallback(async (subtaskId: string, title: string) => {
    setSubtasksByTask(prev => {
      const newMap = new Map(prev);
      for (const [taskId, subtasks] of newMap) {
        const index = subtasks.findIndex(s => s.id === subtaskId);
        if (index !== -1) {
          const updated = [...subtasks];
          updated[index] = { ...updated[index], title };
          newMap.set(taskId, updated);
          break;
        }
      }
      return newMap;
    });
    
    const success = await updateSubtask(subtaskId, { title });
    if (!success) {
      loadData();
    }
  }, [updateSubtask, loadData]);

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      // Search
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      // Status
      if (statusFilter === "pending" && task.done) return false;
      if (statusFilter === "completed" && !task.done) return false;
      // Project
      if (projectFilter !== "all") {
        if (projectFilter === "none" && task.projectId) return false;
        if (projectFilter !== "none" && task.projectId !== projectFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return a.priority - b.priority;
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
          return a.title.localeCompare(b.title);
        default:
          return a.orderIndex - b.orderIndex;
      }
    });

  const pendingCount = tasks.filter(t => !t.done).length;
  const completedCount = tasks.filter(t => t.done).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">All Tasks</h2>
          <Badge variant="secondary">{tasks.length}</Badge>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
            <TabsList className="bg-muted/50">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="pending" className="text-xs">
                Pending ({pendingCount})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">
                Done ({completedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[130px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length > 0 ? (
        <DraggableTaskList
          tasks={filteredTasks}
          projects={projects}
          subtasksByTask={subtasksByTask}
          onToggle={handleToggle}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onReorder={handleReorder}
          onAssignProject={handleAssignProject}
          onSubtaskToggle={handleSubtaskToggle}
          onSubtaskCreate={handleSubtaskCreate}
          onSubtaskDelete={handleSubtaskDelete}
          onSubtaskUpdate={handleSubtaskUpdate}
        />
      ) : (
        <Card className="p-8 text-center border-dashed">
          <ListTodo className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search || statusFilter !== "all" || projectFilter !== "all"
              ? "No tasks match your filters"
              : "No tasks yet"}
          </p>
          {!search && statusFilter === "all" && projectFilter === "all" && (
            <Button variant="link" className="mt-2" onClick={() => setCreateOpen(true)}>
              Create your first task
            </Button>
          )}
        </Card>
      )}

      <CreateTaskDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectFilter !== "all" && projectFilter !== "none" ? projectFilter : undefined}
        onCreated={() => {
          loadData();
          onTasksChange?.();
        }}
      />
    </div>
  );
}
