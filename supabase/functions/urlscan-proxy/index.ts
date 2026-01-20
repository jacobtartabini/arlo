import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  getCorsHeaders,
} from '../_shared/arloAuth.ts'

const URLSCAN_ENDPOINT = 'https://urlscan.io/api/v1/search/'

interface UrlscanRequestBody {
  domain?: string
  query?: string
  debug?: boolean
}

interface ErrorDetails {
  [key: string]: unknown
}

function jsonError(
  req: Request,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
): Response {
  const origin = req.headers.get('origin')
  return new Response(
    JSON.stringify({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    }),
    {
      status,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  )
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      return await response.json()
    } catch {
      return await response.text()
    }
  }
  return await response.text()
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)

  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  const originError = validateOrigin(req)
  if (originError) return originError

  if (req.method !== 'POST') {
    return jsonError(req, 405, 'method_not_allowed', 'Method not allowed', {
      requestId,
      allowed: ['POST'],
    })
  }

  const authResult = await verifyArloJWT(req)
  if (!authResult.authenticated) {
    return jsonError(req, 401, 'unauthorized', authResult.error || 'Authentication required', {
      requestId,
    })
  }

  let body: UrlscanRequestBody
  try {
    body = await req.json()
  } catch (error) {
    return jsonError(req, 422, 'invalid_json', 'Request body must be valid JSON', {
      requestId,
      error: error instanceof Error ? error.message : error,
    })
  }

  const domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase() : ''
  const query = typeof body.query === 'string' ? body.query.trim() : ''

  if (!domain && !query) {
    return jsonError(req, 422, 'missing_fields', 'Domain or query is required', { requestId })
  }

  const apiKey = Deno.env.get('URLSCAN_API_KEY')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['API-Key'] = apiKey
  }

  const searchUrl = new URL(URLSCAN_ENDPOINT)
  const searchQuery = query || `domain:${domain}`
  searchUrl.searchParams.set('q', searchQuery)

  try {
    const response = await fetch(searchUrl.toString(), { method: 'GET', headers })
    if (!response.ok) {
      const errorPayload = await readResponseBody(response)
      return jsonError(req, 502, 'upstream_error', 'URLScan API error', {
        requestId,
        upstreamStatus: response.status,
        upstreamBody: errorPayload,
      })
    }

    const data = await response.json()
    const origin = req.headers.get('origin')
    return new Response(
      JSON.stringify({
        data,
        ...(body.debug ? { debug: { requestId, status: response.status, domain, query: searchQuery } } : {}),
      }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(origin),
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      }
    )
  } catch (error) {
    return jsonError(req, 500, 'internal_error', 'Unexpected server error', {
      requestId,
      error: error instanceof Error ? error.message : error,
      path: url.pathname,
    })
  }
})
