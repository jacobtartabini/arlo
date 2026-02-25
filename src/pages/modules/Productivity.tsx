import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  CalendarCheck, 
  FolderKanban,
  ListTodo,
  Sparkles,
  CalendarRange,
  Timer,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { useSubtasksPersistence } from "@/hooks/useSubtasksPersistence";
import { useHabitsPersistence } from "@/hooks/useHabitsPersistence";
import { useNotificationsPersistence } from "@/hooks/useNotificationsPersistence";
import { useProductivityRealtime } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/providers/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { ProjectList, ProjectDetailView, TaskListView } from "@/components/projects";
import { TodayView, WeeklyPlanningView, TimelineDropZone } from "@/components/productivity";
import { MobileProductivityView } from "@/components/mobile";
import type { Task, Subtask } from "@/types/productivity";
import type { Project, ProjectStatus } from "@/types/productivity";
import type { HabitWithStreak } from "@/types/habits";
import type { Notification } from "@/types/notifications";

export default function Productivity() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { fetchTasks, toggleTask, fetchTasksForProject, updateTask } = useTasksPersistence();
  const { fetchProjects, updateProject, archiveProject } = useProjectsPersistence();
  const { fetchSubtasksForTasks, toggleSubtask, createSubtask, deleteSubtask, updateSubtask } = useSubtasksPersistence();
  const { fetchHabitsWithStreaks } = useHabitsPersistence();
  const { fetchNotifications } = useNotificationsPersistence();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [projectSubtasks, setProjectSubtasks] = useState<Map<string, Subtask[]>>(new Map());
  const [habits, setHabits] = useState<HabitWithStreak[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "week" | "schedule" | "projects" | "tasks">("today");

  useEffect(() => {
    document.title = "Arlo";
  }, []);

  const loadTasks = useCallback(async () => {
    const fetchedTasks = await fetchTasks();
    setTasks(fetchedTasks);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProjects = useCallback(async () => {
    const fetchedProjects = await fetchProjects();
    setProjects(fetchedProjects);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHabits = useCallback(async () => {
    const fetchedHabits = await fetchHabitsWithStreaks();
    setHabits(fetchedHabits.filter(h => h.category === "routine" && h.enabled));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotifications = useCallback(async () => {
    const fetchedNotifications = await fetchNotifications();
    setNotifications(fetchedNotifications.filter(n => !n.read).slice(0, 3));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Combined refresh function with proper error handling
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([
        loadTasks(),
        loadProjects(),
        loadHabits(),
        loadNotifications(),
      ]);
    } catch (err) {
      console.error('[Productivity] Failed to load data:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [loadTasks, loadProjects, loadHabits, loadNotifications]);

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

  // Subscribe to realtime updates - only when authenticated
  useProductivityRealtime({
    onTaskChange: loadTasks,
    onHabitChange: loadHabits,
    onNotificationChange: loadNotifications,
    enabled: isAuthenticated,
  });

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshAll();
    } else if (!authLoading) {
      // Not authenticated and not loading - clear loading state
      setLoading(false);
    }
  }, [isAuthenticated, authLoading, refreshAll]);

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
  const activeProjects = projects.filter(p => p.status === "active").length;

  // Mobile view
  if (isMobile) {
    return <MobileProductivityView />;
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Failed to load</h2>
            <p className="text-muted-foreground mb-4">{loadError}</p>
            <Button onClick={refreshAll} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Productivity</h1>
              <p className="text-sm text-muted-foreground">
                {tasksLeft} tasks remaining · {activeProjects} active project{activeProjects !== 1 ? 's' : ''} · {completionPercent}% done today
              </p>
            </div>
          </div>
        </header>

        {/* Tabs for Today / Week / Schedule / Projects / Tasks */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="today" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <CalendarRange className="h-4 w-4" />
              Week
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Timer className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <FolderKanban className="h-4 w-4" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              All Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-6">
            <TodayView 
              onTaskClick={() => setActiveTab("tasks")}
              onViewAllTasks={() => setActiveTab("tasks")}
            />
          </TabsContent>

          <TabsContent value="week" className="mt-6">
            <WeeklyPlanningView
              onTaskClick={() => setActiveTab("tasks")}
              onDayClick={() => setActiveTab("schedule")}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-6">
            <TimelineDropZone
              onBlockCreated={() => {
                loadTasks();
              }}
            />
          </TabsContent>

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
