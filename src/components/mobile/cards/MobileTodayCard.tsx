import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarCheck, Plus, Check, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MobileModuleCard } from "../MobileModuleCard";
import { Input } from "@/components/ui/input";
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

  return (
    <MobileModuleCard
      title="Today"
      subtitle={`${completedCount}/${totalCount} completed`}
      icon={CalendarCheck}
      onClick={() => navigate("/productivity")}
      actionLabel="View all"
    >
      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Task list */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {tasks.slice(0, 4).map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTaskToggle?.(task.id, !task.done);
                }}
                className={cn(
                  "flex items-center gap-3 w-full py-2 px-1 -mx-1 rounded-lg",
                  "transition-colors hover:bg-muted/50 active:bg-muted",
                  task.done && "opacity-60"
                )}
              >
                <div className={cn(
                  "flex items-center justify-center w-5 h-5 rounded-full border-2 transition-colors",
                  task.done 
                    ? "border-primary bg-primary" 
                    : "border-muted-foreground/40"
                )}>
                  {task.done && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={cn(
                  "text-sm text-left flex-1 truncate",
                  task.done && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </span>
              </button>
            </motion.div>
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
              className="pt-1"
            >
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a task..."
                autoFocus
                disabled={isSubmitting}
                className="h-9 text-sm"
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
              className="flex items-center gap-2 w-full py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add task</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </MobileModuleCard>
  );
}
