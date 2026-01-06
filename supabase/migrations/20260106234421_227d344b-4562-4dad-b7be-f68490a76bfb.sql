-- Create voice_settings table for Cartesia TTS and wake word configuration
CREATE TABLE public.voice_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_key TEXT NOT NULL UNIQUE,
  
  -- Cartesia TTS settings
  cartesia_api_key TEXT,
  cartesia_voice_id TEXT DEFAULT 'a0e99841-438c-4a64-b679-ae501e7d6091',
  cartesia_model TEXT DEFAULT 'sonic-english',
  
  -- Wake word settings
  wake_word_enabled BOOLEAN DEFAULT false,
  wake_word_phrase TEXT DEFAULT 'Hey Arlo',
  
  -- Voice mode preferences
  voice_mode_enabled BOOLEAN DEFAULT false,
  auto_send_on_silence BOOLEAN DEFAULT true,
  silence_timeout_ms INTEGER DEFAULT 1500,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.voice_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own voice settings" 
ON public.voice_settings 
FOR SELECT 
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can create their own voice settings" 
ON public.voice_settings 
FOR INSERT 
WITH CHECK (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can update their own voice settings" 
ON public.voice_settings 
FOR UPDATE 
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

CREATE POLICY "Users can delete their own voice settings" 
ON public.voice_settings 
FOR DELETE 
USING (user_key = current_setting('request.headers', true)::json->>'x-user-key');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_voice_settings_updated_at
BEFORE UPDATE ON public.voice_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();