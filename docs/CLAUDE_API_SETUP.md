# Claude API setup for Arlo

This project now includes Claude-backed Supabase Edge Functions:

- `arlo-ai` for general Arlo assistant prompts
- `ai-draft-reply` for Inbox draft reply generation

Both functions use the shared helper at `supabase/functions/_shared/anthropic.ts` and require the `ANTHROPIC_API_KEY` secret.

## 1) Set required Supabase Edge Function secrets

Set these in your Supabase project:

- `ANTHROPIC_API_KEY` (required)
- existing auth secrets used by protected functions (already in this repo):
  - `ARLO_AUTH_JWT_SECRET`
  - `ARLO_JWT_ISSUER`
  - `ARLO_JWT_AUDIENCE`

Example:

```bash
supabase secrets set ANTHROPIC_API_KEY="your_key_here"
```

## 2) Deploy functions

```bash
supabase functions deploy arlo-ai
supabase functions deploy ai-draft-reply
```

## 3) Current app integrations

- Arlo Chat (`src/providers/ArloProvider.tsx`)
  - Uses WebSocket first.
  - Falls back to `arlo-ai` when WS is unavailable.
- Notes AI module (`src/components/notes/modules/ArloAIModule.tsx`)
  - Calls `arlo-ai` directly.
- Inbox AI reply (`src/pages/Inbox.tsx`)
  - Calls `ai-draft-reply`.

## 4) Rate limiting and usage safety

- Chat UI has a local client limiter (20 messages / 60 seconds).
- `arlo-ai` and `ai-draft-reply` enforce backend auth + rate limit checks.
- Keep model selection and max token values in Edge Functions to control cost.

