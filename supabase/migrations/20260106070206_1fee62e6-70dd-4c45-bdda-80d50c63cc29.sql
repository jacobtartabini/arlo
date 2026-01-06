-- Add pageMode column to notes table to lock Write/Type selection
-- This column stores the locked mode for Page notes (null for canvas notes)
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS page_mode TEXT DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.notes.page_mode IS 'Locked page mode for Page-type notes: write or type. Once set, cannot be changed.';