import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StickyNote, Plus, Search, FolderOpen, ChevronRight, FileText, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Note, NoteFolder } from "@/types/notes";

export function MobileNotesView() {
  const navigate = useNavigate();
  const { notes, folders, isLoading, createNote } = useNotesPersistence();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentNotes = [...filteredNotes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 20);

  const handleCreateNote = async (type: 'page' | 'canvas', mode?: 'type' | 'write') => {
    const newNote = await createNote({
      noteType: type,
      pageMode: mode,
    });
    if (newNote) {
      navigate("/notes", { state: { openNoteId: newNote.id } });
    }
    setShowCreateMenu(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-12 bg-muted rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 text-[15px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Quick create buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleCreateNote('page', 'type')}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-4",
            "rounded-xl bg-gradient-to-b from-blue-500/10 to-blue-500/5",
            "border border-blue-500/20",
            "transition-all active:scale-95"
          )}
        >
          <FileText className="h-6 w-6 text-blue-500" />
          <span className="text-sm font-medium text-foreground">New Note</span>
        </button>
        <button
          onClick={() => handleCreateNote('page', 'write')}
          className={cn(
            "flex flex-col items-center justify-center gap-2 p-4",
            "rounded-xl bg-gradient-to-b from-violet-500/10 to-violet-500/5",
            "border border-violet-500/20",
            "transition-all active:scale-95"
          )}
        >
          <PenTool className="h-6 w-6 text-violet-500" />
          <span className="text-sm font-medium text-foreground">Handwrite</span>
        </button>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground px-1">Folders</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => navigate("/notes", { state: { folderId: folder.id } })}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl",
                  "bg-card border border-border/50",
                  "whitespace-nowrap flex-shrink-0",
                  "transition-all active:scale-95"
                )}
              >
                <FolderOpen className="h-4 w-4" style={{ color: folder.color }} />
                <span className="text-sm font-medium">{folder.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent notes */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground px-1">Recent</h3>
        <div className="space-y-2">
          {recentNotes.map((note, index) => (
            <motion.button
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => navigate("/notes", { state: { openNoteId: note.id } })}
              className={cn(
                "flex items-center gap-3 w-full p-4 rounded-xl text-left",
                "bg-card border border-border/50",
                "transition-all active:scale-[0.98]"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                note.noteType === 'page' 
                  ? "bg-blue-500/10" 
                  : "bg-amber-500/10"
              )}>
                {note.noteType === 'page' ? (
                  <FileText className="h-5 w-5 text-blue-500" />
                ) : (
                  <StickyNote className="h-5 w-5 text-amber-500" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-foreground truncate">
                  {note.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(note.updatedAt), "MMM d, h:mm a")}
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-muted-foreground/30 flex-shrink-0" />
            </motion.button>
          ))}

          {recentNotes.length === 0 && (
            <div className="text-center py-12">
              <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No notes yet</p>
              <button
                onClick={() => handleCreateNote('page', 'type')}
                className="mt-3 text-sm font-medium text-primary"
              >
                Create your first note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
