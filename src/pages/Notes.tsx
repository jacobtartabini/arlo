"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelLeft, LogIn, Loader2 } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import type { Note } from "@/types/notes";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { toast } from "sonner";

export default function Notes() {
  const navigate = useNavigate();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    notes,
    isLoading,
    isAuthenticated,
    createNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    renameNote,
    saveNote,
  } = useNotesPersistence();

  // Set page title
  useEffect(() => {
    document.title = "Smart Notes — Arlo";
  }, []);

  // Auto-select first note when notes load
  useEffect(() => {
    if (!isLoading && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [isLoading, notes, selectedNoteId]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleCreateNote = useCallback(async () => {
    const newNote = await createNote();
    if (newNote) {
      setSelectedNoteId(newNote.id);
      toast.success("New note created");
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
          selectedNoteId={selectedNoteId}
          onSelectNote={setSelectedNoteId}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onDuplicateNote={handleDuplicateNote}
          onTogglePin={handleTogglePin}
          onRenameNote={handleRenameNote}
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
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
          
          {selectedNote && (
            <h1 className="text-sm font-medium text-foreground truncate max-w-[300px]">
              {selectedNote.title}
            </h1>
          )}
          
          <div className="w-24" /> {/* Spacer for balance */}
        </header>

        {/* Canvas area */}
        <div className="flex-1 relative">
          {selectedNote ? (
            <NoteCanvas
              key={selectedNote.id}
              note={selectedNote}
              onSave={handleSaveCanvas}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  {notes.length === 0 ? "No notes yet" : "No note selected"}
                </p>
                <Button onClick={handleCreateNote}>Create a note</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
