-- =============================================================
-- PHASE 1: Productivity System Database Schema
-- =============================================================

-- 1. Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_key TEXT,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT 'folder',
  start_date DATE,
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects (using user_key pattern like other tables)
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create their own projects"
ON public.projects FOR INSERT
WITH CHECK (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

-- 2. Enhance tasks table with new fields
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_estimate_minutes INTEGER,
ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Add user_key to tasks if not exists (for consistency with data-api)
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS user_key TEXT;

-- Create index for project lookup
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);

-- 3. Create subtasks table
CREATE TABLE public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID,
  user_key TEXT,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on subtasks
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for subtasks
CREATE POLICY "Users can view their own subtasks"
ON public.subtasks FOR SELECT
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create their own subtasks"
ON public.subtasks FOR INSERT
WITH CHECK (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can update their own subtasks"
ON public.subtasks FOR UPDATE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can delete their own subtasks"
ON public.subtasks FOR DELETE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

-- Create index for subtask lookup
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.subtasks(task_id);

-- 4. Create time_blocks table (links tasks to calendar time slots)
CREATE TABLE public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_key TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  block_type TEXT NOT NULL DEFAULT 'focus' CHECK (block_type IN ('focus', 'soft', 'break')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  actual_duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on time_blocks
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for time_blocks
CREATE POLICY "Users can view their own time_blocks"
ON public.time_blocks FOR SELECT
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create their own time_blocks"
ON public.time_blocks FOR INSERT
WITH CHECK (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can update their own time_blocks"
ON public.time_blocks FOR UPDATE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can delete their own time_blocks"
ON public.time_blocks FOR DELETE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

-- Create indexes for time_blocks
CREATE INDEX IF NOT EXISTS idx_time_blocks_task_id ON public.time_blocks(task_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_calendar_event_id ON public.time_blocks(calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_start_time ON public.time_blocks(start_time);

-- 5. Create project_links table (for attachments and external links)
CREATE TABLE public.project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID,
  user_key TEXT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT NOT NULL DEFAULT 'link' CHECK (link_type IN ('link', 'file', 'note')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project_links
ALTER TABLE public.project_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_links
CREATE POLICY "Users can view their own project_links"
ON public.project_links FOR SELECT
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create their own project_links"
ON public.project_links FOR INSERT
WITH CHECK (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can update their own project_links"
ON public.project_links FOR UPDATE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can delete their own project_links"
ON public.project_links FOR DELETE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

-- Create index for project_links
CREATE INDEX IF NOT EXISTS idx_project_links_project_id ON public.project_links(project_id);

-- 6. Add updated_at triggers for new tables
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
BEFORE UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_blocks_updated_at
BEFORE UPDATE ON public.time_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing tasks RLS to also support user_key
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks"
ON public.tasks FOR SELECT
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can create their own tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can update their own tasks"
ON public.tasks FOR UPDATE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (
  user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'::text)
  OR auth.uid() = user_id
);