import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileText, PenLine, Check, Type, Pencil, Lock } from "lucide-react";
import type { NoteType, NoteFolder, PageMode } from "@/types/notes";

interface NoteTypeOption {
  type: NoteType;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const noteTypes: NoteTypeOption[] = [
  {
    type: "canvas",
    icon: <PenLine className="h-6 w-6" />,
    title: "Canvas Note",
    description: "Infinite canvas for drawing, sketching, and freeform ideas",
  },
  {
    type: "page",
    icon: <FileText className="h-6 w-6" />,
    title: "Page Note",
    description: "Document-style pages with structured content",
  },
];

interface PageModeOption {
  mode: PageMode;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const pageModes: PageModeOption[] = [
  {
    mode: "type",
    icon: <Type className="h-5 w-5" />,
    title: "Type",
    description: "Rich text editing with keyboard",
  },
  {
    mode: "write",
    icon: <Pencil className="h-5 w-5" />,
    title: "Write",
    description: "Handwriting with Apple Pencil",
  },
];

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNote: (type: NoteType, folderId?: string, pageMode?: PageMode) => void;
  folders: NoteFolder[];
  defaultFolderId?: string;
}

export function CreateNoteDialog({
  open,
  onOpenChange,
  onCreateNote,
  folders,
  defaultFolderId,
}: CreateNoteDialogProps) {
  const [selectedType, setSelectedType] = useState<NoteType>("canvas");
  const [selectedPageMode, setSelectedPageMode] = useState<PageMode>("type");
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(defaultFolderId);

  // Reset page mode when switching to canvas
  useEffect(() => {
    if (selectedType === "canvas") {
      setSelectedPageMode("type");
    }
  }, [selectedType]);

  const handleCreate = () => {
    // For page notes, pass the locked pageMode
    const pageMode = selectedType === "page" ? selectedPageMode : undefined;
    onCreateNote(selectedType, selectedFolderId, pageMode);
    onOpenChange(false);
    // Reset for next time
    setSelectedType("canvas");
    setSelectedPageMode("type");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
          <DialogDescription>
            Choose a note type to get started
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {noteTypes.map((option) => (
            <button
              key={option.type}
              onClick={() => setSelectedType(option.type)}
              className={cn(
                "group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all",
                selectedType === option.type
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-border/80 hover:bg-muted/30"
              )}
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                  selectedType === option.type
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground group-hover:text-foreground"
                )}
              >
                {option.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{option.title}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              {selectedType === option.type && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Page Mode Selection - ONLY for Page notes, LOCKED after creation */}
        {selectedType === "page" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">Choose Page Mode</p>
              <div className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Lock className="h-2.5 w-2.5" />
                Locked after creation
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {pageModes.map((option) => (
                <button
                  key={option.mode}
                  onClick={() => setSelectedPageMode(option.mode)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                    selectedPageMode === option.mode
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      selectedPageMode === option.mode
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-foreground text-sm">{option.title}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {selectedPageMode === "write" 
                ? "Best with Apple Pencil. Finger touch disabled for palm rejection."
                : "Full rich text editing with formatting tools."}
            </p>
          </div>
        )}

        {folders.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Save to folder (optional)</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedFolderId(undefined)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  !selectedFolderId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All Notes
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    selectedFolderId === folder.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: folder.color }}
                  />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>
            Create Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
