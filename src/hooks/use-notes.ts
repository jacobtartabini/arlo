import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Note, NoteFolder, NoteElement } from "@/types/notes";

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch notes when user changes
  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching notes:", error);
      } else {
        const mappedNotes: Note[] = (data || []).map((n) => ({
          id: n.id,
          title: n.title,
          canvasState: n.canvas_state || "",
          elements: (n.elements as unknown as NoteElement[]) || [],
          tags: n.tags || [],
          pinned: n.pinned,
          createdAt: n.created_at,
          updatedAt: n.updated_at,
          zoom: n.zoom,
          panX: n.pan_x,
          panY: n.pan_y,
          folderId: n.folder_id ?? undefined,
        }));
        setNotes(mappedNotes);
      }
      setLoading(false);
    };

    fetchNotes();
  }, [userId]);

  // Fetch folders
  useEffect(() => {
    if (!userId) {
      setFolders([]);
      return;
    }

    const fetchFolders = async () => {
      const { data, error } = await supabase
        .from("note_folders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching folders:", error);
      } else {
        const mappedFolders: NoteFolder[] = (data || []).map((f) => ({
          id: f.id,
          name: f.name,
          color: f.color,
          createdAt: f.created_at,
        }));
        setFolders(mappedFolders);
      }
    };

    fetchFolders();
  }, [userId]);

  const createNote = useCallback(async (overrides: Partial<Note> = {}): Promise<Note | null> => {
    if (!userId) return null;

    const newNote = {
      user_id: userId,
      title: overrides.title || "Untitled Note",
      canvas_state: overrides.canvasState || "",
      elements: JSON.stringify(overrides.elements || []),
      tags: overrides.tags || [],
      pinned: overrides.pinned || false,
      zoom: overrides.zoom || 1,
      pan_x: overrides.panX || 0,
      pan_y: overrides.panY || 0,
      folder_id: overrides.folderId || null,
    };

    const { data, error } = await supabase
      .from("notes")
      .insert(newNote)
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      return null;
    }

    const mappedNote: Note = {
      id: data.id,
      title: data.title,
      canvasState: data.canvas_state || "",
      elements: (data.elements as unknown as NoteElement[]) || [],
      tags: data.tags || [],
      pinned: data.pinned,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      zoom: data.zoom,
      panX: data.pan_x,
      panY: data.pan_y,
      folderId: data.folder_id ?? undefined,
    };

    setNotes((prev) => [mappedNote, ...prev]);
    return mappedNote;
  }, [userId]);

  const saveNote = useCallback(async (note: Note): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase
      .from("notes")
      .update({
        title: note.title,
        canvas_state: note.canvasState,
        elements: JSON.stringify(note.elements),
        tags: note.tags,
        pinned: note.pinned,
        zoom: note.zoom,
        pan_x: note.panX,
        pan_y: note.panY,
        folder_id: note.folderId || null,
      })
      .eq("id", note.id);

    if (error) {
      console.error("Error saving note:", error);
      return;
    }

    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...note, updatedAt: new Date().toISOString() } : n))
    );
  }, [userId]);

  const deleteNote = useCallback(async (noteId: string): Promise<void> => {
    if (!userId) return;

    const { error } = await supabase.from("notes").delete().eq("id", noteId);

    if (error) {
      console.error("Error deleting note:", error);
      return;
    }

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, [userId]);

  const duplicateNote = useCallback(async (noteId: string): Promise<Note | null> => {
    const original = notes.find((n) => n.id === noteId);
    if (!original) return null;

    return createNote({
      ...original,
      title: `${original.title} (Copy)`,
      pinned: false,
    });
  }, [notes, createNote]);

  const togglePinNote = useCallback(async (noteId: string): Promise<void> => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    await saveNote({ ...note, pinned: !note.pinned });
  }, [notes, saveNote]);

  const renameNote = useCallback(async (noteId: string, title: string): Promise<void> => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    await saveNote({ ...note, title });
  }, [notes, saveNote]);

  const createFolder = useCallback(async (name: string, color = "#3b82f6"): Promise<NoteFolder | null> => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("note_folders")
      .insert({ user_id: userId, name, color })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      return null;
    }

    const mappedFolder: NoteFolder = {
      id: data.id,
      name: data.name,
      color: data.color,
      createdAt: data.created_at,
    };

    setFolders((prev) => [mappedFolder, ...prev]);
    return mappedFolder;
  }, [userId]);

  const searchNotes = useCallback((query: string): Note[] => {
    const lowerQuery = query.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(lowerQuery) ||
        note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  }, [notes]);

  return {
    notes,
    folders,
    loading,
    createNote,
    saveNote,
    deleteNote,
    duplicateNote,
    togglePinNote,
    renameNote,
    createFolder,
    searchNotes,
  };
}
