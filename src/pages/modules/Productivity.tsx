import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  CalendarCheck, 
  FolderKanban,
  ListTodo,
} from "lucide-react";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { useSubtasksPersistence } from "@/hooks/useSubtasksPersistence";
import { useHabitsPersistence } from "@/hooks/useHabitsPersistence";
import { useNotificationsPersistence } from "@/hooks/useNotificationsPersistence";
import { useProductivityRealtime } from "@/hooks/useRealtimeSubscription";
import { supabase } from "@/integrations/supabase/client";
import { ProjectList, ProjectDetailView, TaskListView } from "@/components/projects";
import type { Task, Subtask } from "@/types/productivity";
import type { Project, ProjectStatus } from "@/types/productivity";
import type { HabitWithStreak } from "@/types/habits";
import type { Notification } from "@/types/notifications";

export default function Productivity() {
  const { fetchTasks, toggleTask, fetchTasksForProject, updateTask } = useTasksPersistence();
  const { fetchProjects, updateProject, archiveProject } = useProjectsPersistence();
  const { fetchSubtasksForTasks, toggleSubtask, createSubtask, deleteSubtask, updateSubtask } = useSubtasksPersistence();
  const { fetchHabitsWithStreaks } = useHabitsPersistence();
  const { fetchNotifications } = useNotificationsPersistence();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectSubtasks, setProjectSubtasks] = useState<Map<string, Subtask[]>>(new Map());
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"projects" | "tasks">("projects");

  useEffect(() => {
    document.title = "Productivity – Arlo";
  }, []);

  const loadTasks = useCallback(async () => {
    const fetchedTasks = await fetchTasks();
    setTasks(fetchedTasks);
  }, [fetchTasks]);

  const loadProjects = useCallback(async () => {
    const fetchedProjects = await fetchProjects();
    setProjects(fetchedProjects);
  }, [fetchProjects]);

  const loadHabits = useCallback(async () => {
    const fetchedHabits = await fetchHabitsWithStreaks();
    setHabits(fetchedHabits.filter(h => h.category === "routine" && h.enabled));
  }, [fetchHabitsWithStreaks]);

  const loadNotifications = useCallback(async () => {
    const fetchedNotifications = await fetchNotifications();
    setNotifications(fetchedNotifications.filter(n => !n.read).slice(0, 3));
  }, [fetchNotifications]);

  const loadProjectTasks = useCallback(async (projectId: string) => {
    const tasks = await fetchTasksForProject(projectId);
    setProjectTasks(tasks);
    
    // Load subtasks for project tasks
    if (tasks.length > 0) {
      const subtasks = await fetchSubtasksForTasks(tasks.map(t => t.id));
      setProjectSubtasks(subtasks);
    } else {
      setProjectSubtasks(new Map());
    }
  }, [fetchTasksForProject, fetchSubtasksForTasks]);

  // Subscribe to realtime updates
  useProductivityRealtime({
    onTaskChange: loadTasks,
    onHabitChange: loadHabits,
    onNotificationChange: loadNotifications,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await Promise.all([loadTasks(), loadProjects(), loadHabits(), loadNotifications()]);
      setLoading(false);
    };

    checkAuthAndLoad();
  }, []);

  // Load project tasks when a project is selected
  useEffect(() => {
    if (selectedProject) {
      loadProjectTasks(selectedProject.id);
    }
  }, [selectedProject, loadProjectTasks]);

  const handleToggleTask = async (taskId: string, done: boolean) => {
    // Optimistic update for both task lists
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    setProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    
    const success = await toggleTask(taskId, done);
    if (!success) {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
      setProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !done } : t));
    } else {
      // Refresh projects to update progress
      loadProjects();
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    setProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    await updateTask(taskId, updates);
  };

  const handleDeleteTask = async (taskId: string) => {
    setProjectTasks(prev => prev.filter(t => t.id !== taskId));
    // Note: actual deletion handled by TaskListView
  };

  const handleSubtaskToggle = async (subtaskId: string, done: boolean) => {
    setProjectSubtasks(prev => {
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
    await toggleSubtask(subtaskId, done);
  };

  const handleSubtaskCreate = async (taskId: string, title: string) => {
    const subtask = await createSubtask(taskId, title);
    if (subtask) {
      setProjectSubtasks(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(taskId) || [];
        newMap.set(taskId, [...existing, subtask]);
        return newMap;
      });
    }
  };

  const handleSubtaskDelete = async (subtaskId: string) => {
    setProjectSubtasks(prev => {
      const newMap = new Map(prev);
      for (const [taskId, subtasks] of newMap) {
        const filtered = subtasks.filter(s => s.id !== subtaskId);
        if (filtered.length !== subtasks.length) {
          newMap.set(taskId, filtered);
          break;
        }
      }
      return newMap;
    });
    await deleteSubtask(subtaskId);
  };

  const handleSubtaskUpdate = async (subtaskId: string, title: string) => {
    setProjectSubtasks(prev => {
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
    await updateSubtask(subtaskId, { title });
  };

  const handleProjectStatusChange = async (status: ProjectStatus) => {
    if (!selectedProject) return;
    await updateProject(selectedProject.id, { status });
    setSelectedProject({ ...selectedProject, status });
    loadProjects();
  };

  const handleArchiveProject = async () => {
    if (!selectedProject) return;
    await archiveProject(selectedProject.id);
    setSelectedProject(null);
    loadProjects();
  };

  const completedCount = tasks.filter(t => t.done).length;
  const totalCount = tasks.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const tasksLeft = totalCount - completedCount;
  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
  const activeProjects = projects.filter(p => p.status === "active").length;

  const stats = [
    { label: "Active Projects", value: String(activeProjects), helper: `${projects.length} total` },
    { label: "Tasks Completed", value: `${completionPercent}%`, helper: `${tasksLeft} remaining` },
    { label: "Active Habits", value: String(habits.length), helper: maxStreak > 0 ? `+${maxStreak} day streak` : "Start a streak" },
    { label: "Unread", value: String(notifications.length), helper: notifications.length > 0 ? "Action needed" : "All caught up" },
  ];

  // Show project detail view if a project is selected
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <ProjectDetailView
            project={selectedProject}
            tasks={projectTasks}
            subtasksByTask={projectSubtasks}
            projects={projects}
            onBack={() => setSelectedProject(null)}
            onStatusChange={handleProjectStatusChange}
            onTaskToggle={handleToggleTask}
            onTaskUpdate={handleUpdateTask}
            onTaskDelete={handleDeleteTask}
            onSubtaskToggle={handleSubtaskToggle}
            onSubtaskCreate={handleSubtaskCreate}
            onSubtaskDelete={handleSubtaskDelete}
            onSubtaskUpdate={handleSubtaskUpdate}
            onTaskCreated={() => {
              loadProjectTasks(selectedProject.id);
              loadProjects();
            }}
            onArchive={handleArchiveProject}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="absolute inset-0 opacity-50" aria-hidden>
            <div className="absolute -left-12 top-6 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute right-4 top-0 h-28 w-28 rounded-full bg-muted/50 blur-3xl" />
          </div>

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">Productivity</h1>
                  <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
                    Your command center for projects, tasks, and habits.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="group relative overflow-hidden border-border/50 bg-background/70 p-4 shadow-none backdrop-blur"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-semibold text-foreground">{stat.value}</span>
                  {stat.helper && (
                    <span className="text-xs font-medium text-muted-foreground">{stat.helper}</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </header>

        {/* Tabs for Projects / Tasks */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "projects" | "tasks")}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              All Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="mt-6">
            <ProjectList
              projects={projects}
              loading={loading}
              onProjectClick={setSelectedProject}
              onRefresh={loadProjects}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <TaskListView
              onTasksChange={() => {
                loadTasks();
                loadProjects();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
