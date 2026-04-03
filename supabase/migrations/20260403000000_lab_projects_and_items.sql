-- Lab workspace: project metadata + items (notes, design, code, etc.)

ALTER TABLE public.creation_projects
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE public.creation_projects
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'in_progress';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'creation_projects_status_check'
  ) THEN
    ALTER TABLE public.creation_projects
      ADD CONSTRAINT creation_projects_status_check
      CHECK (status IN ('idea', 'in_progress', 'done'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lab_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('note', 'design', 'code', 'automation', 'media', 'file')),
  title TEXT NOT NULL DEFAULT 'Untitled',
  body TEXT,
  file_path TEXT,
  original_filename TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lab_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lab items in their projects" ON public.lab_items;
DROP POLICY IF EXISTS "Users can insert lab items in their projects" ON public.lab_items;
DROP POLICY IF EXISTS "Users can update lab items in their projects" ON public.lab_items;
DROP POLICY IF EXISTS "Users can delete lab items in their projects" ON public.lab_items;

CREATE POLICY "Users can view lab items in their projects"
ON public.lab_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.creation_projects p
  WHERE p.id = lab_items.project_id AND p.user_id = auth.uid()::text
));

CREATE POLICY "Users can insert lab items in their projects"
ON public.lab_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.creation_projects p
  WHERE p.id = lab_items.project_id AND p.user_id = auth.uid()::text
));

CREATE POLICY "Users can update lab items in their projects"
ON public.lab_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.creation_projects p
  WHERE p.id = lab_items.project_id AND p.user_id = auth.uid()::text
));

CREATE POLICY "Users can delete lab items in their projects"
ON public.lab_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.creation_projects p
  WHERE p.id = lab_items.project_id AND p.user_id = auth.uid()::text
));

DROP TRIGGER IF EXISTS update_lab_items_updated_at ON public.lab_items;
CREATE TRIGGER update_lab_items_updated_at
BEFORE UPDATE ON public.lab_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
