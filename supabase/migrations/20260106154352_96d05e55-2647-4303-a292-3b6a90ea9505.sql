-- ============================================
-- FINANCE MODULE SCHEMA
-- ============================================

-- Plaid linked accounts (stores access tokens encrypted)
CREATE TABLE public.finance_linked_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT NOT NULL, -- Encrypted server-side
  institution_id TEXT,
  institution_name TEXT NOT NULL,
  institution_logo TEXT,
  account_mask TEXT,
  account_name TEXT,
  account_type TEXT, -- checking, savings, credit, investment
  account_subtype TEXT,
  current_balance NUMERIC(15,2),
  available_balance NUMERIC(15,2),
  currency TEXT DEFAULT 'USD',
  last_synced_at TIMESTAMPTZ,
  sync_cursor TEXT, -- For transactions sync
  error_code TEXT,
  error_message TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Finance transactions (from Plaid + manual)
CREATE TABLE public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  linked_account_id UUID REFERENCES public.finance_linked_accounts(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT UNIQUE,
  amount NUMERIC(15,2) NOT NULL, -- Positive = expense, negative = income (Plaid convention)
  currency TEXT DEFAULT 'USD',
  date DATE NOT NULL,
  name TEXT NOT NULL,
  merchant_name TEXT,
  category TEXT,
  category_detailed TEXT,
  pending BOOLEAN DEFAULT false,
  is_manual BOOLEAN DEFAULT false,
  notes TEXT,
  tags TEXT[],
  -- Integration with /files
  receipt_file_id UUID, -- References drive_files
  -- Integration with /productivity
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  -- Metadata
  location_city TEXT,
  location_state TEXT,
  payment_channel TEXT, -- online, in_store, other
  is_recurring BOOLEAN DEFAULT false,
  recurring_stream_id TEXT, -- Plaid recurring stream ID
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly budgets
CREATE TABLE public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2100),
  spent NUMERIC(15,2) DEFAULT 0,
  carryover_enabled BOOLEAN DEFAULT false,
  carryover_amount NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_key, category, month, year)
);

-- Subscriptions (detected from Plaid recurring + manual)
CREATE TABLE public.finance_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  plaid_stream_id TEXT UNIQUE,
  merchant_name TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, weekly
  next_billing_date DATE,
  last_billing_date DATE,
  first_billing_date DATE,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  is_manual BOOLEAN DEFAULT false,
  cancellation_date DATE,
  cancellation_notes TEXT,
  -- Alert settings
  price_increased BOOLEAN DEFAULT false,
  previous_amount NUMERIC(15,2),
  remind_before_days INTEGER DEFAULT 3,
  -- Metadata
  website_url TEXT,
  notes TEXT,
  linked_account_id UUID REFERENCES public.finance_linked_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gift cards (manual tracking)
CREATE TABLE public.finance_gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  initial_balance NUMERIC(15,2) NOT NULL,
  current_balance NUMERIC(15,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  card_number_last4 TEXT, -- Only store last 4 digits
  expiry_date DATE,
  purchase_date DATE,
  notes TEXT,
  -- Photo stored in /files
  photo_file_id UUID, -- References drive_files
  is_depleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Gift card usage log
CREATE TABLE public.finance_gift_card_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  gift_card_id UUID NOT NULL REFERENCES public.finance_gift_cards(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- Stock watchlist
CREATE TABLE public.finance_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  notes TEXT,
  target_price_high NUMERIC(15,2),
  target_price_low NUMERIC(15,2),
  alert_enabled BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_key, symbol)
);

-- Manual stock portfolio (optional tracking, no trading)
CREATE TABLE public.finance_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  symbol TEXT NOT NULL,
  shares NUMERIC(15,6) NOT NULL,
  average_cost NUMERIC(15,4),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Finance settings/preferences
CREATE TABLE public.finance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL UNIQUE,
  default_currency TEXT DEFAULT 'USD',
  fiscal_month_start INTEGER DEFAULT 1, -- 1 = January
  hide_balances BOOLEAN DEFAULT false,
  show_cents BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.finance_linked_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_gift_card_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for finance_linked_accounts
CREATE POLICY "Users can view their own linked accounts"
  ON public.finance_linked_accounts FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own linked accounts"
  ON public.finance_linked_accounts FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own linked accounts"
  ON public.finance_linked_accounts FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own linked accounts"
  ON public.finance_linked_accounts FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.finance_transactions FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own transactions"
  ON public.finance_transactions FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own transactions"
  ON public.finance_transactions FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own transactions"
  ON public.finance_transactions FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_budgets
CREATE POLICY "Users can view their own budgets"
  ON public.finance_budgets FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own budgets"
  ON public.finance_budgets FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own budgets"
  ON public.finance_budgets FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own budgets"
  ON public.finance_budgets FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.finance_subscriptions FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own subscriptions"
  ON public.finance_subscriptions FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own subscriptions"
  ON public.finance_subscriptions FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own subscriptions"
  ON public.finance_subscriptions FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_gift_cards
CREATE POLICY "Users can view their own gift cards"
  ON public.finance_gift_cards FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own gift cards"
  ON public.finance_gift_cards FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own gift cards"
  ON public.finance_gift_cards FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own gift cards"
  ON public.finance_gift_cards FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_gift_card_usage
CREATE POLICY "Users can view their own gift card usage"
  ON public.finance_gift_card_usage FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own gift card usage"
  ON public.finance_gift_card_usage FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own gift card usage"
  ON public.finance_gift_card_usage FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_watchlist
CREATE POLICY "Users can view their own watchlist"
  ON public.finance_watchlist FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own watchlist items"
  ON public.finance_watchlist FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own watchlist items"
  ON public.finance_watchlist FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own watchlist items"
  ON public.finance_watchlist FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_portfolio
CREATE POLICY "Users can view their own portfolio"
  ON public.finance_portfolio FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own portfolio items"
  ON public.finance_portfolio FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own portfolio items"
  ON public.finance_portfolio FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete their own portfolio items"
  ON public.finance_portfolio FOR DELETE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for finance_settings
CREATE POLICY "Users can view their own settings"
  ON public.finance_settings FOR SELECT
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own settings"
  ON public.finance_settings FOR INSERT
  WITH CHECK (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own settings"
  ON public.finance_settings FOR UPDATE
  USING (user_key = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for performance
CREATE INDEX idx_finance_transactions_user_key ON public.finance_transactions(user_key);
CREATE INDEX idx_finance_transactions_date ON public.finance_transactions(date DESC);
CREATE INDEX idx_finance_transactions_category ON public.finance_transactions(category);
CREATE INDEX idx_finance_transactions_linked_account ON public.finance_transactions(linked_account_id);
CREATE INDEX idx_finance_budgets_user_key_period ON public.finance_budgets(user_key, year, month);
CREATE INDEX idx_finance_subscriptions_user_key ON public.finance_subscriptions(user_key);
CREATE INDEX idx_finance_gift_cards_user_key ON public.finance_gift_cards(user_key);
CREATE INDEX idx_finance_watchlist_user_key ON public.finance_watchlist(user_key);

-- Triggers for updated_at
CREATE TRIGGER update_finance_linked_accounts_updated_at
  BEFORE UPDATE ON public.finance_linked_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_transactions_updated_at
  BEFORE UPDATE ON public.finance_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_budgets_updated_at
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_subscriptions_updated_at
  BEFORE UPDATE ON public.finance_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_gift_cards_updated_at
  BEFORE UPDATE ON public.finance_gift_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_portfolio_updated_at
  BEFORE UPDATE ON public.finance_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_settings_updated_at
  BEFORE UPDATE ON public.finance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();