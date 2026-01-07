import { useCallback, useEffect, useState } from 'react';
import { dataApiHelpers } from '@/lib/data-api';
import { useAuth } from '@/providers/AuthProvider';
import type { Note, NoteFolder, PageMode } from '@/types/notes';
import { toast } from 'sonner';

interface DbNote {
  id: string;
  user_id: string;
  title: string;
  note_type: string;
  canvas_state: string | null;
  elements: unknown;
  tags: string[] | null;
  folder_id: string | null;
  pinned: boolean;
  zoom: number;
  pan_x: number;
  pan_y: number;
  page_mode: string | null;
  created_at: string;
  updated_at: string;
}

interface DbNoteFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  parent_folder_id: string | null;
  created_at: string;
}

// Transform DB note to app Note type
const dbToNote = (dbNote: DbNote): Note => ({
  id: dbNote.id,
  title: dbNote.title,
  noteType: (dbNote.note_type as Note['noteType']) ?? 'canvas',
  canvasState: dbNote.canvas_state ?? '',
  elements: Array.isArray(dbNote.elements) ? dbNote.elements as Note['elements'] : [],
  tags: dbNote.tags ?? [],
  folderId: dbNote.folder_id ?? undefined,
  pinned: dbNote.pinned,
  zoom: dbNote.zoom,
  panX: dbNote.pan_x,
  panY: dbNote.pan_y,
  pageMode: (dbNote.page_mode as PageMode) ?? undefined,
  createdAt: dbNote.created_at,
  updatedAt: dbNote.updated_at,
});

// Transform app Note to DB format
const noteToDb = (note: Partial<Note> & { id?: string }) => ({
  title: note.title,
  note_type: note.noteType ?? 'canvas',
  canvas_state: note.canvasState,
  elements: JSON.parse(JSON.stringify(note.elements ?? [])),
  tags: note.tags ?? [],
  folder_id: note.folderId ?? null,
  pinned: note.pinned ?? false,
  zoom: note.zoom ?? 1,
  pan_x: note.panX ?? 0,
  pan_y: note.panY ?? 0,
  page_mode: note.pageMode ?? null,
});

// Transform DB folder to app NoteFolder type
const dbToFolder = (dbFolder: DbNoteFolder): NoteFolder => ({
  id: dbFolder.id,
  name: dbFolder.name,
  color: dbFolder.color,
  parentId: dbFolder.parent_folder_id ?? undefined,
  createdAt: dbFolder.created_at,
});

