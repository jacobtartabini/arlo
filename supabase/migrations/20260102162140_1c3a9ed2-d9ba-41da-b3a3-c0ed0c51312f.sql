-- Add user_key column to calendar_integrations for TEXT-based user identification
-- This allows storing email/tailnet identifiers while keeping UUID user_id for Supabase Auth compatibility

ALTER TABLE public.calendar_integrations 
ADD COLUMN IF NOT EXISTS user_key TEXT;

-- Create index for efficient lookups by user_key
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_key ON public.calendar_integrations(user_key);

-- Create unique constraint on user_key + provider for upserts
ALTER TABLE public.calendar_integrations 
DROP CONSTRAINT IF EXISTS calendar_integrations_user_key_provider_key;

ALTER TABLE public.calendar_integrations 
ADD CONSTRAINT calendar_integrations_user_key_provider_key UNIQUE (user_key, provider);

-- Update the safe view to include user_key
DROP VIEW IF EXISTS public.calendar_integrations_safe;

CREATE VIEW public.calendar_integrations_safe AS
SELECT 
  id,
  user_id,
  user_key,
  provider,
  enabled,
  last_sync_at,
  last_sync_status,
  last_sync_error,
  token_expires_at,
  created_at,
  updated_at
FROM public.calendar_integrations;

-- Also add user_key to calendar_events for consistency
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS user_key TEXT;

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_key ON public.calendar_events(user_key);

-- Add user_key to oauth_nonces (it already uses TEXT user_id, but let's be explicit)
-- oauth_nonces.user_id is already TEXT, so we're good there