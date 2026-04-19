import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  unauthorizedResponse,
  jsonResponse,
  errorResponse,
} from '../_shared/arloAuth.ts'

const DEFAULT_MAX_TOKENS = 4096

function defaultAnthropicModel(): string {
  return Deno.env.get('ARLO_AI_MODEL')?.trim() || 'claude-sonnet-4-20250514'
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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
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
    typeof body.model === 'string' && body.model.trim() ? body.model.trim() : defaultAnthropicModel()
  const max_tokens =
    typeof body.max_tokens === 'number' && Number.isFinite(body.max_tokens)
      ? Math.min(Math.max(body.max_tokens, 1), 8192)
      : DEFAULT_MAX_TOKENS

  const system =
    typeof body.system === 'string' && body.system.trim()
      ? body.system.trim()
      : 'You are Arlo, a concise and helpful personal assistant inside the Arlo command center app.'

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        system,
        messages: normalized,
      }),
    })

    const raw = await response.text()
    let parsed: { content?: Array<{ type?: string; text?: string }>; error?: { message?: string } }
    try {
      parsed = JSON.parse(raw) as typeof parsed
    } catch {
      return errorResponse(req, 'Invalid response from AI provider', 502)
    }

    if (!response.ok) {
      const msg = parsed.error?.message || raw.slice(0, 200) || `Anthropic error ${response.status}`
      console.error('[arlo-ai] Anthropic API error:', response.status, msg)
      return jsonResponse(req, { error: msg }, response.status >= 400 && response.status < 600 ? response.status : 502)
    }

    const blocks = parsed.content ?? []
    const text = blocks
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim()

    if (!text) {
      return errorResponse(req, 'Empty response from AI model', 502)
    }

    return jsonResponse(req, { text })
  } catch (e) {
    console.error('[arlo-ai] Unexpected error:', e)
    return errorResponse(req, e instanceof Error ? e.message : 'Unexpected error', 500)
  }
})
