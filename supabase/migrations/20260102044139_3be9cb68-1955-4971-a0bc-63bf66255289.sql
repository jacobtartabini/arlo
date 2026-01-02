-- Create a secure view for calendar_integrations that excludes sensitive token columns
-- This provides defense-in-depth: even if RLS is bypassed, tokens are not exposed via this view

-- Create the safe view (excludes access_token, refresh_token, ical_url)
CREATE OR REPLACE VIEW public.calendar_integrations_safe AS
SELECT 
  id,
  user_id,
  provider,
  enabled,
  token_expires_at,
  last_sync_at,
  last_sync_status,
  last_sync_error,
  created_at,
  updated_at
FROM public.calendar_integrations;

-- Enable RLS on the view
ALTER VIEW public.calendar_integrations_safe SET (security_invoker = on);

-- Add a comment explaining the security purpose
COMMENT ON VIEW public.calendar_integrations_safe IS 'Safe view of calendar_integrations that excludes sensitive OAuth tokens. Use this for client-side queries.';