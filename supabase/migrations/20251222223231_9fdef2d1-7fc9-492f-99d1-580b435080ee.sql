-- Add note_type column to notes table
ALTER TABLE public.notes 
ADD COLUMN note_type TEXT NOT NULL DEFAULT 'canvas' 
CHECK (note_type IN ('canvas', 'page'));

-- Create index for faster queries by folder and type
CREATE INDEX idx_notes_folder_id ON public.notes(folder_id);
CREATE INDEX idx_notes_note_type ON public.notes(note_type);

-- Update existing notes to have 'canvas' type (already default, but explicit)
UPDATE public.notes SET note_type = 'canvas' WHERE note_type IS NULL;