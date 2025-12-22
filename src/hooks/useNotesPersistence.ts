import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Note, NoteFolder } from '@/types/notes';
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
  created_at: string;
  updated_at: string;
}

interface DbNoteFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
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
});

// Transform DB folder to app NoteFolder type
const dbToFolder = (dbFolder: DbNoteFolder): NoteFolder => ({
  id: dbFolder.id,
  name: dbFolder.name,
  color: dbFolder.color,
  createdAt: dbFolder.created_at,
});

export function useNotesPersistence() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for authenticated user
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch notes and folders when userId changes
  const fetchNotes = useCallback(async () => {
    if (!userId) {
      setNotes([]);
      setFolders([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const [notesResult, foldersResult] = await Promise.all([
        supabase
          .from('notes')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('note_folders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (notesResult.error) {
        console.error('Error fetching notes:', notesResult.error);
      } else {
        const transformedNotes = (notesResult.data ?? []).map(dbToNote);
        // Sort: pinned first, then by updated_at
        const sorted = transformedNotes.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        setNotes(sorted);
      }

      if (foldersResult.error) {
        console.error('Error fetching folders:', foldersResult.error);
      } else {
        setFolders((foldersResult.data ?? []).map(dbToFolder));
      }
    } catch (error) {
      console.error('Error in fetchNotes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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

  // Create a new note
  const createNote = useCallback(async (overrides: Partial<Note> = {}): Promise<Note | null> => {
    if (!userId) {
      toast.error('Please log in to create notes');
      return null;
    }

    const now = new Date().toISOString();
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
      const { data, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: dbData.title,
          note_type: dbData.note_type,
          canvas_state: dbData.canvas_state,
          elements: dbData.elements,
          tags: dbData.tags,
          folder_id: dbData.folder_id,
          pinned: dbData.pinned,
          zoom: dbData.zoom,
          pan_x: dbData.pan_x,
          pan_y: dbData.pan_y,
        } as any)
        .select()
        .single();

      if (error) {
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
  }, [userId]);

  // Save/update a note
  const saveNote = useCallback(async (note: Note): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic update
    setNotes(prev => sortNotes(prev.map(n => n.id === note.id ? note : n)));

    try {
      const dbData = noteToDb(note);
      const { error } = await supabase
        .from('notes')
        .update({
          title: dbData.title,
          note_type: dbData.note_type,
          canvas_state: dbData.canvas_state,
          elements: dbData.elements,
          tags: dbData.tags,
          folder_id: dbData.folder_id,
          pinned: dbData.pinned,
          zoom: dbData.zoom,
          pan_x: dbData.pan_x,
          pan_y: dbData.pan_y,
        } as any)
        .eq('id', note.id)
        .eq('user_id', userId);

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
  }, [userId, fetchNotes]);

  // Delete a note
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    if (!userId) return false;

    // Optimistic update
    const previousNotes = notes;
    setNotes(prev => prev.filter(n => n.id !== noteId));

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting note:', error);
        setNotes(previousNotes);
        toast.error('Failed to delete note');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNote:', error);
      setNotes(previousNotes);
      return false;
    }
  }, [userId, notes]);

  // Duplicate a note
  const duplicateNote = useCallback(async (noteId: string): Promise<Note | null> => {
    const original = notes.find(n => n.id === noteId);
    if (!original || !userId) return null;

    return createNote({
      ...original,
      title: `${original.title} (Copy)`,
      pinned: false,
    });
  }, [notes, userId, createNote]);

  // Toggle pin
  const togglePinNote = useCallback(async (noteId: string): Promise<boolean> => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !userId) return false;

    const updatedNote = { ...note, pinned: !note.pinned };
    return saveNote(updatedNote);
  }, [notes, userId, saveNote]);

  // Rename note
  const renameNote = useCallback(async (noteId: string, title: string): Promise<boolean> => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !userId) return false;

    const updatedNote = { ...note, title };
    return saveNote(updatedNote);
  }, [notes, userId, saveNote]);

  // Create folder
  const createFolder = useCallback(async (name: string, color: string = '#3b82f6'): Promise<NoteFolder | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('note_folders')
        .insert({
          user_id: userId,
          name,
          color,
        })
        .select()
        .single();

      if (error) {
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
  }, [userId]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      // First, remove folder reference from notes
      await supabase
        .from('notes')
        .update({ folder_id: null })
        .eq('folder_id', folderId)
        .eq('user_id', userId);

      const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);

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
  }, [userId]);

  return {
    notes,
    folders,
    isLoading,
    isAuthenticated: !!userId,
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
