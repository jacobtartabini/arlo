-- Fix the security definer view issue by setting security_invoker = true
-- This ensures the view uses the querying user's permissions, not the view creator's

DROP VIEW IF EXISTS public.calendar_integrations_safe;

CREATE VIEW public.calendar_integrations_safe 
WITH (security_invoker = true) AS
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