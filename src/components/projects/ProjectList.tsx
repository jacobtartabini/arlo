import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FolderOpen } from "lucide-react";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectDialog } from "./CreateProjectDialog";
import type { Project, ProjectStatus } from "@/types/productivity";

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onProjectClick: (project: Project) => void;
  onRefresh: () => void;
}

export function ProjectList({ projects, loading, onProjectClick, onRefresh }: ProjectListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(search.toLowerCase()) ||
      (project.description?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: projects.length,
    active: projects.filter(p => p.status === "active").length,
    on_hold: projects.filter(p => p.status === "on_hold").length,
    completed: projects.filter(p => p.status === "completed").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="all" className="text-xs">
            All ({statusCounts.all})
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs">
            Active ({statusCounts.active})
          </TabsTrigger>
          <TabsTrigger value="on_hold" className="text-xs">
            On Hold ({statusCounts.on_hold})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs">
            Completed ({statusCounts.completed})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Project Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onClick={() => onProjectClick(project)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <FolderOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No projects yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Projects help you organize related tasks and track progress over time.
          </p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first project
          </Button>
        </div>
      )}

      <CreateProjectDialog 
        open={createOpen} 
        onOpenChange={setCreateOpen}
        onCreated={onRefresh}
      />
    </div>
  );
}
