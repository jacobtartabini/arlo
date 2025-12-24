-- Create storage bucket for STL files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('creation-assets', 'creation-assets', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for creation assets
CREATE POLICY "Users can upload their own creation assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'creation-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own creation assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'creation-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own creation assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'creation-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create creation_projects table
CREATE TABLE public.creation_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creation_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for creation_projects
CREATE POLICY "Users can view their own projects"
ON public.creation_projects FOR SELECT
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own projects"
ON public.creation_projects FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own projects"
ON public.creation_projects FOR UPDATE
USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own projects"
ON public.creation_projects FOR DELETE
USING (user_id = auth.uid()::text);

-- Create creation_assets table
CREATE TABLE public.creation_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creation_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for creation_assets
CREATE POLICY "Users can view their project assets"
ON public.creation_assets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_assets.project_id AND user_id = auth.uid()::text
));

CREATE POLICY "Users can create assets for their projects"
ON public.creation_assets FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_assets.project_id AND user_id = auth.uid()::text
));

CREATE POLICY "Users can delete their project assets"
ON public.creation_assets FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_assets.project_id AND user_id = auth.uid()::text
));

-- Create creation_scene_state table (one per project)
CREATE TABLE public.creation_scene_state (
  project_id UUID NOT NULL PRIMARY KEY REFERENCES public.creation_projects(id) ON DELETE CASCADE,
  state_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creation_scene_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for creation_scene_state
CREATE POLICY "Users can view their project scene state"
ON public.creation_scene_state FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_scene_state.project_id AND user_id = auth.uid()::text
));

CREATE POLICY "Users can create scene state for their projects"
ON public.creation_scene_state FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_scene_state.project_id AND user_id = auth.uid()::text
));

CREATE POLICY "Users can update their project scene state"
ON public.creation_scene_state FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.creation_projects
  WHERE id = creation_scene_state.project_id AND user_id = auth.uid()::text
));

-- Triggers for updated_at
CREATE TRIGGER update_creation_projects_updated_at
BEFORE UPDATE ON public.creation_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creation_scene_state_updated_at
BEFORE UPDATE ON public.creation_scene_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();