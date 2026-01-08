import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: number;
}

interface MobileTodayCardProps {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  onTaskToggle?: (taskId: string, done: boolean) => void;
  onTaskCreate?: (title: string) => Promise<boolean>;
}

export function MobileTodayCard({
  tasks,
  completedCount,
  totalCount,
  onTaskToggle,
  onTaskCreate,
}: MobileTodayCardProps) {
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTask.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const success = await onTaskCreate?.(newTask.trim());
    if (success) {
      setNewTask("");
      setIsAdding(false);
    }
    setIsSubmitting(false);
  };

  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const displayTasks = tasks.slice(0, 5);

  if (totalCount === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-semibold text-foreground">Today</h3>
          <button 
            onClick={() => navigate("/productivity")}
            className="text-[12px] font-medium text-primary"
          >
            View all
          </button>
        </div>
        
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Check className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-[14px] text-muted-foreground">No tasks for today</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAdding(true);
            }}
            className="mt-3 text-[13px] font-medium text-primary"
          >
            Add a task
          </button>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="mt-3"
            >
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onBlur={() => {
                  if (!newTask.trim()) setIsAdding(false);
                }}
              />
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      {/* Header with progress */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Today</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate("/productivity");
            }}
            className="text-[12px] font-medium text-primary"
          >
            View all
          </button>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="px-2 pb-2">
        <AnimatePresence mode="popLayout">
          {displayTasks.map((task, index) => (
            <motion.button
              key={task.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={(e) => {
                e.stopPropagation();
                onTaskToggle?.(task.id, !task.done);
              }}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-3 rounded-xl",
                "transition-colors active:bg-muted/80",
                task.done && "opacity-50"
              )}
            >
              {/* Checkbox */}
              <div className={cn(
                "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                task.done 
                  ? "border-primary bg-primary" 
                  : "border-muted-foreground/30"
              )}>
                {task.done && (
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                )}
              </div>
              
              {/* Title */}
              <span className={cn(
                "text-[14px] text-left flex-1 line-clamp-1",
                task.done && "line-through text-muted-foreground"
              )}>
                {task.title}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Quick add */}
        <AnimatePresence>
          {isAdding ? (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              onClick={(e) => e.stopPropagation()}
              className="px-2 pb-2"
            >
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                disabled={isSubmitting}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onBlur={() => {
                  if (!newTask.trim()) setIsAdding(false);
                }}
              />
            </motion.form>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(true);
              }}
              className="flex items-center gap-2 w-full px-3 py-3 text-muted-foreground/70 hover:text-muted-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[14px]">Add task</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
