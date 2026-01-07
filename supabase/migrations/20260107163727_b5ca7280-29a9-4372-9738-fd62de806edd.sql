-- Add parent_folder_id column to note_folders for subfolder support
ALTER TABLE public.note_folders
ADD COLUMN parent_folder_id UUID REFERENCES public.note_folders(id) ON DELETE SET NULL;

-- Create index for faster parent lookups
CREATE INDEX idx_note_folders_parent_folder_id ON public.note_folders(parent_folder_id);