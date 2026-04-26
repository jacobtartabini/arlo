CREATE TABLE IF NOT EXISTS public.lab_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('note','design','code','automation','media','file')),
  title text NOT NULL DEFAULT 'Untitled',
  body text,
  file_path text,
  original_filename text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lab_items_project_id_idx ON public.lab_items(project_id);
CREATE INDEX IF NOT EXISTS lab_items_updated_at_idx ON public.lab_items(updated_at DESC);

ALTER TABLE public.lab_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lab items"
  ON public.lab_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.creation_projects p
    WHERE p.id = lab_items.project_id AND p.user_id = (auth.uid())::text
  ));

CREATE POLICY "Users can create lab items in their projects"
  ON public.lab_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.creation_projects p
    WHERE p.id = lab_items.project_id AND p.user_id = (auth.uid())::text
  ));

CREATE POLICY "Users can update their own lab items"
  ON public.lab_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creation_projects p
    WHERE p.id = lab_items.project_id AND p.user_id = (auth.uid())::text
  ));

CREATE POLICY "Users can delete their own lab items"
  ON public.lab_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.creation_projects p
    WHERE p.id = lab_items.project_id AND p.user_id = (auth.uid())::text
  ));

CREATE TRIGGER update_lab_items_updated_at
  BEFORE UPDATE ON public.lab_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();