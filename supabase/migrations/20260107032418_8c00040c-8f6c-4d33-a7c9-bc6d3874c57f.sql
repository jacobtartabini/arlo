-- Add dashboard module visibility settings to user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS dashboard_module_visibility JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column structure
COMMENT ON COLUMN public.user_settings.dashboard_module_visibility IS 'JSON object mapping module IDs to boolean visibility. Example: {"finance": true, "productivity": false}. Missing keys default to visible.';