-- Restrict client access to Plaid access tokens and linked account mutation

-- Prevent direct client mutation of linked accounts
DROP POLICY IF EXISTS "Users can insert their own linked accounts" ON public.finance_linked_accounts;
DROP POLICY IF EXISTS "Users can update their own linked accounts" ON public.finance_linked_accounts;
DROP POLICY IF EXISTS "Users can delete their own linked accounts" ON public.finance_linked_accounts;

-- Prevent access to Plaid access tokens for anon/authenticated roles
REVOKE SELECT (plaid_access_token) ON public.finance_linked_accounts FROM anon, authenticated;
REVOKE UPDATE (plaid_access_token) ON public.finance_linked_accounts FROM anon, authenticated;
