import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Box,
  FileCode,
  FileImage,
  FileText,
  FlaskConical,
  ImageIcon,
  Loader2,
  MoreHorizontal,
  Trash2,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLabProjects } from "@/hooks/useLabProjects";
import { useLabItems } from "@/hooks/useLabItems";
import type { LabItem, LabItemType, LabProjectStatus } from "@/types/creation";

const STATUS_LABEL: Record<LabProjectStatus, string> = {
  idea: "Idea",
  in_progress: "In progress",
  done: "Done",
};

const ITEM_TYPE_LABEL: Record<LabItemType, string> = {
  note: "Note",
  design: "Design",
  code: "Code",
  automation: "Automation",
  media: "Media",
  file: "File",
};

function ItemIcon({ type }: { type: LabItemType }) {
  switch (type) {
    case "design":
      return <FileImage className="h-4 w-4" />;
    case "code":
      return <FileCode className="h-4 w-4" />;
    case "automation":
      return <Workflow className="h-4 w-4" />;
    case "media":
      return <ImageIcon className="h-4 w-4" />;
    case "file":
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function LabProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, loading: projectsLoading, updateProject, touchProject } = useLabProjects();
  const {
    items,
    loading: itemsLoading,
    addTextItem,
    addFileItem,
    updateItem,
    deleteItem,
    getFileUrl,
  } = useLabItems(projectId);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<LabProjectStatus>("in_progress");
  const [editItem, setEditItem] = useState<LabItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  useEffect(() => {
    if (!projectId) return;
    touchProject(projectId);
  }, [projectId, touchProject]);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description);
    setStatus(project.status);
  }, [project]);

  const persistMeta = async (patch: Partial<{ name: string; description: string; status: LabProjectStatus }>) => {
    if (!projectId) return;
    await updateProject(projectId, patch);
  };

  const openEditItem = (item: LabItem) => {
    if (item.item_type === "media" || item.item_type === "file") return;
    setEditItem(item);
    setEditTitle(item.title);
    setEditBody(item.body ?? "");
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    await updateItem(editItem.id, { title: editTitle, body: editBody });
    setEditItem(null);
  };

  if (!projectId) {
    navigate("/lab", { replace: true });
    return null;
  }

  if (projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground text-sm">Project not found.</p>
        <Button variant="outline" onClick={() => navigate("/lab")}>
          Back to Lab
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/lab")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FlaskConical className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-[200px] space-y-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (!name.trim()) {
                setName(project.name);
                return;
              }
              if (name.trim() !== project.name) persistMeta({ name: name.trim() });
            }}
            className="font-semibold text-base h-9 border-none bg-transparent px-0 focus-visible:ring-0"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== project.description) persistMeta({ description });
            }}
            placeholder="Short description"
            rows={2}
            className="text-sm text-muted-foreground resize-none border-none bg-transparent px-0 py-0 min-h-[2.5rem] focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground sr-only">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => {
              const s = v as LabProjectStatus;
              setStatus(s);
              persistMeta({ status: s });
            }}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">{STATUS_LABEL.idea}</SelectItem>
              <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
              <SelectItem value="done">{STATUS_LABEL.done}</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => navigate(`/lab/project/${projectId}/model`)}>
            <Box className="h-4 w-4 mr-1.5" />
            3D model
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            In this project
          </h2>

          <div className="rounded-lg border border-border bg-card/40 divide-y divide-border">
            <button
              type="button"
              onClick={() => navigate(`/lab/project/${projectId}/model`)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">3D model</div>
                <div className="text-xs text-muted-foreground">
                  Primitives, imported meshes, booleans, export
                </div>
              </div>
            </button>

            {itemsLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading items…</div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                    <ItemIcon type={item.item_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {ITEM_TYPE_LABEL[item.item_type]}
                      </span>
                    </div>
                    <div className="font-medium line-clamp-1">{item.title}</div>
                    {item.body ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
                    ) : null}
                    {item.file_path ? (
                      <FileLink filePath={item.file_path} getFileUrl={getFileUrl} />
                    ) : null}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.item_type !== "media" && item.item_type !== "file" ? (
                        <DropdownMenuItem onClick={() => openEditItem(item)}>Edit</DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AddItemMenu
            onAddNote={async () => {
              await addTextItem("note", "New note", "");
            }}
            onAddDesign={async () => {
              await addTextItem("design", "Design notes", "");
            }}
            onAddCode={async () => {
              await addTextItem("code", "Snippet", "");
            }}
            onAddAutomation={async () => {
              await addTextItem("automation", "Automation", "");
            }}
            onAddMedia={(file) => addFileItem("media", file)}
            onAddFile={(file) => addFileItem("file", file)}
          />
        </div>
      </main>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={8} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={saveEditItem}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddItemMenu({
  onAddNote,
  onAddDesign,
  onAddCode,
  onAddAutomation,
  onAddMedia,
  onAddFile,
}: {
  onAddNote: () => Promise<void>;
  onAddDesign: () => Promise<void>;
  onAddCode: () => Promise<void>;
  onAddAutomation: () => Promise<void>;
  onAddMedia: (f: File) => Promise<unknown>;
  onAddFile: (f: File) => Promise<unknown>;
}) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={onAddNote}>
        + Note
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddDesign}>
        + Design
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddCode}>
        + Code
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddAutomation}>
        + Automation
      </Button>
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await onAddMedia(f);
          e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" onClick={() => mediaInputRef.current?.click()}>
        + Media
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) await onAddFile(f);
          e.target.value = "";
        }}
      />
      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
        + File
      </Button>
    </>
  );
}
