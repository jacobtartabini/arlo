import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  unauthorizedResponse,
  jsonResponse,
  errorResponse,
} from '../_shared/arloAuth.ts'
import {
  buildAnthropicErrorMessage,
  callAnthropicMessages,
  extractTextFromAnthropic,
  normalizeAnthropicModel,
} from '../_shared/anthropic.ts'
import { checkRateLimit, getClientIP } from '../_shared/rateLimit.ts'

// Per-user rate limit (authenticated): 30 requests / minute / user.
// Per-IP rate limit (pre-auth defense): 60 requests / minute / IP.
// Generous for normal chat + voice usage but blocks abuse.
const USER_RATE_LIMIT = {
  maxRequests: 30,
  windowSeconds: 60,
  keyPrefix: 'arlo_ai_user',
}
const IP_RATE_LIMIT = {
  maxRequests: 60,
  windowSeconds: 60,
  keyPrefix: 'arlo_ai_ip',
}

const DEFAULT_MAX_TOKENS = 400

function defaultAnthropicModel(): string {
  // Normalize env overrides too, so stale aliases don't break production.
  return normalizeAnthropicModel(Deno.env.get('ARLO_AI_MODEL'))
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  const originError = validateOrigin(req)
  if (originError) return originError

  const authResult = await verifyArloJWT(req)
  if (!authResult.authenticated) {
    return unauthorizedResponse(req, authResult.error || 'Authentication required')
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405)
  }

  if (!Deno.env.get('ANTHROPIC_API_KEY')) {
    console.error('[arlo-ai] ANTHROPIC_API_KEY is not set')
    return jsonResponse(
      req,
      {
        error: 'AI is not configured on the server (missing ANTHROPIC_API_KEY).',
        configured: false,
      },
      503,
    )
  }

  let body: { messages?: ChatTurn[]; system?: string; model?: string; max_tokens?: number }
  try {
    body = await req.json()
  } catch {
    return errorResponse(req, 'Invalid JSON body', 400)
  }

  const messages = Array.isArray(body.messages) ? body.messages : []
  const normalized: ChatTurn[] = messages
    .filter(
      (m): m is ChatTurn =>
        m != null &&
        typeof m === 'object' &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content.trim() }))

  if (normalized.length === 0) {
    return errorResponse(req, 'At least one user or assistant message is required', 400)
  }

  const model =
    typeof body.model === 'string' && body.model.trim()
      ? normalizeAnthropicModel(body.model)
      : defaultAnthropicModel()
  const max_tokens =
    typeof body.max_tokens === 'number' && Number.isFinite(body.max_tokens)
      ? Math.min(Math.max(body.max_tokens, 1), 8192)
      : DEFAULT_MAX_TOKENS

  const system =
    typeof body.system === 'string' && body.system.trim()
      ? body.system.trim()
      : `You are Arlo, a personal assistant in the style of JARVIS: precise, efficient, and direct.

Rules:
- Answer the exact question asked. Nothing more.
- Prefer one short sentence. Never exceed three.
- No greetings, no sign-offs, no filler ("Sure!", "Of course", "I'd be happy to", "Let me know if...").
- No emojis. No markdown formatting unless explicitly requested.
- No background, history, context, or caveats unless explicitly requested.
- If asked a factual question, return only the fact (e.g. "Paris.").
- If unsure, say so in one short sentence.`

  try {
    const payload = await callAnthropicMessages({
      model,
      system,
      maxTokens: max_tokens,
      messages: normalized,
    })

    const text = extractTextFromAnthropic(payload)

    if (!text) {
      return errorResponse(req, 'Empty response from AI model', 502)
    }

    return jsonResponse(req, { text })
  } catch (e) {
    const message = buildAnthropicErrorMessage(e, 'Unexpected error')
    console.error('[arlo-ai] Unexpected error:', message)
    return errorResponse(req, message, /^model:/i.test(message) ? 502 : 500)
  }
})
