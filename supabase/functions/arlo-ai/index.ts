import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  unauthorizedResponse,
  jsonResponse,
  errorResponse,
} from '../_shared/arloAuth.ts'
import { checkAuthRateLimit, AUTH_RATE_LIMITS } from '../_shared/authRateLimit.ts'
import {
  callAnthropicMessages,
  extractTextFromAnthropic,
  buildAnthropicErrorMessage,
  type AnthropicMessage,
} from '../_shared/anthropic.ts'

interface ArloAiRequest {
  prompt?: string
  conversation?: Array<{ role: 'user' | 'assistant'; content: string }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  const originError = validateOrigin(req)
  if (originError) return originError

  const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.dataApi)
  if (rateLimitResponse) return rateLimitResponse

  const authResult = await verifyArloJWT(req)
  if (!authResult.authenticated) {
    return unauthorizedResponse(req, authResult.error || 'Authentication required')
  }

  if (req.method !== 'POST') {
    return errorResponse(req, 'Method not allowed', 405)
  }

  try {
    const body = (await req.json()) as ArloAiRequest
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return errorResponse(req, 'prompt is required', 400)
    }

    const history: AnthropicMessage[] = Array.isArray(body.conversation)
      ? body.conversation
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant') && item.content?.trim())
          .slice(-10)
          .map((item) => ({
            role: item.role,
            content: item.content.trim(),
          }))
      : []

    const messages: AnthropicMessage[] = [
      ...history,
      { role: 'user', content: prompt },
    ]

    const anthropicResponse = await callAnthropicMessages({
      model: 'claude-3-5-haiku-latest',
      maxTokens: 1024,
      temperature: 0.5,
      system:
        'You are Arlo, a concise, practical personal AI assistant. Be accurate, actionable, and clear.',
      messages,
    })

    const text = extractTextFromAnthropic(anthropicResponse)
    if (!text) {
      return errorResponse(req, 'Model returned an empty response', 502)
    }

    return jsonResponse(req, {
      success: true,
      message: text,
      model: anthropicResponse.model,
      stop_reason: anthropicResponse.stop_reason,
    })
  } catch (err) {
    console.error('[arlo-ai] Error:', err)
    return errorResponse(
      req,
      buildAnthropicErrorMessage(err, 'Arlo AI request failed'),
      500,
    )
  }
})
