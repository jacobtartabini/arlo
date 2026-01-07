import { useState, useCallback, DragEvent, useMemo } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  FolderOpen,
  FolderPlus,
  GripVertical,
  MoreHorizontal,
  PenLine,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { Note, NoteFolder } from "@/types/notes";

interface NotesSidebarProps {
  notes: Note[];
  folders: NoteFolder[];
  selectedNoteId: string | null;
  selectedFolderId: string | null;
  onSelectNote: (noteId: string) => void;
  onSelectFolder: (folderId: string | null) => void;
  onCreateNote: () => void;
  onCreateFolder: (parentId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onDuplicateNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onRenameNote: (noteId: string, title: string) => void;
  onMoveToFolder: (noteId: string, folderId: string | null) => void;
  onDeleteFolder: (folderId: string) => void;
}

export function NotesSidebar({
  notes,
  folders,
  selectedNoteId,
  selectedFolderId,
  onSelectNote,
  onSelectFolder,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onDuplicateNote,
  onTogglePin,
  onRenameNote,
  onMoveToFolder,
  onDeleteFolder,
}: NotesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | "none">(null);

  // Organize folders into a tree structure
  const { rootFolders, subfolderMap } = useMemo(() => {
    const subMap = new Map<string, NoteFolder[]>();
    const roots: NoteFolder[] = [];
    
    folders.forEach(folder => {
      if (folder.parentId) {
        const existing = subMap.get(folder.parentId) || [];
        subMap.set(folder.parentId, [...existing, folder]);
      } else {
        roots.push(folder);
      }
    });
    
    return { rootFolders: roots, subfolderMap: subMap };
  }, [folders]);

  // Get all folder IDs including children for a parent folder
  const getAllChildFolderIds = useCallback((folderId: string): string[] => {
    const children = subfolderMap.get(folderId) || [];
    const allIds: string[] = [folderId];
    children.forEach(child => {
      allIds.push(...getAllChildFolderIds(child.id));
    });
    return allIds;
  }, [subfolderMap]);

  // Filter notes based on search and selected folder (including subfolders)
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (selectedFolderId === null) {
        return matchesSearch;
      }
      
      // Check if note is in selected folder or any of its subfolders
      const relevantFolderIds = getAllChildFolderIds(selectedFolderId);
      const matchesFolder = note.folderId && relevantFolderIds.includes(note.folderId);
      
      return matchesSearch && matchesFolder;
    });
  }, [notes, searchQuery, selectedFolderId, getAllChildFolderIds]);

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

  const getNoteIcon = (note: Note) => {
    return note.noteType === "page" ? (
      <FileText className="h-4 w-4" />
    ) : (
      <PenLine className="h-4 w-4" />
    );
  };

  const toggleFolderExpanded = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Drag and drop handlers
  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, noteId: string) => {
    setDraggedNoteId(noteId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", noteId);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    setDraggedNoteId(null);
    setDragOverFolderId(null);
    if (e.currentTarget) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>, folderId: string | null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId === null ? "none" : folderId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLButtonElement>, folderId: string | null) => {
    e.preventDefault();
    const noteId = e.dataTransfer.getData("text/plain");
    if (noteId && draggedNoteId) {
      onMoveToFolder(noteId, folderId);
    }
    setDraggedNoteId(null);
    setDragOverFolderId(null);
  }, [draggedNoteId, onMoveToFolder]);

  // Get folder path for display
  const getFolderPath = useCallback((folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return "";
    
    if (folder.parentId) {
      const parent = folders.find(f => f.id === folder.parentId);
      if (parent) {
        return `${parent.name} / ${folder.name}`;
      }
    }
    return folder.name;
  }, [folders]);

  const renderFolderItem = (folder: NoteFolder, depth: number = 0) => {
    const count = notes.filter(n => n.folderId === folder.id).length;
    const isDragOver = dragOverFolderId === folder.id;
    const subfolders = subfolderMap.get(folder.id) || [];
    const hasSubfolders = subfolders.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;

    return (
      <div key={folder.id}>
        <div className="group flex items-center">
          {hasSubfolders ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolderExpanded(folder.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          <button
            onClick={() => onSelectFolder(folder.id)}
            onDragOver={(e) => handleDragOver(e, folder.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, folder.id)}
            className={cn(
              "flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all",
              isSelected
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              isDragOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <span 
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="truncate">{folder.name}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {count}
            </span>
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {!folder.parentId && (
                <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add Subfolder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDeleteFolder(folder.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {hasSubfolders && isExpanded && (
          <div className="ml-2">
            {subfolders.map(subfolder => renderFolderItem(subfolder, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNoteItem = (note: Note) => {
    const isSelected = note.id === selectedNoteId;
    const isEditing = editingId === note.id;
    const isDragging = draggedNoteId === note.id;
    const folderPath = note.folderId ? getFolderPath(note.folderId) : null;
    const noteFolder = note.folderId ? folders.find(f => f.id === note.folderId) : null;

    return (
      <div
        key={note.id}
        draggable={!isEditing}
        onDragStart={(e) => handleDragStart(e, note.id)}
        onDragEnd={handleDragEnd}
        className={cn(
          "group relative flex items-start gap-2 rounded-xl px-3 py-3 transition-all cursor-pointer",
          isSelected
            ? "bg-primary/10 border border-primary/20"
            : "hover:bg-muted/50 border border-transparent",
          isDragging && "opacity-50 scale-[0.98]"
        )}
        onClick={() => !isEditing && onSelectNote(note.id)}
      >
        {/* Drag handle */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing pt-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground",
          note.noteType === "canvas" ? "bg-violet-500/10 text-violet-500" : "bg-blue-500/10 text-blue-500"
        )}>
          {getNoteIcon(note)}
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
            <>
              <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {note.noteType}
                </span>
                {folderPath && !selectedFolderId && noteFolder && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span 
                      className="text-[10px] font-medium truncate max-w-[100px]"
                      style={{ color: noteFolder.color }}
                      title={folderPath}
                    >
                      {folderPath}
                    </span>
                  </>
                )}
              </div>
            </>
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
            {folders.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onMoveToFolder(note.id, null)}>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Remove from folder
                </DropdownMenuItem>
                {rootFolders.map(folder => {
                  const subs = subfolderMap.get(folder.id) || [];
                  if (subs.length > 0) {
                    return (
                      <DropdownMenuSub key={folder.id}>
                        <DropdownMenuSubTrigger>
                          <span 
                            className="mr-2 h-3 w-3 rounded-full inline-block"
                            style={{ backgroundColor: folder.color }}
                          />
                          {folder.name}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => onMoveToFolder(note.id, folder.id)}>
                            Move to {folder.name}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {subs.map(sub => (
                            <DropdownMenuItem 
                              key={sub.id}
                              onClick={() => onMoveToFolder(note.id, sub.id)}
                            >
                              <span 
                                className="mr-2 h-2.5 w-2.5 rounded-full inline-block"
                                style={{ backgroundColor: sub.color }}
                              />
                              {sub.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  }
                  return (
                    <DropdownMenuItem 
                      key={folder.id}
                      onClick={() => onMoveToFolder(note.id, folder.id)}
                    >
                      <span 
                        className="mr-2 h-3 w-3 rounded-full inline-block"
                        style={{ backgroundColor: folder.color }}
                      />
                      Move to {folder.name}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
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
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={() => onCreateFolder()}
            title="New folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg"
            onClick={onCreateNote}
            title="New note"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Folders section */}
      {folders.length > 0 && (
        <div className="px-3 pb-2">
          <Collapsible open={foldersExpanded} onOpenChange={setFoldersExpanded}>
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70 hover:text-muted-foreground">
              <span>Folders</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", foldersExpanded && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1">
              <div className="flex items-center">
                <div className="w-6" />
                <button
                  onClick={() => onSelectFolder(null)}
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, null)}
                  className={cn(
                    "flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-all",
                    selectedFolderId === null
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    dragOverFolderId === "none" && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <FolderOpen className="h-4 w-4" />
                  All Notes
                  <span className="ml-auto text-xs text-muted-foreground">
                    {notes.length}
                  </span>
                </button>
              </div>
              {rootFolders.map(folder => renderFolderItem(folder))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

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
              {searchQuery ? "No notes found" : selectedFolderId ? "No notes in this folder" : "No notes yet"}
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
