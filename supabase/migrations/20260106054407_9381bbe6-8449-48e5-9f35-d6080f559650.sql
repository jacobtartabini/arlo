-- Fix the view to use security_invoker
DROP VIEW IF EXISTS public.drive_accounts_safe;

CREATE VIEW public.drive_accounts_safe 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_key,
  account_email,
  account_name,
  root_folder_id,
  storage_quota_used,
  storage_quota_total,
  enabled,
  last_sync_at,
  last_sync_error,
  created_at,
  updated_at,
  CASE WHEN access_token IS NOT NULL THEN true ELSE false END AS is_connected
FROM public.drive_accounts;