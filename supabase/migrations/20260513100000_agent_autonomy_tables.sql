-- Agent autonomy: runs, events, memory, AI usage (optional)

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT,
  conversation_id UUID,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'needs_approval', 'completed', 'error')),
  source TEXT NOT NULL DEFAULT 'pi_agent' CHECK (source IN ('pi_agent', 'edge')),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_key ON public.agent_runs(user_key);
CREATE INDEX IF NOT EXISTS idx_agent_runs_conversation_id ON public.agent_runs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_key TEXT,
  kind TEXT NOT NULL, -- e.g. tool_call, tool_result, approval_requested, approval_decision, error, summary
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_run_id ON public.agent_events(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_user_key ON public.agent_events(user_key);
CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON public.agent_events(created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fact',
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0.7,
  source TEXT NOT NULL DEFAULT 'agent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_memory_user_key ON public.user_memory(user_key);
CREATE INDEX IF NOT EXISTS idx_user_memory_created_at ON public.user_memory(created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_key TEXT,
  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT,
  feature TEXT, -- e.g. arlo-ai, ai-draft-reply, router
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_key ON public.ai_usage_events(user_key);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created_at ON public.ai_usage_events(created_at DESC);

