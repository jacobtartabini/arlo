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
  Paperclip,
  Plus,
  StickyNote,
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
  DialogDescription,
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

// Tailwind-safe color tokens per type (uses semantic tokens + tinted bg for the icon swatch)
const TYPE_SWATCH: Record<LabItemType, string> = {
  note: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  design: "bg-primary/10 text-primary",
  code: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  automation: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  media: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  file: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

function ItemIcon({ type, className }: { type: LabItemType; className?: string }) {
  const cls = className ?? "h-4 w-4";
  switch (type) {
    case "note":
      return <StickyNote className={cls} />;
    case "design":
      return <Box className={cls} />;
    case "code":
      return <FileCode className={cls} />;
    case "automation":
      return <Workflow className={cls} />;
    case "media":
      return <ImageIcon className={cls} />;
    case "file":
      return <FileText className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

type EditorKind = "note" | "code" | "automation";

const EDITOR_META: Record<EditorKind, { title: string; description: string; placeholderTitle: string; placeholderBody: string; mono: boolean }> = {
  note: {
    title: "New note",
    description: "Capture ideas, requirements, or research for this project.",
    placeholderTitle: "Note title",
    placeholderBody: "Write anything…",
    mono: false,
  },
  code: {
    title: "New code snippet",
    description: "Paste a snippet, command, or config to keep with this project.",
    placeholderTitle: "Snippet name",
    placeholderBody: "// paste your code here",
    mono: true,
  },
  automation: {
    title: "New automation",
    description: "Describe a workflow, trigger, or recipe to revisit later.",
    placeholderTitle: "Automation name",
    placeholderBody: "When X happens, do Y…",
    mono: false,
  },
};

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

  // Edit existing item
  const [editItem, setEditItem] = useState<LabItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  // Create new text item (note / code / automation)
  const [creatorKind, setCreatorKind] = useState<EditorKind | null>(null);
  const [creatorTitle, setCreatorTitle] = useState("");
  const [creatorBody, setCreatorBody] = useState("");
  const [creatorBusy, setCreatorBusy] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (item.item_type === "design") {
      navigate(`/lab/project/${projectId}/model`);
      return;
    }
    navigate(`/lab/project/${projectId}/item/${item.id}`);
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    await updateItem(editItem.id, { title: editTitle, body: editBody });
    setEditItem(null);
  };

  const openCreator = (kind: EditorKind) => {
    if (!projectId) return;
    navigate(`/lab/project/${projectId}/item/new?kind=${kind}`);
  };

  const submitCreator = async () => {
    if (!creatorKind || creatorBusy) return;
    setCreatorBusy(true);
    try {
      const meta = EDITOR_META[creatorKind];
      await addTextItem(
        creatorKind,
        creatorTitle.trim() || meta.placeholderTitle,
        creatorBody
      );
      setCreatorKind(null);
    } finally {
      setCreatorBusy(false);
    }
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

  const editorMeta = creatorKind ? EDITOR_META[creatorKind] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/lab")} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FlaskConical className="h-4 w-4" />
          </div>
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
              className="font-semibold text-lg h-9 border-none bg-transparent px-0 focus-visible:ring-0 tracking-tight"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => {
                if (description !== project.description) persistMeta({ description });
              }}
              placeholder="Add a short description"
              rows={1}
              className="text-sm text-muted-foreground resize-none border-none bg-transparent px-0 py-0 min-h-[1.5rem] focus-visible:ring-0"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              const s = v as LabProjectStatus;
              setStatus(s);
              persistMeta({ status: s });
            }}
          >
            <SelectTrigger className="w-[140px] h-9 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">{STATUS_LABEL.idea}</SelectItem>
              <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
              <SelectItem value="done">{STATUS_LABEL.done}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Add to project */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Add to project
            </h2>
            <span className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <AddTile
              type="note"
              label="Note"
              hint="Write"
              onClick={() => openCreator("note")}
            />
            <AddTile
              type="code"
              label="Code"
              hint="Snippet"
              onClick={() => openCreator("code")}
            />
            <AddTile
              type="automation"
              label="Automation"
              hint="Workflow"
              onClick={() => openCreator("automation")}
            />
            <AddTile
              type="design"
              label="Design"
              hint="3D model"
              onClick={() => navigate(`/lab/project/${projectId}/model`)}
            />
            <AddTile
              type="media"
              label="Media"
              hint="Image / video"
              onClick={() => mediaInputRef.current?.click()}
            />
            <AddTile
              type="file"
              label="File"
              hint="Any file"
              onClick={() => fileInputRef.current?.click()}
            />
          </div>

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await addFileItem("media", f);
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await addFileItem("file", f);
              e.target.value = "";
            }}
          />
        </section>

        {/* Items list */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            In this project
          </h2>

          {itemsLoading ? (
            <div className="rounded-xl border border-border/60 bg-card/40 p-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading items…
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <Plus className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">Nothing in this project yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the tiles above to add a note, code, design, media, or any file.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card/40 divide-y divide-border/60 overflow-hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TYPE_SWATCH[item.item_type]}`}
                  >
                    <ItemIcon type={item.item_type} className="h-5 w-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.item_type === "design") {
                        navigate(`/lab/project/${projectId}/model`);
                        return;
                      }
                      if (item.item_type !== "media" && item.item_type !== "file") {
                        openEditItem(item);
                      }
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        {ITEM_TYPE_LABEL[item.item_type]}
                      </span>
                    </div>
                    <div className="font-medium line-clamp-1">{item.title}</div>
                    {item.body ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 whitespace-pre-wrap">
                        {item.body}
                      </p>
                    ) : null}
                    {item.file_path ? (
                      <FileLink filePath={item.file_path} getFileUrl={getFileUrl} />
                    ) : null}
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {item.item_type === "design" ? (
                        <DropdownMenuItem
                          onClick={() => navigate(`/lab/project/${projectId}/model`)}
                        >
                          Open 3D editor
                        </DropdownMenuItem>
                      ) : item.item_type !== "media" && item.item_type !== "file" ? (
                        <DropdownMenuItem onClick={() => openEditItem(item)}>
                          Edit
                        </DropdownMenuItem>
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
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Edit item dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editItem ? ITEM_TYPE_LABEL[editItem.item_type].toLowerCase() : "item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
                className={editItem?.item_type === "code" ? "font-mono text-sm" : ""}
              />
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

      {/* Create item dialog */}
      <Dialog open={!!creatorKind} onOpenChange={(o) => !o && setCreatorKind(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editorMeta?.title ?? "New item"}</DialogTitle>
            {editorMeta ? (
              <DialogDescription>{editorMeta.description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="creator-title">Title</Label>
              <Input
                id="creator-title"
                value={creatorTitle}
                onChange={(e) => setCreatorTitle(e.target.value)}
                placeholder={editorMeta?.placeholderTitle}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creator-body">Content</Label>
              <Textarea
                id="creator-body"
                value={creatorBody}
                onChange={(e) => setCreatorBody(e.target.value)}
                rows={10}
                placeholder={editorMeta?.placeholderBody}
                className={editorMeta?.mono ? "font-mono text-sm" : ""}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatorKind(null)} disabled={creatorBusy}>
              Cancel
            </Button>
            <Button onClick={submitCreator} disabled={creatorBusy}>
              {creatorBusy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddTile({
  type,
  label,
  hint,
  onClick,
}: {
  type: LabItemType;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col items-start gap-2 rounded-xl border border-border/60 bg-card/40 hover:bg-card hover:border-border transition-colors p-3 text-left"
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${TYPE_SWATCH[type]}`}
      >
        <ItemIcon type={type} className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{hint}</div>
      </div>
      <Plus className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function FileLink({
  filePath,
  getFileUrl,
}: {
  filePath: string;
  getFileUrl: (p: string) => Promise<string | null>;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    getFileUrl(filePath).then(setUrl);
  }, [filePath, getFileUrl]);
  if (!url) return <span className="text-sm text-muted-foreground mt-1 inline-block">Loading…</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-sm text-primary hover:underline mt-1 inline-flex items-center gap-1"
    >
      <Paperclip className="h-3 w-3" />
      Open file
    </a>
  );
}