export function useNotesPersistence() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Fetch notes and folders - bypass isAuthenticated check to allow async token resolution
  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);

      const [notesResult, foldersResult] = await Promise.all([
        dataApiHelpers.select<DbNote[]>('notes', {
          order: { column: 'updated_at', ascending: false },
        }),
        dataApiHelpers.select<DbNoteFolder[]>('note_folders', {
          order: { column: 'created_at', ascending: false },
        }),
      ]);

      if (notesResult.error) {
        console.error('Error fetching notes:', notesResult.error);
        setNotes([]);
        setFolders([]);
      } else if (notesResult.data) {
        const transformedNotes = notesResult.data.map(dbToNote);
        // Sort: pinned first, then by updated_at
        const sorted = transformedNotes.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setNotes(sorted);
      }

      if (foldersResult.error) {
        console.error('Error fetching folders:', foldersResult.error);
      } else if (foldersResult.data) {
        setFolders(foldersResult.data.map(dbToFolder));
      }
    } catch (error) {
      console.error('Error in fetchNotes:', error);
      setNotes([]);
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Sort helper
  const sortNotes = (notesList: Note[]): Note[] => {
    return [...notesList].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  // Create a new note - bypass synchronous isAuthenticated check
  const createNote = useCallback(async (overrides: Partial<Note> = {}): Promise<Note | null> => {
    const newNote: Partial<Note> = {
      title: 'Untitled Note',
      noteType: 'canvas',
      canvasState: '',
      elements: [],
      tags: [],
      pinned: false,
      zoom: 1,
      panX: 0,
      panY: 0,
      ...overrides,
    };

    try {
      const dbData = noteToDb(newNote);
      const { data, error } = await dataApiHelpers.insert<DbNote>('notes', dbData);

      if (error || !data) {
        console.error('Error creating note:', error);
        toast.error('Failed to create note');
        return null;
      }

      const createdNote = dbToNote(data);
      setNotes(prev => sortNotes([createdNote, ...prev]));
      return createdNote;
    } catch (error) {
      console.error('Error in createNote:', error);
      toast.error('Failed to create note');
      return null;
    }
  }, []);

  // Save/update a note - bypass synchronous isAuthenticated check
  const saveNote = useCallback(async (note: Note): Promise<boolean> => {
    // Update local state with new updatedAt timestamp
    const updatedNote = { ...note, updatedAt: new Date().toISOString() };
    
    // Optimistic update
    setNotes(prev => sortNotes(prev.map(n => n.id === note.id ? updatedNote : n)));

    try {
      const dbData = noteToDb(updatedNote);
      const { error } = await dataApiHelpers.update('notes', note.id, dbData);

      if (error) {
        console.error('Error saving note:', error);
        // Revert on error
        await fetchNotes();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveNote:', error);
      await fetchNotes();
      return false;
    }
  }, [fetchNotes]);

  // Delete a note - bypass synchronous isAuthenticated check
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    // Optimistic update
    setNotes(prev => {
      const filtered = prev.filter(n => n.id !== noteId);
      return filtered;
    });

    try {
      const { error } = await dataApiHelpers.delete('notes', noteId);

      if (error) {
        console.error('Error deleting note:', error);
        await fetchNotes(); // Revert by refetching
        toast.error('Failed to delete note');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNote:', error);
      await fetchNotes();
      return false;
    }
  }, [fetchNotes]);

  // Duplicate a note - use functional state to get latest notes
  const duplicateNote = useCallback(async (noteId: string): Promise<Note | null> => {
    // Get the note from current state reactively
    let original: Note | undefined;
    setNotes(prev => {
      original = prev.find(n => n.id === noteId);
      return prev; // No change, just reading
    });
    
    if (!original) return null;

    return createNote({
      ...original,
      title: `${original.title} (Copy)`,
      pinned: false,
    });
  }, [createNote]);

  // Toggle pin - use functional state update pattern
  const togglePinNote = useCallback(async (noteId: string): Promise<boolean> => {
    let noteToUpdate: Note | undefined;
    
    setNotes(prev => {
      noteToUpdate = prev.find(n => n.id === noteId);
      return prev;
    });

    if (!noteToUpdate) return false;

    const updatedNote = { ...noteToUpdate, pinned: !noteToUpdate.pinned };
    return saveNote(updatedNote);
  }, [saveNote]);

  // Rename note - use functional state update pattern for reliable access
  const renameNote = useCallback(async (noteId: string, title: string): Promise<boolean> => {
    let noteToUpdate: Note | undefined;
    
    // Get fresh note reference from state
    setNotes(prev => {
      noteToUpdate = prev.find(n => n.id === noteId);
      return prev;
    });

    if (!noteToUpdate) {
      console.error('Note not found for rename:', noteId);
      return false;
    }

    const updatedNote = { ...noteToUpdate, title };
    return saveNote(updatedNote);
  }, [saveNote]);

  // Create folder - bypass synchronous isAuthenticated check
  const createFolder = useCallback(async (name: string, color: string = '#3b82f6', parentId?: string): Promise<NoteFolder | null> => {
    try {
      const { data, error } = await dataApiHelpers.insert<DbNoteFolder>('note_folders', { 
        name, 
        color,
        parent_folder_id: parentId ?? null,
      });

      if (error || !data) {
        console.error('Error creating folder:', error);
        toast.error('Failed to create folder');
        return null;
      }

      const newFolder = dbToFolder(data);
      setFolders(prev => [newFolder, ...prev]);
      return newFolder;
    } catch (error) {
      console.error('Error in createFolder:', error);
      return null;
    }
  }, []);

  // Delete folder - bypass synchronous isAuthenticated check
  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    try {
      // First, remove folder reference from notes
      await dataApiHelpers.updateWhere('notes', { folder_id: folderId }, { folder_id: null });

      const { error } = await dataApiHelpers.delete('note_folders', folderId);

      if (error) {
        console.error('Error deleting folder:', error);
        return false;
      }

      setFolders(prev => prev.filter(f => f.id !== folderId));
      setNotes(prev => prev.map(n => n.folderId === folderId ? { ...n, folderId: undefined } : n));
      return true;
    } catch (error) {
      console.error('Error in deleteFolder:', error);
      return false;
    }
  }, []);

  return {
    notes,
    folders,
    isLoading,
    isAuthenticated,
    createNote,
    saveNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    renameNote,
    createFolder,
    deleteFolder,
    refreshNotes: fetchNotes,
  };
}
