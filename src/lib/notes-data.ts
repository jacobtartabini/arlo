import type { Note, NoteFolder, NoteId, NoteType } from "@/types/notes";

export const NOTES_STORAGE_KEY = "arlo-smart-notes";
export const FOLDERS_STORAGE_KEY = "arlo-notes-folders";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createNote(overrides: Partial<Note> = {}): Note {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: "Untitled Note",
    noteType: "canvas",
    canvasState: "",
    elements: [],
    tags: [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
    zoom: 1,
    panX: 0,
    panY: 0,
    pageMode: "type",
    backgroundStyle: "lined",
    ...overrides,
  };
}

export function createFolder(name: string, color = "#3b82f6"): NoteFolder {
  return {
    id: generateId(),
    name,
    color,
    createdAt: new Date().toISOString(),
  };
}

// Storage utilities
export function getStoredNotes(): Note[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(NOTES_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as Note[];
  } catch {
    console.error("Failed to parse stored notes");
    return [];
  }
}

export function setStoredNotes(notes: Note[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

export function getStoredFolders(): NoteFolder[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(FOLDERS_STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as NoteFolder[];
  } catch {
    console.error("Failed to parse stored folders");
    return [];
  }
}

export function setStoredFolders(folders: NoteFolder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
}

// Note operations
export function saveNote(note: Note): Note[] {
  const notes = getStoredNotes();
  const existingIndex = notes.findIndex((n) => n.id === note.id);
  const updatedNote = { ...note, updatedAt: new Date().toISOString() };
  
  if (existingIndex >= 0) {
    notes[existingIndex] = updatedNote;
  } else {
    notes.unshift(updatedNote);
  }
  
  setStoredNotes(notes);
  return notes;
}

export function deleteNote(noteId: NoteId): Note[] {
  const notes = getStoredNotes().filter((n) => n.id !== noteId);
  setStoredNotes(notes);
  return notes;
}

export function duplicateNote(noteId: NoteId): Note[] {
  const notes = getStoredNotes();
  const original = notes.find((n) => n.id === noteId);
  if (!original) return notes;
  
  const duplicate = createNote({
    ...original,
    id: generateId(),
    title: `${original.title} (Copy)`,
    pinned: false,
  });
  
  notes.unshift(duplicate);
  setStoredNotes(notes);
  return notes;
}

export function togglePinNote(noteId: NoteId): Note[] {
  const notes = getStoredNotes();
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.pinned = !note.pinned;
    note.updatedAt = new Date().toISOString();
    setStoredNotes(notes);
  }
  return notes;
}

export function renameNote(noteId: NoteId, title: string): Note[] {
  const notes = getStoredNotes();
  const note = notes.find((n) => n.id === noteId);
  if (note) {
    note.title = title;
    note.updatedAt = new Date().toISOString();
    setStoredNotes(notes);
  }
  return notes;
}

// Search
export function searchNotes(query: string): Note[] {
  const notes = getStoredNotes();
  const lowerQuery = query.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Sort helpers
export function sortNotesByRecent(notes: Note[]): Note[] {
  const pinned = notes.filter((n) => n.pinned).sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const unpinned = notes.filter((n) => !n.pinned).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  return [...pinned, ...unpinned];
}
