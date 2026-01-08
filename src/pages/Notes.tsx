"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PanelLeft, LogIn, Loader2, Download, Share2 } from "lucide-react";
import { NotesSidebar } from "@/components/notes/NotesSidebar";
import { NoteCanvas } from "@/components/notes/NoteCanvas";
import { PageNoteEditor } from "@/components/notes/PageNoteEditor";
import { CreateNoteDialog } from "@/components/notes/CreateNoteDialog";
import { CreateFolderDialog } from "@/components/notes/CreateFolderDialog";
import { MobilePageLayout, MobileNotesView } from "@/components/mobile";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Note, NoteType, PageMode } from "@/types/notes";
import { useNotesPersistence } from "@/hooks/useNotesPersistence";
import { toast } from "sonner";
import { generatePdfFromElement, downloadBlob, sharePdf } from "@/lib/notes-pdf";

// Handle PDF file import from share target
async function handleSharedFile(): Promise<File | null> {
  // Check if there's a shared file (from PWA share target)
  if ('launchQueue' in window) {
    return new Promise((resolve) => {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files && launchParams.files.length > 0) {
          const fileHandle = launchParams.files[0];
          const file = await fileHandle.getFile();
          resolve(file);
        } else {
          resolve(null);
        }
      });
      // If no file after a short delay, resolve null
      setTimeout(() => resolve(null), 100);
    });
  }
  return null;
}

