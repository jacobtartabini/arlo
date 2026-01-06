import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Folder, Target, Briefcase, Lightbulb, Heart, Code, Palette,
  CheckCircle2, Clock, Pause
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Project, ProjectStatus } from "@/types/productivity";

const ICON_MAP: Record<string, React.ElementType> = {
  folder: Folder,
  target: Target,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  heart: Heart,
  code: Code,
  palette: Palette,
};

const STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: React.ElementType; className: string }> = {
  active: { label: "Active", icon: Clock, className: "bg-primary/10 text-primary border-primary/20" },
  on_hold: { label: "On Hold", icon: Pause, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  completed: { label: "Completed", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  archived: { label: "Archived", icon: Folder, className: "bg-muted text-muted-foreground border-border" },
};

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const IconComponent = ICON_MAP[project.icon] || Folder;
  const statusConfig = STATUS_CONFIG[project.status];
  const StatusIcon = statusConfig.icon;
  
  const progress = useMemo(() => {
    if (project.taskCount === undefined || project.taskCount === 0) return 0;
    return Math.round(((project.completedTaskCount ?? 0) / project.taskCount) * 100);
  }, [project.taskCount, project.completedTaskCount]);

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden p-5 cursor-pointer transition-all duration-200",
        "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
        "border-border/60 bg-card/80 backdrop-blur"
      )}
      onClick={onClick}
    >
      {/* Color accent */}
      <div 
        className="absolute top-0 left-0 w-1 h-full rounded-l-lg"
        style={{ backgroundColor: project.color }}
      />
      
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div 
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${project.color}20` }}
        >
          <IconComponent className="h-6 w-6" style={{ color: project.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {project.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className={cn("shrink-0 text-xs", statusConfig.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>

          {/* Progress */}
          {project.taskCount !== undefined && project.taskCount > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {project.completedTaskCount ?? 0} of {project.taskCount} tasks
                </span>
                <span className="font-medium" style={{ color: project.color }}>
                  {progress}%
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5"
                style={{ 
                  ['--progress-background' as string]: `${project.color}20`,
                  ['--progress-foreground' as string]: project.color 
                }}
              />
            </div>
          )}

          {/* Dates */}
          {(project.startDate || project.targetDate) && (
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              {project.startDate && (
                <span>Started {format(project.startDate, "MMM d")}</span>
              )}
              {project.targetDate && (
                <>
                  <span className="text-border">•</span>
                  <span>Due {format(project.targetDate, "MMM d")}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
