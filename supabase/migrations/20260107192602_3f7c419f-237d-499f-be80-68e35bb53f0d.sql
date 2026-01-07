-- Add sort_order column to notes for custom ordering
ALTER TABLE public.notes
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Add sort_order column to note_folders for custom ordering
ALTER TABLE public.note_folders
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create indexes for efficient ordering
CREATE INDEX idx_notes_sort_order ON public.notes(sort_order);
CREATE INDEX idx_note_folders_sort_order ON public.note_folders(sort_order);