export default function Notes() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>();
  const [isExporting, setIsExporting] = useState(false);
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
    reorderNotes,
    reorderFolders,
  } = useNotesPersistence();

  // Set page title
  useEffect(() => {
    document.title = "Arlo";
  }, []);

  // Handle opening a specific note or action from navigation state
  useEffect(() => {
    const state = location.state as { openNoteId?: string; action?: string } | null;
    if (state?.openNoteId) {
      setSelectedNoteId(state.openNoteId);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
    
    // Handle quick actions from dashboard
    if (state?.action && isAuthenticated && !isLoading) {
      const handleAction = async () => {
        switch (state.action) {
          case "new":
            setCreateDialogOpen(true);
            break;
          case "upload":
            // For upload, open the create dialog (user can import)
            setCreateDialogOpen(true);
            break;
          case "write":
            // Create a new page note in write mode directly
            const newNote = await createNote({
              noteType: 'page',
              pageMode: 'write',
            });
            if (newNote) {
              setSelectedNoteId(newNote.id);
              toast.success("New handwritten note created");
            }
            break;
        }
        // Clear the state
        window.history.replaceState({}, document.title);
      };
      handleAction();
    }
  }, [location.state, isAuthenticated, isLoading, createNote]);

  // Auto-select first note when notes load (or most recently edited)
  useEffect(() => {
    if (!isLoading && notes.length > 0 && !selectedNoteId) {
      // Select the most recently updated note
      const mostRecent = [...notes].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0];
      setSelectedNoteId(mostRecent.id);
    }
  }, [isLoading, notes, selectedNoteId]);

  // Handle shared PDF files (from PWA share target)
  useEffect(() => {
    const checkForSharedFile = async () => {
      const file = await handleSharedFile();
      if (file && file.type === 'application/pdf') {
        // Create a new page note in write mode for PDF annotation
        const newNote = await createNote({
          noteType: 'page',
          pageMode: 'write',
          title: file.name.replace('.pdf', ''),
        });
        if (newNote) {
          setSelectedNoteId(newNote.id);
          toast.success(`Imported ${file.name} - Ready for annotation`);
        }
      }
    };
    
    if (isAuthenticated && !isLoading) {
      checkForSharedFile();
    }
  }, [isAuthenticated, isLoading, createNote]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleOpenCreateDialog = useCallback(() => {
    setCreateDialogOpen(true);
  }, []);

  const handleCreateNote = useCallback(async (noteType: NoteType, folderId?: string, pageMode?: PageMode) => {
    const newNote = await createNote({ noteType, folderId, pageMode });
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

  const handleOpenCreateFolderDialog = useCallback((parentId?: string) => {
    setCreateFolderParentId(parentId);
    setCreateFolderDialogOpen(true);
  }, []);

  const handleCreateFolder = useCallback(async (name: string, color: string, parentId?: string) => {
    const folder = await createFolder(name, color, parentId);
    if (folder) {
      toast.success(`Folder "${folder.name}" created`);
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

  // Generate PDF from current note content
  const generateNotePdf = useCallback(async (): Promise<Blob | null> => {
    if (!selectedNote) return null;

    // Wait a tick for React to settle
    await new Promise(resolve => setTimeout(resolve, 50));

    // Find the page content element by data attribute (works globally)
    const pageContainer = document.querySelector('[data-note-content="true"]') as HTMLElement;
    if (!pageContainer) {
      console.error('Could not find note content element [data-note-content="true"]');
      return null;
    }

    try {
      const blob = await generatePdfFromElement(pageContainer, {
        title: selectedNote.title,
        format: 'a4',
        orientation: 'portrait',
      });
      return blob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error; // Re-throw to let caller handle
    }
  }, [selectedNote]);

  // Export note as PDF - direct download
  const handleExportPdf = useCallback(async () => {
    if (!selectedNote) return;
    
    setIsExporting(true);
    try {
      const blob = await generateNotePdf();
      if (blob) {
        const filename = `${selectedNote.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        downloadBlob(blob, filename);
        toast.success("PDF exported successfully");
      } else {
        // Fallback to print
        window.print();
        toast.success("Use 'Save as PDF' in the print dialog");
      }
    } catch (error) {
      console.error('Export error:', error);
      // Fallback to print
      window.print();
      toast.success("Use 'Save as PDF' in the print dialog");
    } finally {
      setIsExporting(false);
    }
  }, [selectedNote, generateNotePdf]);

  // Native share - share as PDF file
  const handleShare = useCallback(async () => {
    if (!selectedNote) return;
    
    setIsExporting(true);
    try {
      const blob = await generateNotePdf();
      if (blob) {
        const shared = await sharePdf(blob, selectedNote.title);
        if (shared) {
          toast.success("Note shared as PDF");
        }
      } else {
        // Fallback: download via print dialog
        toast.info("Opening print dialog - select 'Save as PDF'");
        window.print();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        // Fallback: download via print dialog
        toast.info("Opening print dialog - select 'Save as PDF'");
        window.print();
      }
    } finally {
      setIsExporting(false);
    }
  }, [selectedNote, generateNotePdf]);

  // Loading state
  // Mobile view
  if (isMobile) {
    return (
      <MobilePageLayout title="Notes">
        <MobileNotesView />
      </MobilePageLayout>
    );
  }

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

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-4">
          <LogIn className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Tailscale login required</h2>
          <p className="text-muted-foreground">
            Please connect via Tailscale to access your notes.
          </p>
          <Button onClick={() => navigate("/login")}>
            Connect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background print:bg-white">
      {/* Back to dashboard - above everything */}
      <div className="px-4 py-2 print:hidden">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium transition hover:border-border hover:bg-background/80"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
      {/* Sidebar - hidden in print */}
      {sidebarOpen && (
        <div className="print:hidden">
          <NotesSidebar
            notes={notes}
            folders={folders}
            selectedNoteId={selectedNoteId}
            selectedFolderId={selectedFolderId}
            onSelectNote={setSelectedNoteId}
            onSelectFolder={setSelectedFolderId}
            onCreateNote={handleOpenCreateDialog}
            onCreateFolder={handleOpenCreateFolderDialog}
            onDeleteNote={handleDeleteNote}
            onDuplicateNote={handleDuplicateNote}
            onTogglePin={handleTogglePin}
            onRenameNote={handleRenameNote}
            onMoveToFolder={handleMoveToFolder}
            onDeleteFolder={handleDeleteFolder}
            onReorderNotes={reorderNotes}
            onReorderFolders={reorderFolders}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header - hidden in print */}
        <header className="flex items-center justify-between border-b border-border/40 bg-card/30 px-4 py-3 backdrop-blur-sm print:hidden">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-sm font-semibold text-foreground">Notes</h1>
          </div>
          
          {selectedNote && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                {selectedNote.noteType === "page" && selectedNote.pageMode 
                  ? `${selectedNote.pageMode} mode`
                  : selectedNote.noteType}
              </span>
              <h1 className="text-sm font-medium text-foreground truncate max-w-[300px]">
                {selectedNote.title}
              </h1>
            </div>
          )}
          
          <div className="flex items-center gap-1">
            {selectedNote && (
              <>
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
          </div>
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
      </div>

      {/* Create Note Dialog */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateNote={handleCreateNote}
        folders={folders}
        defaultFolderId={selectedFolderId ?? undefined}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createFolderDialogOpen}
        onOpenChange={setCreateFolderDialogOpen}
        onCreateFolder={handleCreateFolder}
        folders={folders}
        defaultParentId={createFolderParentId}
      />
    </div>
  );
}
