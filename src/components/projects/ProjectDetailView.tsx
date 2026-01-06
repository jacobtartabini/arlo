import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  Clock,
  Pause,
  Archive,
  Calendar,
  ListTodo,
  Link as LinkIcon,
  Folder, Target, Briefcase, Lightbulb, Heart, Code, Palette,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DraggableTaskList } from "./DraggableTaskList";
import { CreateTaskDialog } from "./CreateTaskDialog";
import { LinkedFilesSection } from "@/components/files/LinkedFilesSection";
import type { Project, ProjectStatus, Subtask } from "@/types/productivity";
import type { Task } from "@/types/tasks";

const ICON_MAP: Record<string, React.ElementType> = {
  folder: Folder,
  target: Target,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  heart: Heart,
  code: Code,
  palette: Palette,
};

const STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: React.ElementType }[] = [
  { value: "active", label: "Active", icon: Clock },
  { value: "on_hold", label: "On Hold", icon: Pause },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "archived", label: "Archived", icon: Archive },
];

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  subtasksByTask?: Map<string, Subtask[]>;
  projects?: Project[];
  onBack: () => void;
  onStatusChange: (status: ProjectStatus) => void;
  onTaskToggle: (taskId: string, done: boolean) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  onSubtaskToggle?: (subtaskId: string, done: boolean) => void;
  onSubtaskCreate?: (taskId: string, title: string) => void;
  onSubtaskDelete?: (subtaskId: string) => void;
  onSubtaskUpdate?: (subtaskId: string, title: string) => void;
  onTaskCreated: () => void;
  onArchive: () => void;
}

export function ProjectDetailView({ 
  project, 
  tasks,
  subtasksByTask = new Map(),
  projects = [],
  onBack, 
  onStatusChange,
  onTaskToggle,
  onTaskUpdate,
  onTaskDelete,
  onSubtaskToggle,
  onSubtaskCreate,
  onSubtaskDelete,
  onSubtaskUpdate,
  onTaskCreated,
  onArchive,
}: ProjectDetailViewProps) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  
  const IconComponent = ICON_MAP[project.icon] || Folder;
  
  const { completedTasks, pendingTasks, progress } = useMemo(() => {
    const completed = tasks.filter(t => t.done);
    const pending = tasks.filter(t => !t.done);
    const prog = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;
    return { completedTasks: completed, pendingTasks: pending, progress: prog };
  }, [tasks]);

  const stats = [
    { label: "Total Tasks", value: tasks.length },
    { label: "Completed", value: completedTasks.length },
    { label: "In Progress", value: pendingTasks.length },
    { label: "Progress", value: `${progress}%` },
  ];

  // Handlers with defaults
  const handleUpdate = onTaskUpdate || (() => {});
  const handleDelete = onTaskDelete || (() => {});
  const handleAssignProject = () => {}; // No-op in project view
  const handleReorder = (reorderedTasks: Task[]) => {
    reorderedTasks.forEach((task, index) => {
      handleUpdate(task.id, { orderIndex: index });
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 mt-1">
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-4">
            <div 
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${project.color}20` }}
            >
              <IconComponent className="h-7 w-7" style={{ color: project.color }} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-foreground truncate">
                    {project.name}
                  </h1>
                  {project.description && (
                    <p className="text-muted-foreground mt-1">{project.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select value={project.status} onValueChange={(v) => onStatusChange(v as ProjectStatus)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Calendar className="h-4 w-4 mr-2" />
                        Edit dates
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Add link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onArchive} className="text-destructive">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive project
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Dates */}
              {(project.startDate || project.targetDate) && (
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  {project.startDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Started {format(project.startDate, "MMM d, yyyy")}
                    </span>
                  )}
                  {project.targetDate && (
                    <span className="flex items-center gap-1.5">
                      <Target className="h-4 w-4" />
                      Due {format(project.targetDate, "MMM d, yyyy")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 bg-card/60 backdrop-blur border-border/50">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="text-2xl font-semibold mt-1" style={{ color: project.color }}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Progress Bar */}
      <Card className="p-4 bg-card/60 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm font-semibold" style={{ color: project.color }}>
            {progress}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </Card>

      <Separator />

      {/* Files Section */}
      <LinkedFilesSection
        entityType="project"
        entityId={project.id}
        entityName={project.name}
        entityDescription={project.description}
      />

      <Separator />

      {/* Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Tasks</h2>
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </div>
          <Button size="sm" onClick={() => setCreateTaskOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <DraggableTaskList
                tasks={pendingTasks}
                projectColor={project.color}
                projects={projects}
                subtasksByTask={subtasksByTask}
                onToggle={onTaskToggle}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onReorder={handleReorder}
                onAssignProject={handleAssignProject}
                onSubtaskToggle={onSubtaskToggle || (() => {})}
                onSubtaskCreate={onSubtaskCreate || (() => {})}
                onSubtaskDelete={onSubtaskDelete || (() => {})}
                onSubtaskUpdate={onSubtaskUpdate || (() => {})}
              />
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="mt-6 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Completed ({completedTasks.length})
                </p>
                <DraggableTaskList
                  tasks={completedTasks}
                  projectColor={project.color}
                  projects={projects}
                  subtasksByTask={subtasksByTask}
                  onToggle={onTaskToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onReorder={handleReorder}
                  onAssignProject={handleAssignProject}
                  onSubtaskToggle={onSubtaskToggle || (() => {})}
                  onSubtaskCreate={onSubtaskCreate || (() => {})}
                  onSubtaskDelete={onSubtaskDelete || (() => {})}
                  onSubtaskUpdate={onSubtaskUpdate || (() => {})}
                />
              </div>
            )}
          </div>
        ) : (
          <Card className="p-8 text-center border-dashed">
            <Circle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No tasks yet</p>
            <Button variant="link" className="mt-2" onClick={() => setCreateTaskOpen(true)}>
              Add your first task
            </Button>
          </Card>
        )}
      </div>

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        projectId={project.id}
        projectColor={project.color}
        onCreated={onTaskCreated}
      />
    </div>
  );
}
