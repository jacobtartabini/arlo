import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Copy,
  FileText,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Note } from "@/types/notes";

interface NotesSidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onRenameNote: (noteId: string, title: string) => void;
}

export function NotesSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onDuplicateNote,
  onTogglePin,
  onRenameNote,
}: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingTitle(note.title);
  };

  const handleFinishEdit = (noteId: string) => {
    if (editingTitle.trim()) {
      onRenameNote(noteId, editingTitle.trim());
    }
    setEditingId(null);
    setEditingTitle("");
  };

  const renderNoteItem = (note: Note) => {
    const isSelected = note.id === selectedNoteId;
    const isEditing = editingId === note.id;

    return (
      <div
        key={note.id}
        className={cn(
          "group relative flex items-start gap-3 rounded-xl px-3 py-3 transition-colors cursor-pointer",
          isSelected
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/50 border border-transparent"
        )}
        onClick={() => !isEditing && onSelectNote(note.id)}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {isEditing ? (
            <Input
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onBlur={() => handleFinishEdit(note.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFinishEdit(note.id);
                if (e.key === "Escape") setEditingId(null);
              }}
              className="h-7 text-sm font-medium"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {format(new Date(note.updatedAt), "MMM d, h:mm a")}
          </p>
        </div>
        {note.pinned && (
          <Pin className="h-3 w-3 text-primary flex-shrink-0 mt-1" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity",
                isSelected && "opacity-100"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleStartEdit(note)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTogglePin(note.id)}>
              {note.pinned ? (
                <>
                  <PinOff className="mr-2 h-4 w-4" />
                  Unpin
                </>
              ) : (
                <>
                  <Pin className="mr-2 h-4 w-4" />
                  Pin to top
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicateNote(note.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDeleteNote(note.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex h-full w-72 flex-col border-r border-border/60 bg-card/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
        <h2 className="text-lg font-semibold text-foreground">Notes</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 rounded-lg"
          onClick={onCreateNote}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="h-9 pl-9 text-sm bg-muted/30"
          />
        </div>
      </div>

      {/* Notes list */}
      <ScrollArea className="flex-1 px-3">
        {pinnedNotes.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Pinned
            </p>
            <div className="space-y-1">
              {pinnedNotes.map(renderNoteItem)}
            </div>
          </div>
        )}

        {unpinnedNotes.length > 0 && (
          <div className="pb-4">
            {pinnedNotes.length > 0 && (
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                Recent
              </p>
            )}
            <div className="space-y-1">
              {unpinnedNotes.map(renderNoteItem)}
            </div>
          </div>
        )}

        {filteredNotes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "No notes found" : "No notes yet"}
            </p>
            {!searchQuery && (
              <Button
                variant="link"
                size="sm"
                onClick={onCreateNote}
                className="mt-2"
              >
                Create your first note
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
