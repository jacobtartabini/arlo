import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { 
  ChevronDown, 
  ChevronRight,
  Clock,
  Zap,
  BatteryMedium,
  BatteryLow,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  FolderOpen,
  X,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task } from "@/types/tasks";
import type { Subtask, Project } from "@/types/productivity";

const PRIORITY_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: "P1", className: "bg-red-500/10 text-red-600 border-red-500/20" },
  2: { label: "P2", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  3: { label: "P3", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  4: { label: "P4", className: "bg-muted text-muted-foreground border-border" },
};

const ENERGY_ICONS: Record<string, React.ElementType> = {
  high: Zap,
  medium: BatteryMedium,
  low: BatteryLow,
};

interface EnhancedTaskItemProps {
  task: Task;
  projectColor?: string;
  projects?: Project[];
  subtasks?: Subtask[];
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  onToggle: (taskId: string, done: boolean) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onAssignProject: (taskId: string, projectId: string | null) => void;
  onSubtaskToggle?: (subtaskId: string, done: boolean) => void;
  onSubtaskCreate?: (taskId: string, title: string) => void;
  onSubtaskDelete?: (subtaskId: string) => void;
  onSubtaskUpdate?: (subtaskId: string, title: string) => void;
}

export function EnhancedTaskItem({ 
  task, 
  projectColor, 
  projects = [],
  subtasks = [], 
  isDragging,
  dragHandleProps,
  onToggle,
  onUpdate,
  onDelete,
  onAssignProject,
  onSubtaskToggle, 
  onSubtaskCreate,
  onSubtaskDelete,
  onSubtaskUpdate,
}: EnhancedTaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState("");
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const subtaskInputRef = useRef<HTMLInputElement>(null);

  const priorityConfig = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS[4];
  const EnergyIcon = ENERGY_ICONS[task.energyLevel || 'medium'] || BatteryMedium;
  
  const completedSubtasks = subtasks.filter(s => s.done).length;
  const hasSubtasks = subtasks.length > 0;

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (showSubtaskInput && subtaskInputRef.current) {
      subtaskInputRef.current.focus();
    }
  }, [showSubtaskInput]);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    await onToggle(task.id, !task.done);
    setIsToggling(false);
  }, [isToggling, onToggle, task.id, task.done]);

  const handleSaveTitle = useCallback(() => {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  }, [editTitle, task.title, task.id, onUpdate]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(task.title);
      setIsEditing(false);
    }
  }, [handleSaveTitle, task.title]);

  const handleCreateSubtask = useCallback(() => {
    if (newSubtaskTitle.trim() && onSubtaskCreate) {
      onSubtaskCreate(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
      setShowSubtaskInput(false);
    }
  }, [newSubtaskTitle, onSubtaskCreate, task.id]);

  const handleSubtaskKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle("");
      setShowSubtaskInput(false);
    }
  }, [handleCreateSubtask]);

  const handleSaveSubtaskEdit = useCallback((subtaskId: string) => {
    if (editSubtaskTitle.trim() && onSubtaskUpdate) {
      onSubtaskUpdate(subtaskId, editSubtaskTitle.trim());
    }
    setEditingSubtaskId(null);
    setEditSubtaskTitle("");
  }, [editSubtaskTitle, onSubtaskUpdate]);

  const startEditingSubtask = useCallback((subtask: Subtask) => {
    setEditingSubtaskId(subtask.id);
    setEditSubtaskTitle(subtask.title);
  }, []);

  return (
    <Card 
      className={cn(
        "p-4 transition-all border-border/50 group",
        task.done && "opacity-60 bg-muted/30",
        isDragging && "shadow-lg ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div 
          {...dragHandleProps}
          className="mt-1 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Expand toggle */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="mt-0.5 p-1 hover:bg-muted rounded transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.done}
            onCheckedChange={handleToggle}
            disabled={isToggling}
            className="mt-0.5 h-5 w-5"
            style={{ 
              borderColor: projectColor,
              ...(task.done ? { backgroundColor: projectColor, borderColor: projectColor } : {})
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            {isEditing ? (
              <div className="flex-1 flex items-center gap-2">
                <Input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={handleTitleKeyDown}
                  className="h-7 text-sm"
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span 
                className={cn(
                  "font-medium cursor-pointer hover:text-primary transition-colors",
                  task.done && "line-through text-muted-foreground"
                )}
                onClick={() => setIsEditing(true)}
              >
                {task.title}
              </span>
            )}
            
            <div className="flex items-center gap-2 shrink-0">
              {/* Priority */}
              <Badge variant="outline" className={cn("text-xs", priorityConfig.className)}>
                {priorityConfig.label}
              </Badge>

              {/* Actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit title
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    setShowSubtaskInput(true);
                    setExpanded(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add subtask
                  </DropdownMenuItem>
                  
                  {projects.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <FolderOpen className="h-4 w-4 mr-2" />
                        Assign to project
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onAssignProject(task.id, null)}>
                          <X className="h-4 w-4 mr-2" />
                          No project
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {projects.map((project) => (
                          <DropdownMenuItem 
                            key={project.id}
                            onClick={() => onAssignProject(task.id, project.id)}
                          >
                            <div 
                              className="h-3 w-3 rounded-full mr-2"
                              style={{ backgroundColor: project.color }}
                            />
                            {project.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(task.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {/* Time estimate */}
            {task.timeEstimateMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {task.timeEstimateMinutes}m
              </span>
            )}

            {/* Energy level */}
            {task.energyLevel && (
              <span className="flex items-center gap-1">
                <EnergyIcon className="h-3 w-3" />
                {task.energyLevel}
              </span>
            )}

            {/* Due date */}
            {task.dueDate && (
              <span className="flex items-center gap-1">
                Due {format(new Date(task.dueDate), "MMM d")}
              </span>
            )}

            {/* Subtasks progress */}
            {hasSubtasks && (
              <span className="flex items-center gap-1">
                {completedSubtasks}/{subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subtasks */}
      {expanded && (
        <div className="ml-12 mt-3 space-y-2 border-l-2 pl-4" style={{ borderColor: projectColor || 'hsl(var(--border))' }}>
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-3 group/subtask">
              <Checkbox
                checked={subtask.done}
                onCheckedChange={() => onSubtaskToggle?.(subtask.id, !subtask.done)}
                className="h-4 w-4"
              />
              {editingSubtaskId === subtask.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editSubtaskTitle}
                    onChange={(e) => setEditSubtaskTitle(e.target.value)}
                    onBlur={() => handleSaveSubtaskEdit(subtask.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSubtaskEdit(subtask.id);
                      if (e.key === 'Escape') setEditingSubtaskId(null);
                    }}
                    className="h-6 text-sm flex-1"
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <span 
                    className={cn(
                      "text-sm flex-1 cursor-pointer hover:text-primary transition-colors",
                      subtask.done && "line-through text-muted-foreground"
                    )}
                    onClick={() => startEditingSubtask(subtask)}
                  >
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover/subtask:opacity-100 transition-opacity"
                    onClick={() => onSubtaskDelete?.(subtask.id)}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </>
              )}
            </div>
          ))}

          {/* Add subtask input */}
          {showSubtaskInput ? (
            <div className="flex items-center gap-2">
              <Input
                ref={subtaskInputRef}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="Add subtask..."
                className="h-7 text-sm flex-1"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCreateSubtask}>
                <Check className="h-3 w-3" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-7 w-7"
                onClick={() => {
                  setShowSubtaskInput(false);
                  setNewSubtaskTitle("");
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSubtaskInput(true)}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add subtask
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
