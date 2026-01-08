import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, ChevronRight, Sparkles, FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { useProjectsPersistence } from "@/hooks/useProjectsPersistence";
import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/productivity";
import type { Project } from "@/types/productivity";

export function MobileProductivityView() {
  const navigate = useNavigate();
  const { fetchTasks, toggleTask, createTask } = useTasksPersistence();
  const { fetchProjects } = useProjectsPersistence();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"today" | "projects">("today");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [fetchedTasks, fetchedProjects] = await Promise.all([
      fetchTasks(),
      fetchProjects(),
    ]);
    setTasks(fetchedTasks);
    setProjects(fetchedProjects);
    setLoading(false);
  }, [fetchTasks, fetchProjects]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const today = new Date().toISOString().split('T')[0];
  const todayTasks = tasks.filter(t => {
    if (!t.scheduledDate) return !t.done;
    const taskDate = t.scheduledDate instanceof Date 
      ? t.scheduledDate.toISOString().split('T')[0]
      : String(t.scheduledDate).split('T')[0];
    return taskDate === today;
  }).slice(0, 10);

  const completedToday = todayTasks.filter(t => t.done).length;
  const progressPercent = todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0;
  const activeProjects = projects.filter(p => p.status === "active");

  const handleToggle = async (taskId: string, done: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done } : t));
    await toggleTask(taskId, done);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    const newTask = await createTask(newTaskTitle.trim(), {
      scheduledDate: new Date(),
    });
    
    if (newTask) {
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle("");
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-muted rounded-2xl" />
        <div className="h-12 bg-muted rounded-xl" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Today's Progress</span>
          </div>
          <span className="text-2xl font-bold text-primary">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {completedToday} of {todayTasks.length} tasks completed
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
        <button
          onClick={() => setActiveTab("today")}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "today"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={cn(
            "flex-1 py-2.5 rounded-lg text-sm font-medium transition-all",
            activeTab === "projects"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Projects
        </button>
      </div>

      {activeTab === "today" ? (
        <>
          {/* Task list */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {todayTasks.map((task, index) => (
                <motion.button
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleToggle(task.id, !task.done)}
                  className={cn(
                    "flex items-center gap-3 w-full p-4 rounded-xl",
                    "bg-card border border-border/50",
                    "transition-all active:scale-[0.98]",
                    task.done && "opacity-50"
                  )}
                >
                  <div className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                    task.done
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}>
                    {task.done && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span className={cn(
                    "text-[15px] text-left flex-1",
                    task.done && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </span>
                </motion.button>
              ))}
            </AnimatePresence>

            {todayTasks.length === 0 && !isAdding && (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No tasks for today</p>
              </div>
            )}
          </div>

          {/* Add task */}
          <AnimatePresence>
            {isAdding ? (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAddTask}
                className="overflow-hidden"
              >
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="What do you need to do?"
                  autoFocus
                  className="w-full px-4 py-4 rounded-xl bg-muted/50 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onBlur={() => {
                    if (!newTaskTitle.trim()) setIsAdding(false);
                  }}
                />
              </motion.form>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setIsAdding(true)}
                className={cn(
                  "flex items-center justify-center gap-2 w-full py-4",
                  "rounded-xl border-2 border-dashed border-border/50",
                  "text-muted-foreground hover:text-foreground hover:border-border",
                  "transition-colors"
                )}
              >
                <Plus className="h-5 w-5" />
                <span className="text-[15px] font-medium">Add task</span>
              </motion.button>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Projects list */
        <div className="space-y-2">
          {activeProjects.map((project, index) => (
            <motion.button
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/productivity?project=${project.id}`)}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-xl",
                "bg-card border border-border/50",
                "transition-all active:scale-[0.98]"
              )}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${project.color}20` }}
              >
                <FolderKanban className="h-5 w-5" style={{ color: project.color }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[15px] font-medium text-foreground">{project.name}</p>
                <p className="text-xs text-muted-foreground">
                  {project.progress || 0}% complete
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
            </motion.button>
          ))}

          {activeProjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">No active projects</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
