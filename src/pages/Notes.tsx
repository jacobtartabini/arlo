"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeftClose, PanelLeft } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import type { Note } from "@/types/notes";
import {
  createNote,
  deleteNote,
  duplicateNote,
  getStoredNotes,
  renameNote,
  saveNote,
  sortNotesByRecent,
  togglePinNote,
} from "@/lib/notes-data";
import { toast } from "sonner";

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load notes on mount
  useEffect(() => {
    document.title = "Smart Notes — Arlo";
    const storedNotes = sortNotesByRecent(getStoredNotes());
    setNotes(storedNotes);
    
    // Auto-select first note or create one
    if (storedNotes.length > 0) {
      setSelectedNoteId(storedNotes[0].id);
    }
  }, []);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleCreateNote = useCallback(() => {
    const newNote = createNote();
    const updatedNotes = saveNote(newNote);
    setNotes(sortNotesByRecent(updatedNotes));
    setSelectedNoteId(newNote.id);
    toast.success("New note created");
  }, []);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      const noteToDelete = notes.find((n) => n.id === noteId);
      const updatedNotes = deleteNote(noteId);
      setNotes(sortNotesByRecent(updatedNotes));
      
      // Select another note if the deleted one was selected
      if (selectedNoteId === noteId) {
        setSelectedNoteId(updatedNotes.length > 0 ? updatedNotes[0].id : null);
      }
      
      toast.success(`"${noteToDelete?.title}" deleted`);
    },
    [notes, selectedNoteId]
  );

  const handleDuplicateNote = useCallback((noteId: string) => {
    const updatedNotes = duplicateNote(noteId);
    setNotes(sortNotesByRecent(updatedNotes));
    toast.success("Note duplicated");
  }, []);

  const handleTogglePin = useCallback((noteId: string) => {
    const updatedNotes = togglePinNote(noteId);
    setNotes(sortNotesByRecent(updatedNotes));
  }, []);

  const handleRenameNote = useCallback((noteId: string, title: string) => {
    const updatedNotes = renameNote(noteId, title);
    setNotes(sortNotesByRecent(updatedNotes));
  }, []);

  const handleSaveCanvas = useCallback(
    (canvasState: string, zoom: number, panX: number, panY: number) => {
      if (!selectedNote) return;
      
      const updatedNote: Note = {
        ...selectedNote,
        canvasState,
        zoom,
        panX,
        panY,
      };
      
      const updatedNotes = saveNote(updatedNote);
      setNotes(sortNotesByRecent(updatedNotes));
    },
    [selectedNote]
  );

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
