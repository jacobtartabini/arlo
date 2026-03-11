
-- Add unique constraint on (user_key, plaid_account_id) 
ALTER TABLE public.finance_linked_accounts
  ADD CONSTRAINT finance_linked_accounts_user_plaid_account_unique 
  UNIQUE (user_key, plaid_account_id);

-- Add non-unique index on plaid_item_id for lookups
CREATE INDEX IF NOT EXISTS idx_finance_linked_accounts_plaid_item_id 
  ON public.finance_linked_accounts(plaid_item_id);
