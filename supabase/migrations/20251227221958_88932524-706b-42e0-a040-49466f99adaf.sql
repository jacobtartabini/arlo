-- Create a table for chat folders
CREATE TABLE public.chat_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own chat folders" 
ON public.chat_folders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat folders" 
ON public.chat_folders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat folders" 
ON public.chat_folders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat folders" 
ON public.chat_folders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chat_folders_updated_at
BEFORE UPDATE ON public.chat_folders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add folder_id column to conversations table
ALTER TABLE public.conversations
ADD COLUMN folder_id UUID REFERENCES public.chat_folders(id) ON DELETE SET NULL;