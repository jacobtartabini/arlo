import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  getCorsHeaders,
} from '../_shared/arloAuth.ts'

interface TailscaleDevice {
  id: string
  name: string
  hostname: string
  addresses: string[]
  os: string
  lastSeen: string
  online: boolean
  tags?: string[]
  user: string
  clientVersion: string
  updateAvailable: boolean
  expires?: string
}

interface TailscaleAuditEvent {
  eventId: string
  eventTime: string
  eventType: string
  actor: {
    id: string
    displayName: string
    loginName: string
    type: string
  }
  target?: {
    id: string
    name: string
    type: string
  }
  origin?: {
    nodeId?: string
    nodeName?: string
    nodeIP?: string
  }
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)

  // Log incoming request details for debugging
  console.log('[tailscale-api] Request received:', req.method, req.url)
  console.log('[tailscale-api] Origin:', req.headers.get('origin'))
  console.log('[tailscale-api] Has Authorization:', !!req.headers.get('authorization'))
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[tailscale-api] Handling CORS preflight')
    return handleCorsOptions(req)
  }

  try {
    const originError = validateOrigin(req)
    if (originError) return originError

    if (req.method !== 'POST') {
      return jsonError(req, 405, 'method_not_allowed', 'Method not allowed', {
        requestId,
        allowed: ['POST'],
      })
    }

    // Verify JWT authentication
    const authResult = await verifyArloJWT(req)
    
    if (!authResult.authenticated) {
      console.log('[tailscale-api] Authentication failed:', authResult.error)
      return jsonError(req, 401, 'unauthorized', authResult.error || 'Authentication required', {
        requestId,
      })
    }

    // userId is derived from JWT.sub - no ARLO_USER_ID used
    console.log('[tailscale-api] Authenticated user (from JWT.sub):', authResult.userId)

    const TAILSCALE_API_KEY = Deno.env.get('TAILSCALE_API_KEY')
    const TAILSCALE_TAILNET = Deno.env.get('TAILSCALE_TAILNET')

    if (!TAILSCALE_API_KEY) {
      return jsonError(req, 500, 'config_missing', 'Tailscale API key not configured', {
        requestId,
      })
    }

    if (!TAILSCALE_TAILNET) {
      return jsonError(req, 500, 'config_missing', 'Tailscale tailnet not configured', {
        requestId,
      })
    }

    let body: { action?: string; debug?: boolean; limit?: number; start?: string; end?: string; cursor?: string }
    try {
      body = await req.json()
    } catch (error) {
      return jsonError(req, 422, 'invalid_json', 'Request body must be valid JSON', {
        requestId,
        error: error instanceof Error ? error.message : error,
      })
    }

    const { action } = body
    const debug = body.debug === true
    if (!action) {
      return jsonError(req, 422, 'missing_fields', 'Action is required', { requestId })
    }

    const baseUrl = `https://api.tailscale.com/api/v2/tailnet/${TAILSCALE_TAILNET}`
    const headers = {
      'Authorization': `Bearer ${TAILSCALE_API_KEY}`,
      'Content-Type': 'application/json',
    }

    if (action === 'devices') {
      // Fetch devices from Tailscale API
      const response = await fetch(`${baseUrl}/devices`, { headers })
      
      if (!response.ok) {
        const errorPayload = await readResponseBody(response)
        console.error('[tailscale-api] Tailscale API error:', response.status, errorPayload)
        return jsonError(req, 502, 'upstream_error', 'Tailscale API error', {
          requestId,
          action,
          upstreamStatus: response.status,
          upstreamBody: errorPayload,
        })
      }

      const data = await response.json()
      const devices: TailscaleDevice[] = data.devices || []

      // Transform to our format
      const transformedDevices = devices.map((device: TailscaleDevice) => ({
        id: device.id,
        name: device.hostname || device.name,
        os: device.os,
        status: device.online ? 'online' : 'offline',
        tailnetIp: device.addresses?.[0] || '',
        lastSeen: device.lastSeen,
        tags: device.tags || [],
        user: device.user,
        clientVersion: device.clientVersion,
        updateAvailable: device.updateAvailable,
        expires: device.expires,
      }))

      return jsonResponse(req, {
        devices: transformedDevices,
        ...(debug ? { debug: { requestId, action, status: response.status } } : {}),
      })
    }

    if (action === 'audit-logs') {
      // Fetch audit logs - need to use the admin API
      // Note: Audit logs require a Tailscale plan that supports them
      const params = new URLSearchParams({ stream: 'audit' })
      // Default to last 7 days if no start date provided
      const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      params.set('start', body.start || defaultStart)
      if (body.end) params.set('end', body.end)
      if (body.cursor) params.set('cursor', body.cursor)
      const response = await fetch(`${baseUrl}/logs?${params.toString()}`, { headers })
      
      if (!response.ok) {
        const errorPayload = await readResponseBody(response)
        console.error('[tailscale-api] Tailscale audit API error:', response.status, errorPayload)
        return jsonError(
          req,
          502,
          'upstream_error',
          response.status === 403 || response.status === 404
            ? 'Audit logs unavailable on current Tailscale plan.'
            : 'Tailscale API error',
          {
            requestId,
            action,
            upstreamStatus: response.status,
            upstreamBody: errorPayload,
          }
        )
      }

      // Parse JSONL response (one JSON object per line)
      const text = await response.text()
      const events: TailscaleAuditEvent[] = text
        .split('\n')
        .filter(line => line.trim())
        .slice(0, 50) // Limit to last 50 events
        .map(line => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .filter(Boolean)

      // Transform to our format
      const transformedEvents = events.map((event: TailscaleAuditEvent) => ({
        id: event.eventId,
        type: mapEventType(event.eventType),
        timestamp: event.eventTime,
        device: event.origin?.nodeName || event.target?.name || 'Unknown',
        os: 'Unknown',
        ip: event.origin?.nodeIP || '',
        location: 'Via Tailnet',
        source: 'tailnet' as const,
        eventType: event.eventType,
        actor: event.actor?.displayName || event.actor?.loginName || 'System',
      }))

      return jsonResponse(req, {
        events: transformedEvents,
        ...(debug ? { debug: { requestId, action, status: response.status } } : {}),
      })
    }

    if (action === 'keys') {
      // Fetch auth keys
      const response = await fetch(`${baseUrl}/keys`, { headers })
      
      if (!response.ok) {
        const errorPayload = await readResponseBody(response)
        console.error('[tailscale-api] Tailscale keys API error:', response.status, errorPayload)
        return jsonError(req, 502, 'upstream_error', 'Tailscale API error', {
          requestId,
          action,
          upstreamStatus: response.status,
          upstreamBody: errorPayload,
        })
      }

      const data = await response.json()
      const keys = data.keys || []

      // Transform to highlight expiring keys
      const transformedKeys = keys.map((key: any) => ({
        id: key.id,
        description: key.description || 'Auth Key',
        created: key.created,
        expires: key.expires,
        lastUsed: key.lastUsed,
        reusable: key.capabilities?.devices?.create?.reusable || false,
        ephemeral: key.capabilities?.devices?.create?.ephemeral || false,
        tags: key.capabilities?.devices?.create?.tags || [],
      }))

      return jsonResponse(req, {
        keys: transformedKeys,
        ...(debug ? { debug: { requestId, action, status: response.status } } : {}),
      })
    }

    if (action === 'acls') {
      // Fetch ACL policy for security health check
      const response = await fetch(`${baseUrl}/acl`, { headers })
      
      if (!response.ok) {
        return jsonResponse(req, { acl: null, message: 'Could not fetch ACL' })
      }

      const data = await response.json()
      return jsonResponse(req, { acl: data })
    }

    return jsonError(req, 422, 'invalid_action', 'Invalid action', {
      requestId,
      action,
    })

  } catch (error) {
    console.error('[tailscale-api] Edge function error:', error)
    return jsonError(req, 500, 'internal_error', 'Unexpected server error', {
      requestId,
      error: error instanceof Error ? error.message : error,
    })
  }
})

function mapEventType(eventType: string): 'login' | 'logout' | 'failed' | 'refresh' {
  if (eventType.includes('login') || eventType.includes('auth')) return 'login'
  if (eventType.includes('logout') || eventType.includes('disconnect')) return 'logout'
  if (eventType.includes('fail') || eventType.includes('deny') || eventType.includes('reject')) return 'failed'
  return 'refresh'
}

function jsonError(
  req: Request,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
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
      },
    }
  )
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    const response = await fetch(url, options)
    if (response.ok || i === retries || ![502, 503, 504].includes(response.status)) {
      return response
    }
    console.log(`[tailscale-api] Retrying (${i + 1}/${retries}) after ${response.status}...`)
    await new Promise(r => setTimeout(r, 500 * Math.pow(2, i)))
  }
  return fetch(url, options)
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
