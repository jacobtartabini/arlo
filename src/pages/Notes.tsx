"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelLeft, LogIn, Loader2 } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import { PageNoteEditor } from "@/components/notes/PageNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import type { Note, NoteType } from "@/types/notes";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { toast } from "sonner";

export default function Notes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const {
    notes,
    folders,
    isLoading,
    isAuthenticated,
    createNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    renameNote,
    saveNote,
    createFolder,
    deleteFolder,
  } = useNotesPersistence();

  // Set page title
  useEffect(() => {
    document.title = "Smart Notes — Arlo";
  }, []);

  // Handle opening a specific note from navigation state
  useEffect(() => {
    const state = location.state as { openNoteId?: string } | null;
    if (state?.openNoteId) {
      setSelectedNoteId(state.openNoteId);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-select first note when notes load
  useEffect(() => {
    if (!isLoading && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [isLoading, notes, selectedNoteId]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateNote = useCallback(async (noteType: NoteType, folderId?: string) => {
    const newNote = await createNote({ noteType, folderId });
    if (newNote) {
      setSelectedNoteId(newNote.id);
      if (folderId) {
        setSelectedFolderId(folderId);
      }
      toast.success(`New ${noteType} note created`);
    }
  }, [createNote]);

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      const noteToDelete = notes.find((n) => n.id === noteId);
      const success = await deleteNote(noteId);
      
      if (success) {
        // Select another note if the deleted one was selected
        if (selectedNoteId === noteId) {
          const remainingNotes = notes.filter(n => n.id !== noteId);
          setSelectedNoteId(remainingNotes.length > 0 ? remainingNotes[0].id : null);
        }
        toast.success(`"${noteToDelete?.title}" deleted`);
      }
    },
    [notes, selectedNoteId, deleteNote]
  );

  const handleDuplicateNote = useCallback(async (noteId: string) => {
    const duplicated = await duplicateNote(noteId);
    if (duplicated) {
      setSelectedNoteId(duplicated.id);
      toast.success("Note duplicated");
    }
  }, [duplicateNote]);

  const handleTogglePin = useCallback(async (noteId: string) => {
    await togglePinNote(noteId);
  }, [togglePinNote]);

  const handleRenameNote = useCallback(async (noteId: string, title: string) => {
    await renameNote(noteId, title);
  }, [renameNote]);

  const handleMoveToFolder = useCallback(async (noteId: string, folderId: string | null) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      await saveNote({ ...note, folderId: folderId ?? undefined });
      toast.success(folderId ? "Note moved to folder" : "Note removed from folder");
    }
  }, [notes, saveNote]);

  const handleCreateFolder = useCallback(async () => {
    const name = prompt("Enter folder name:");
    if (name?.trim()) {
      const folder = await createFolder(name.trim());
      if (folder) {
        toast.success(`Folder "${folder.name}" created`);
      }
    }
  }, [createFolder]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder && confirm(`Delete folder "${folder.name}"? Notes will be moved to All Notes.`)) {
      await deleteFolder(folderId);
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast.success(`Folder "${folder.name}" deleted`);
    }
  }, [folders, selectedFolderId, deleteFolder]);

  const handleSaveCanvas = useCallback(
    async (canvasState: string, zoom: number, panX: number, panY: number) => {
      if (!selectedNote) return;
      
      const updatedNote: Note = {
        ...selectedNote,
        canvasState,
        zoom,
        panX,
        panY,
      };
      
      await saveNote(updatedNote);
    },
    [selectedNote, saveNote]
  );

  const handleSavePageContent = useCallback(
    async (content: string) => {
      if (!selectedNote) return;
      
      const updatedNote: Note = {
        ...selectedNote,
        canvasState: content,
      };
      
      await saveNote(updatedNote);
    },
    [selectedNote, saveNote]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading notes...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Sign in to access Notes</h2>
          <p className="text-muted-foreground">
            Your notes are securely stored in the cloud and sync across all your devices.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      {sidebarOpen && (
        <NotesSidebar
          notes={notes}
          folders={folders}
          selectedNoteId={selectedNoteId}
          selectedFolderId={selectedFolderId}
          onSelectNote={setSelectedNoteId}
          onSelectFolder={setSelectedFolderId}
          onCreateNote={handleOpenCreateDialog}
          onCreateFolder={handleCreateFolder}
          onDeleteNote={handleDeleteNote}
          onDuplicateNote={handleDuplicateNote}
          onTogglePin={handleTogglePin}
          onRenameNote={handleRenameNote}
          onMoveToFolder={handleMoveToFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border/40 bg-card/30 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => navigate("/notes-dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
          
          {selectedNote && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {selectedNote.noteType}
              </span>
              <h1 className="text-sm font-medium text-foreground truncate max-w-[300px]">
                {selectedNote.title}
              </h1>
            </div>
          )}
          
          <div className="w-24" /> {/* Spacer for balance */}
        </header>

        {/* Editor area */}
        <div className="flex-1 relative">
          {selectedNote ? (
            selectedNote.noteType === "page" ? (
              <PageNoteEditor
                key={selectedNote.id}
                note={selectedNote}
                onSave={handleSavePageContent}
              />
            ) : (
              <NoteCanvas
                key={selectedNote.id}
                note={selectedNote}
                onSave={handleSaveCanvas}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {notes.length === 0 ? "No notes yet" : "No note selected"}
                </p>
                <Button onClick={handleOpenCreateDialog}>Create a note</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Note Dialog */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateNote={handleCreateNote}
        folders={folders}
        defaultFolderId={selectedFolderId ?? undefined}
      />
    </div>
  );
}
