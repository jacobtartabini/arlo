/**
 * Quick inline task input for rapid task creation
 * Minimal friction - just type and press Enter
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, Calendar, Zap, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTasksPersistence } from "@/hooks/useTasksPersistence";
import { toast } from "@/hooks/use-toast";

interface QuickTaskInputProps {
  onTaskCreated?: () => void;
  defaultScheduledDate?: Date;
  className?: string;
  autoFocus?: boolean;
}

export function QuickTaskInput({ 
  onTaskCreated, 
  defaultScheduledDate,
  className,
  autoFocus = false
}: QuickTaskInputProps) {
  const { createTask } = useTasksPersistence();
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = useCallback(async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || loading) return;

    setLoading(true);
    
    const task = await createTask(trimmedTitle, {
      scheduledDate: defaultScheduledDate || new Date(),
      priority: 3,
      energyLevel: "medium",
    });

    setLoading(false);

    if (task) {
      setTitle("");
      toast({ 
        title: "Task added", 
        description: `"${trimmedTitle}" created`,
      });
      onTaskCreated?.();
    } else {
      toast({ 
        title: "Failed to create task", 
        variant: "destructive" 
      });
    }
  }, [title, loading, createTask, defaultScheduledDate, onTaskCreated]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      setTitle("");
      setIsExpanded(false);
    }
  }, [handleSubmit]);

  const handleBlur = useCallback(() => {
    if (!title.trim()) {
      setIsExpanded(false);
    }
  }, [title]);

  if (!isExpanded) {
    return (
      <motion.button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 px-4 py-3 w-full rounded-xl",
          "border border-dashed border-border/60 hover:border-primary/40",
          "bg-card/50 hover:bg-card/80 transition-all duration-200",
          "text-muted-foreground hover:text-foreground",
          className
        )}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm">Add a task...</span>
        <span className="ml-auto text-xs text-muted-foreground/50">Press to start</span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl",
        "border border-primary/40 bg-card/80 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
        <Zap className="h-4 w-4 text-primary" />
      </div>
      
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="What needs to be done?"
        className="flex-1 border-0 bg-transparent focus-visible:ring-0 px-0 text-sm"
        disabled={loading}
      />

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/30 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Today</span>
        </div>
        
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!title.trim() || loading}
          className="h-8 w-8 p-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}
