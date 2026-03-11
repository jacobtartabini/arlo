
-- Add plaid_account_id column
ALTER TABLE public.finance_linked_accounts
  ADD COLUMN IF NOT EXISTS plaid_account_id text;
