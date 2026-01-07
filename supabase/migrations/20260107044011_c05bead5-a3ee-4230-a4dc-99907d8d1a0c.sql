-- Add dashboard_module_layouts column to user_settings table
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS dashboard_module_layouts JSONB NOT NULL DEFAULT '{}'::jsonb;