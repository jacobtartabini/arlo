import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { FileText, PenLine, Check } from "lucide-react";
import type { NoteType, NoteFolder } from "@/types/notes";

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
    description: "Structured pages for writing and organized content",
  },
];

interface CreateNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateNote: (type: NoteType, folderId?: string) => void;
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
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(defaultFolderId);

  const handleCreate = () => {
    onCreateNote(selectedType, selectedFolderId);
    onOpenChange(false);
    // Reset for next time
    setSelectedType("canvas");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
