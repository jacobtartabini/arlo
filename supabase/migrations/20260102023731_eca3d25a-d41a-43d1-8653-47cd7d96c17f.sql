-- Create storage policies for chat-attachments bucket to allow public uploads
-- The bucket is public for viewing, but we need policies to allow uploads

-- Allow anyone to upload files to the chat-attachments bucket
CREATE POLICY "Allow public uploads to chat-attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to read files from chat-attachments bucket
CREATE POLICY "Allow public read access to chat-attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow anyone to update files in chat-attachments bucket
CREATE POLICY "Allow public update to chat-attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'chat-attachments');

-- Allow anyone to delete files from chat-attachments bucket
CREATE POLICY "Allow public delete from chat-attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'chat-attachments');