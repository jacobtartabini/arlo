import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Trash2, Download, Share2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import { PageNoteEditor } from "@/components/notes/PageNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { useLabItems } from "@/hooks/useLabItems";
import { useLabProjects } from "@/hooks/useLabProjects";
import type { Note, NoteType, PageMode } from "@/types/notes";
import { generatePdfFromElement, downloadBlob, sharePdf } from "@/lib/notes-pdf";

/**
 * Lab Note Editor
 *
 * Reuses the exact same note editing experience as /notes (NoteCanvas /
 * PageNoteEditor) for notes that live inside a Lab project.
 *
 * Persistence model:
 *  - The note row lives in the `notes` table (handled by useNotesPersistence)
 *    so we get all of the rich canvas / page editing for free.
 *  - The lab_item row is the link record between the project and the note.
 *    metadata.note_id stores the linked notes.id and metadata.lab_project=true
 *    flags that this note belongs to a lab project (so we can hide it from
 *    the main / notes sidebar later if desired).
 *  - The note is also tagged `lab:<projectId>` for discoverability.
 */
export default function LabNoteEditor() {
  const { projectId, itemId } = useParams<{ projectId: string; itemId: string }>();
  const navigate = useNavigate();

  const { projects } = useLabProjects();
  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const {
    items,
    loading: itemsLoading,
    addTextItem,
    updateItem,
    deleteItem,
  } = useLabItems(projectId);

  const {
    notes,
    folders,
    isLoading: notesLoading,
    isAuthenticated,
    createNote,
    saveNote,
    deleteNote,
  } = useNotesPersistence();

  const isNew = itemId === "new";
  const labItem = useMemo(
    () => (isNew ? null : items.find((i) => i.id === itemId) ?? null),
    [items, itemId, isNew]
  );

  const linkedNoteId = useMemo(() => {
    if (!labItem) return null;
    const meta = (labItem.metadata ?? {}) as Record<string, unknown>;
    const id = meta.note_id;
    return typeof id === "string" ? id : null;
  }, [labItem]);

  const linkedNote = useMemo(
    () => (linkedNoteId ? notes.find((n) => n.id === linkedNoteId) ?? null : null),
    [notes, linkedNoteId]
  );

  // Local title state so we can edit it inline.
  const [title, setTitle] = useState("");
  const titleInitRef = useRef(false);
  useEffect(() => {
    if (titleInitRef.current) return;
    if (linkedNote) {
      setTitle(linkedNote.title);
      titleInitRef.current = true;
    } else if (labItem) {
      setTitle(labItem.title);
      titleInitRef.current = true;
    }
  }, [linkedNote, labItem]);

  // For brand-new notes, prompt the user to choose Canvas vs Page (and page mode).
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Open the dialog whenever we're in "new" mode.
  useEffect(() => {
    if (isNew && !creating) setCreateDialogOpen(true);
  }, [isNew, creating]);

  // Open the dialog if the lab_item exists but somehow has no linked note yet
  // (e.g. created via the older flow). Wait until we know the items + notes
  // are loaded so we don't flash the dialog incorrectly.
  useEffect(() => {
    if (isNew) return;
    if (itemsLoading || notesLoading) return;
    if (!labItem) return;
    if (!linkedNoteId) {
      setCreateDialogOpen(true);
    }
  }, [isNew, itemsLoading, notesLoading, labItem, linkedNoteId]);

  const handleCreateNote = useCallback(
    async (noteType: NoteType, _folderId?: string, pageMode?: PageMode) => {
      if (!projectId || creating) return;
      setCreating(true);
      try {
        const projectName = project?.name?.trim() || "Lab project";
        const seedTitle = title.trim() || `Untitled ${noteType} note`;

        // 1. Create the underlying note in the notes table.
        const newNote = await createNote({
          noteType,
          pageMode,
          title: seedTitle,
          tags: [`lab:${projectId}`],
        });
        if (!newNote) throw new Error("Could not create note");

        if (isNew) {
          // 2. Create the lab_item link record.
          const created = await addTextItem("note", seedTitle, null);
          if (!created) {
            // Best-effort: clean up the orphan note.
            await deleteNote(newNote.id);
            throw new Error("Could not link note to project");
          }
          await updateItem(created.id, {
            metadata: {
              note_id: newNote.id,
              lab_project: true,
              project_name: projectName,
            },
          });
          // Navigate to the canonical URL so refresh works.
          navigate(`/lab/project/${projectId}/note/${created.id}`, { replace: true });
        } else if (labItem) {
          // 2. Attach the new note to the existing lab_item.
          await updateItem(labItem.id, {
            title: seedTitle,
            metadata: {
              ...(labItem.metadata ?? {}),
              note_id: newNote.id,
              lab_project: true,
              project_name: projectName,
            },
          });
        }

        setCreateDialogOpen(false);
        toast.success(`New ${noteType} note added to project`);
      } catch (err) {
        console.error("[LabNoteEditor] create failed:", err);
        toast.error("Couldn't create note");
      } finally {
        setCreating(false);
      }
    },
    [
      projectId,
      creating,
      project,
      title,
      createNote,
      isNew,
      addTextItem,
      deleteNote,
      updateItem,
      labItem,
      navigate,
    ]
  );

  // Keep the lab_item title in sync when the user renames the note.
  const persistTitle = useCallback(
    async (next: string) => {
      const trimmed = next.trim() || "Untitled note";
      if (linkedNote && trimmed !== linkedNote.title) {
        await saveNote({ ...linkedNote, title: trimmed });
      }
      if (labItem && trimmed !== labItem.title) {
        await updateItem(labItem.id, { title: trimmed });
      }
    },
    [linkedNote, labItem, saveNote, updateItem]
  );

  const handleSaveCanvas = useCallback(
    async (canvasState: string, zoom: number, panX: number, panY: number) => {
      if (!linkedNote) return;
      await saveNote({ ...linkedNote, canvasState, zoom, panX, panY });
    },
    [linkedNote, saveNote]
  );

  const handleSavePageContent = useCallback(
    async (content: string) => {
      if (!linkedNote) return;
      await saveNote({ ...linkedNote, canvasState: content });
    },
    [linkedNote, saveNote]
  );

  const handleDelete = useCallback(async () => {
    if (!labItem) {
      navigate(`/lab/project/${projectId}`);
      return;
    }
    if (!confirm("Delete this note? This cannot be undone.")) return;
    if (linkedNoteId) {
      await deleteNote(linkedNoteId);
    }
    await deleteItem(labItem.id);
    navigate(`/lab/project/${projectId}`);
  }, [labItem, linkedNoteId, deleteNote, deleteItem, navigate, projectId]);

  // Export / share — same approach as /notes
  const [isExporting, setIsExporting] = useState(false);

  const generateNotePdf = useCallback(async (): Promise<Blob | null> => {
    if (!linkedNote) return null;
    await new Promise((r) => setTimeout(r, 50));
    const el = document.querySelector('[data-note-content="true"]') as HTMLElement | null;
    if (!el) return null;
    return generatePdfFromElement(el, {
      title: linkedNote.title,
      format: "a4",
      orientation: "portrait",
    });
  }, [linkedNote]);

  const handleExportPdf = useCallback(async () => {
    if (!linkedNote) return;
    setIsExporting(true);
    try {
      const blob = await generateNotePdf();
      if (blob) {
        const filename = `${linkedNote.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
        downloadBlob(blob, filename);
        toast.success("PDF exported");
      } else {
        window.print();
      }
    } catch (e) {
      console.error(e);
      window.print();
    } finally {
      setIsExporting(false);
    }
  }, [linkedNote, generateNotePdf]);

  const handleShare = useCallback(async () => {
    if (!linkedNote) return;
    setIsExporting(true);
    try {
      const blob = await generateNotePdf();
      if (blob) {
        const shared = await sharePdf(blob, linkedNote.title);
        if (shared) toast.success("Shared");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error(e);
    } finally {
      setIsExporting(false);
    }
  }, [linkedNote, generateNotePdf]);

  if (!projectId) {
    navigate("/lab", { replace: true });
    return null;
  }

  if (!isAuthenticated && !notesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Sign-in required.</div>
      </div>
    );
  }

  const showLoading =
    (itemsLoading && !isNew) || notesLoading || (labItem && linkedNoteId && !linkedNote);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar — mirrors /notes header styling */}
      <header className="flex items-center justify-between border-b border-border/40 bg-card/30 px-4 py-3 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/lab/project/${projectId}`)}
            className="shrink-0 h-8 w-8 rounded-lg"
            aria-label="Back to project"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal shrink-0">
            Lab note
          </Badge>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => persistTitle(title)}
            placeholder="Note title"
            className="h-8 text-sm font-medium border-none bg-transparent px-0 focus-visible:ring-0 truncate"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {linkedNote && (
            <>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {linkedNote.noteType === "page" && linkedNote.pageMode
                  ? `${linkedNote.pageMode} mode`
                  : linkedNote.noteType}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handleExportPdf}
                disabled={isExporting}
                title="Export as PDF"
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={handleShare}
                disabled={isExporting}
                title="Share as PDF"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {labItem && (
            <Button variant="outline" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </header>

      {/* Editor */}
      <div className="flex-1 relative min-h-0">
        {showLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedNote ? (
          linkedNote.noteType === "page" ? (
            <PageNoteEditor
              key={linkedNote.id}
              note={linkedNote}
              onSave={handleSavePageContent}
            />
          ) : (
            <NoteCanvas
              key={linkedNote.id}
              note={linkedNote}
              onSave={handleSaveCanvas}
            />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <p className="text-sm text-muted-foreground mb-4">
                Choose a note type to get started.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>Create note</Button>
            </div>
          </div>
        )}
      </div>

      {/* Same Create Note dialog as /notes */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          // Don't allow closing the dialog if there's no note yet — bounce back to project.
          if (!open && !linkedNote && !creating) {
            navigate(`/lab/project/${projectId}`);
            return;
          }
          setCreateDialogOpen(open);
        }}
        onCreateNote={handleCreateNote}
        folders={folders}
      />
    </div>
  );
}
