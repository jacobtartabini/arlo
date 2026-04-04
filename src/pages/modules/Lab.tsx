import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FlaskConical, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLabProjects } from "@/hooks/useLabProjects";
import { useLabItems } from "@/hooks/useLabItems";
import type { CreationProject, LabItemType, LabProjectStatus } from "@/types/creation";

const STATUS_LABEL: Record<LabProjectStatus, string> = {
  idea: "Idea",
  in_progress: "In progress",
  done: "Done",
};

function ProjectCard({
  project,
  onOpen,
}: {
  project: CreationProject;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-lg border border-border bg-card/60 hover:bg-card p-4 transition-colors w-full"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium line-clamp-1">{project.name}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
          {STATUS_LABEL[project.status]}
        </span>
      </div>
      {project.description ? (
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
      ) : null}
    </button>
  );
}

export default function Lab() {
  const navigate = useNavigate();
  const { projects, loading, createProject, refresh } = useLabProjects();
  const [startOpen, setStartOpen] = useState(false);
  const [mode, setMode] = useState<"project" | "item">("project");

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStatus, setNewStatus] = useState<LabProjectStatus>("in_progress");
  const [submitting, setSubmitting] = useState(false);

  const [itemProjectId, setItemProjectId] = useState<string>("");
  const [itemType, setItemType] = useState<LabItemType>("note");
  const [itemTitle, setItemTitle] = useState("");
  const [itemBody, setItemBody] = useState("");
  const [itemBusy, setItemBusy] = useState(false);

  const itemHooks = useLabItems(itemProjectId || undefined);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === "in_progress"),
    [projects]
  );
  const ideaProjects = useMemo(() => projects.filter((p) => p.status === "idea"), [projects]);
  const recentProjects = useMemo(() => projects.slice(0, 10), [projects]);

  const openStart = () => {
    setMode("project");
    setNewName("");
    setNewDescription("");
    setNewStatus("in_progress");
    setItemProjectId(projects[0]?.id ?? "");
    setItemType("note");
    setItemTitle("");
    setItemBody("");
    setStartOpen(true);
  };

  const submitNewProject = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const p = await createProject(newName, {
        description: newDescription,
        status: newStatus,
      });
      if (p) {
        setStartOpen(false);
        navigate(`/lab/project/${p.id}`);
      } else {
        toast.error("Failed to create project. Please try again.");
      }
    } catch (err) {
      console.error("Failed to create project:", err);
      toast.error("Failed to create project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitNewItem = async () => {
    if (!itemProjectId) return;
    setItemBusy(true);
    try {
      if (itemType === "media" || itemType === "file") {
        // handled by file input elsewhere
        return;
      }
      await itemHooks.addTextItem(itemType, itemTitle, itemBody);
      setStartOpen(false);
      navigate(`/lab/project/${itemProjectId}`);
      await refresh();
    } finally {
      setItemBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 mt-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">Lab</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Lightweight workspace for models, design, notes, code, and media
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openStart} className="sm:mt-0 self-start sm:self-auto">
            <Plus className="h-4 w-4 mr-1.5" />
            Start something new
          </Button>
        </header>

        {/* Content */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading projects…
          </div>
        ) : (
          <div className="space-y-10">
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Active projects
              </h2>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No projects in progress.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {activeProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={() => navigate(`/lab/project/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Recently worked on
              </h2>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet — start a project.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {recentProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={() => navigate(`/lab/project/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Ideas / backlog
              </h2>
              {ideaProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No ideas on the shelf.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {ideaProjects.map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      onOpen={() => navigate(`/lab/project/${p.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start something new</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 py-1">
            <Button
              type="button"
              variant={mode === "project" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("project")}
            >
              New project
            </Button>
            <Button
              type="button"
              variant={mode === "item" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("item")}
            >
              Add to project
            </Button>
          </div>

          {mode === "project" ? (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="np-name">Name</Label>
                <Input
                  id="np-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Desk lamp concept"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="np-desc">Short description</Label>
                <Textarea
                  id="np-desc"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What is this for?"
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={newStatus}
                  onValueChange={(v) => setNewStatus(v as LabProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <AddItemForm
              projects={projects}
              itemProjectId={itemProjectId}
              setItemProjectId={setItemProjectId}
              itemType={itemType}
              setItemType={setItemType}
              itemTitle={itemTitle}
              setItemTitle={setItemTitle}
              itemBody={itemBody}
              setItemBody={setItemBody}
              addFileItem={itemHooks.addFileItem}
              onDone={async () => {
                setStartOpen(false);
                if (itemProjectId) navigate(`/lab/project/${itemProjectId}`);
                await refresh();
              }}
            />
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {mode === "project" ? (
              <Button type="button" onClick={submitNewProject} disabled={!newName.trim() || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Create project
              </Button>
            ) : itemType === "media" || itemType === "file" ? null : (
              <Button
                type="button"
                onClick={submitNewItem}
                disabled={!itemProjectId || itemBusy}
              >
                Add item
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddItemForm({
  projects,
  itemProjectId,
  setItemProjectId,
  itemType,
  setItemType,
  itemTitle,
  setItemTitle,
  itemBody,
  setItemBody,
  addFileItem,
  onDone,
}: {
  projects: CreationProject[];
  itemProjectId: string;
  setItemProjectId: (id: string) => void;
  itemType: LabItemType;
  setItemType: (t: LabItemType) => void;
  itemTitle: string;
  setItemTitle: (s: string) => void;
  itemBody: string;
  setItemBody: (s: string) => void;
  addFileItem: (itemType: "media" | "file", file: File, title?: string) => Promise<unknown>;
  onDone: () => Promise<void>;
}) {
  const fileAccept =
    itemType === "media"
      ? "image/*,video/*"
      : "*/*";

  if (projects.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Create a project first.</p>;
  }

  return (
    <div className="space-y-3 py-2">
      <div className="space-y-1.5">
        <Label>Project</Label>
        <Select value={itemProjectId} onValueChange={setItemProjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Choose project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <Select value={itemType} onValueChange={(v) => setItemType(v as LabItemType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="note">Note / document</SelectItem>
            <SelectItem value="design">UI / design mockup</SelectItem>
            <SelectItem value="code">Code snippet</SelectItem>
            <SelectItem value="automation">Automation</SelectItem>
            <SelectItem value="media">Image or video</SelectItem>
            <SelectItem value="file">Other file</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {itemType === "media" || itemType === "file" ? (
        <div className="space-y-1.5">
          <Label htmlFor="lab-file">File</Label>
          <Input
            id="lab-file"
            type="file"
            accept={fileAccept}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f || !itemProjectId) return;
              await addFileItem(itemType, f, itemTitle);
              e.target.value = "";
              await onDone();
            }}
          />
          <p className="text-xs text-muted-foreground">
            {itemType === "media"
              ? "Images or short video clips are stored in your project."
              : "Any file type you want to keep with this project."}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="ni-title">Title</Label>
            <Input
              id="ni-title"
              value={itemTitle}
              onChange={(e) => setItemTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ni-body">Content</Label>
            <Textarea
              id="ni-body"
              value={itemBody}
              onChange={(e) => setItemBody(e.target.value)}
              rows={5}
              placeholder="Write notes, paste code, describe an automation…"
            />
          </div>
        </>
      )}
    </div>
  );
}
