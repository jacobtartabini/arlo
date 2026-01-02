-- Create oauth_nonces table for secure OAuth state validation
CREATE TABLE public.oauth_nonces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nonce TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_oauth_nonces_nonce ON public.oauth_nonces (nonce);
CREATE INDEX idx_oauth_nonces_expires ON public.oauth_nonces (expires_at);

-- Enable RLS (service role only)
ALTER TABLE public.oauth_nonces ENABLE ROW LEVEL SECURITY;

-- No RLS policies - only service role can access this table
-- This prevents any client-side access to nonces

COMMENT ON TABLE public.oauth_nonces IS 'Stores temporary OAuth nonces for CSRF protection during OAuth flows. Nonces are single-use and expire after 10 minutes.';