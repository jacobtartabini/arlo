-- Create provider enum for inbox accounts
CREATE TYPE public.inbox_provider AS ENUM (
  'gmail',
  'outlook', 
  'teams',
  'whatsapp',
  'telegram',
  'instagram',
  'linkedin'
);

-- Inbox accounts: connected provider accounts
CREATE TABLE public.inbox_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  provider inbox_provider NOT NULL,
  account_email TEXT, -- For email providers
  account_name TEXT NOT NULL, -- Display name
  account_id TEXT NOT NULL, -- Provider-specific account ID
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[], -- Granted scopes
  webhook_id TEXT, -- For providers with webhooks
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  sync_cursor TEXT, -- Provider-specific cursor/historyId
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_key, provider, account_id)
);

-- Inbox threads: normalized message threads
CREATE TABLE public.inbox_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  provider inbox_provider NOT NULL,
  external_thread_id TEXT NOT NULL, -- Provider's thread/conversation ID
  subject TEXT, -- For email threads
  snippet TEXT, -- Preview text
  participants JSONB DEFAULT '[]'::jsonb, -- Array of {name, email/handle, avatar_url}
  unread_count INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  labels TEXT[] DEFAULT '{}', -- Gmail labels, Outlook categories, etc.
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, external_thread_id)
);

-- Inbox messages: individual messages within threads
CREATE TABLE public.inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  thread_id UUID NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  provider inbox_provider NOT NULL,
  external_message_id TEXT NOT NULL, -- Provider's message ID
  sender JSONB NOT NULL, -- {name, email/handle, avatar_url}
  recipients JSONB DEFAULT '[]'::jsonb, -- For email: to, cc, bcc
  subject TEXT,
  body_text TEXT, -- Plain text body
  body_html TEXT, -- HTML body (for email)
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of {name, mime_type, size, url}
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_outgoing BOOLEAN NOT NULL DEFAULT false, -- Sent by user
  in_reply_to TEXT, -- Parent message ID
  sent_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, external_message_id)
);

-- Inbox drafts: AI-generated draft replies
CREATE TABLE public.inbox_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  thread_id UUID NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  ai_generated BOOLEAN NOT NULL DEFAULT true,
  sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inbox sync state: track sync progress per account
CREATE TABLE public.inbox_sync_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'incremental', -- 'initial' | 'incremental'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  messages_synced INTEGER DEFAULT 0,
  threads_synced INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, sync_type)
);

-- Create indexes for performance
CREATE INDEX idx_inbox_accounts_user_key ON public.inbox_accounts(user_key);
CREATE INDEX idx_inbox_accounts_provider ON public.inbox_accounts(provider);
CREATE INDEX idx_inbox_threads_user_key ON public.inbox_threads(user_key);
CREATE INDEX idx_inbox_threads_account_id ON public.inbox_threads(account_id);
CREATE INDEX idx_inbox_threads_last_message ON public.inbox_threads(last_message_at DESC);
CREATE INDEX idx_inbox_messages_thread_id ON public.inbox_messages(thread_id);
CREATE INDEX idx_inbox_messages_sent_at ON public.inbox_messages(sent_at DESC);
CREATE INDEX idx_inbox_messages_user_key ON public.inbox_messages(user_key);

-- Enable RLS on all tables
ALTER TABLE public.inbox_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_sync_state ENABLE ROW LEVEL SECURITY;

-- RLS policies for inbox_accounts (using user_key header from edge functions)
CREATE POLICY "Users can view their own accounts"
  ON public.inbox_accounts FOR SELECT
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can create their own accounts"
  ON public.inbox_accounts FOR INSERT
  WITH CHECK (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can update their own accounts"
  ON public.inbox_accounts FOR UPDATE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can delete their own accounts"
  ON public.inbox_accounts FOR DELETE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

-- RLS policies for inbox_threads
CREATE POLICY "Users can view their own threads"
  ON public.inbox_threads FOR SELECT
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can create their own threads"
  ON public.inbox_threads FOR INSERT
  WITH CHECK (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can update their own threads"
  ON public.inbox_threads FOR UPDATE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can delete their own threads"
  ON public.inbox_threads FOR DELETE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

-- RLS policies for inbox_messages
CREATE POLICY "Users can view their own messages"
  ON public.inbox_messages FOR SELECT
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can create their own messages"
  ON public.inbox_messages FOR INSERT
  WITH CHECK (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can update their own messages"
  ON public.inbox_messages FOR UPDATE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can delete their own messages"
  ON public.inbox_messages FOR DELETE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

-- RLS policies for inbox_drafts
CREATE POLICY "Users can view their own drafts"
  ON public.inbox_drafts FOR SELECT
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can create their own drafts"
  ON public.inbox_drafts FOR INSERT
  WITH CHECK (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can update their own drafts"
  ON public.inbox_drafts FOR UPDATE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can delete their own drafts"
  ON public.inbox_drafts FOR DELETE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

-- RLS policies for inbox_sync_state
CREATE POLICY "Users can view their own sync state"
  ON public.inbox_sync_state FOR SELECT
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can create their own sync state"
  ON public.inbox_sync_state FOR INSERT
  WITH CHECK (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can update their own sync state"
  ON public.inbox_sync_state FOR UPDATE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

CREATE POLICY "Users can delete their own sync state"
  ON public.inbox_sync_state FOR DELETE
  USING (user_key = ((current_setting('request.headers'::text, true))::json ->> 'x-user-key'));

-- Triggers for updated_at
CREATE TRIGGER update_inbox_accounts_updated_at
  BEFORE UPDATE ON public.inbox_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_threads_updated_at
  BEFORE UPDATE ON public.inbox_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inbox_drafts_updated_at
  BEFORE UPDATE ON public.inbox_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a safe view that excludes tokens (for client-side queries)
CREATE VIEW public.inbox_accounts_safe AS
SELECT 
  id,
  user_key,
  provider,
  account_email,
  account_name,
  account_id,
  scopes,
  last_sync_at,
  last_sync_error,
  enabled,
  created_at,
  updated_at,
  token_expires_at
FROM public.inbox_accounts;

-- Enable RLS on the view
ALTER VIEW public.inbox_accounts_safe SET (security_invoker = true);