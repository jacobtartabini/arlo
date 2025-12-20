"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelLeft } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import type { Note } from "@/types/notes";
import { useNotes } from "@/hooks/use-notes";
import { toast } from "sonner";

export default function Notes() {
  const navigate = useNavigate();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    notes,
    loading,
    createNote,
    saveNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    renameNote,
  } = useNotes();

  // Set page title
  useEffect(() => {
    document.title = "Smart Notes — Arlo";
  }, []);

  // Auto-select first note when notes load
  useEffect(() => {
    if (!loading && notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].id);
    }
  }, [loading, notes, selectedNoteId]);

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
      await deleteNote(noteId);

      if (selectedNoteId === noteId) {
        const remaining = notes.filter((n) => n.id !== noteId);
        setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
      }

      toast.success(`"${noteToDelete?.title}" deleted`);
    },
    [notes, selectedNoteId, deleteNote]
  );

  const handleDuplicateNote = useCallback(
    async (noteId: string) => {
      await duplicateNote(noteId);
      toast.success("Note duplicated");
    },
    [duplicateNote]
  );

  const handleTogglePin = useCallback(
    async (noteId: string) => {
      await togglePinNote(noteId);
    },
    [togglePinNote]
  );

  const handleRenameNote = useCallback(
    async (noteId: string, title: string) => {
      await renameNote(noteId, title);
    },
    [renameNote]
  );

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading notes...</div>
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
                <p className="text-muted-foreground mb-4">No note selected</p>
                <Button onClick={handleCreateNote}>Create a note</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
