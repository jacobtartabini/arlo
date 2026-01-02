-- Make chat-attachments bucket private and restrict to service role only

-- Drop all public policies
DROP POLICY IF EXISTS "Allow public uploads to chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public update to chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete from chat-attachments" ON storage.objects;

-- Drop any older policies that might exist
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

-- Make the bucket private (no public access)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-attachments';

-- Note: With the bucket private and no RLS policies allowing access,
-- only the service role (used by our edge function) can access files.
-- All access goes through the storage-proxy edge function which validates
-- Tailscale JWT authentication.