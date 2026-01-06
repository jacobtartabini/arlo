-- Drive Accounts: Store connected Google Drive accounts per user
CREATE TABLE public.drive_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  account_email TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  root_folder_id TEXT,
  storage_quota_used BIGINT,
  storage_quota_total BIGINT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_key, account_email)
);

-- Drive Files: Cache file metadata (no file content stored)
CREATE TABLE public.drive_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  drive_account_id UUID NOT NULL REFERENCES public.drive_accounts(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime_type TEXT,
  file_extension TEXT,
  size_bytes BIGINT,
  thumbnail_url TEXT,
  web_view_link TEXT,
  web_content_link TEXT,
  icon_link TEXT,
  owner_email TEXT,
  owner_name TEXT,
  is_folder BOOLEAN NOT NULL DEFAULT false,
  parent_folder_id TEXT,
  starred BOOLEAN DEFAULT false,
  trashed BOOLEAN DEFAULT false,
  created_time TIMESTAMPTZ,
  modified_time TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(drive_account_id, drive_file_id)
);

-- Drive File Links: Link files to Projects, Tasks, Trips, Events
CREATE TABLE public.drive_file_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL,
  drive_file_id UUID NOT NULL REFERENCES public.drive_files(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('project', 'task', 'trip', 'event')),
  linked_entity_id UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_drive_accounts_user_key ON public.drive_accounts(user_key);
CREATE INDEX idx_drive_files_user_key ON public.drive_files(user_key);
CREATE INDEX idx_drive_files_account ON public.drive_files(drive_account_id);
CREATE INDEX idx_drive_files_mime_type ON public.drive_files(mime_type);
CREATE INDEX idx_drive_files_modified ON public.drive_files(modified_time DESC);
CREATE INDEX idx_drive_files_name ON public.drive_files(name);
CREATE INDEX idx_drive_file_links_user_key ON public.drive_file_links(user_key);
CREATE INDEX idx_drive_file_links_file ON public.drive_file_links(drive_file_id);
CREATE INDEX idx_drive_file_links_entity ON public.drive_file_links(link_type, linked_entity_id);

-- Enable RLS
ALTER TABLE public.drive_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_file_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for drive_accounts
CREATE POLICY "Users can view their own drive accounts"
  ON public.drive_accounts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own drive accounts"
  ON public.drive_accounts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own drive accounts"
  ON public.drive_accounts FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own drive accounts"
  ON public.drive_accounts FOR DELETE
  USING (true);

-- RLS Policies for drive_files
CREATE POLICY "Users can view their own drive files"
  ON public.drive_files FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own drive files"
  ON public.drive_files FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own drive files"
  ON public.drive_files FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own drive files"
  ON public.drive_files FOR DELETE
  USING (true);

-- RLS Policies for drive_file_links
CREATE POLICY "Users can view their own drive file links"
  ON public.drive_file_links FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own drive file links"
  ON public.drive_file_links FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own drive file links"
  ON public.drive_file_links FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own drive file links"
  ON public.drive_file_links FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_drive_accounts_updated_at
  BEFORE UPDATE ON public.drive_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a safe view that excludes tokens (for client queries)
CREATE VIEW public.drive_accounts_safe AS
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