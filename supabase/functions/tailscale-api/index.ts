import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  try {
    // Verify JWT authentication
    const authResult = await verifyArloJWT(req)
    
    if (!authResult.authenticated) {
      console.log('[tailscale-api] Authentication failed:', authResult.error)
      return unauthorizedResponse(req, authResult.error || 'Authentication required')
    }

    // userId is derived from JWT.sub - no ARLO_USER_ID used
    console.log('[tailscale-api] Authenticated user (from JWT.sub):', authResult.userId)

    const TAILSCALE_API_KEY = Deno.env.get('TAILSCALE_API_KEY')
    const TAILSCALE_TAILNET = Deno.env.get('TAILSCALE_TAILNET')

    if (!TAILSCALE_API_KEY) {
      return errorResponse(req, 'Tailscale API key not configured', 500)
    }

    if (!TAILSCALE_TAILNET) {
      return errorResponse(req, 'Tailscale tailnet not configured', 500)
    }

    const { action } = await req.json()
    const baseUrl = `https://api.tailscale.com/api/v2/tailnet/${TAILSCALE_TAILNET}`
    const headers = {
      'Authorization': `Bearer ${TAILSCALE_API_KEY}`,
      'Content-Type': 'application/json',
    }

    if (action === 'devices') {
      // Fetch devices from Tailscale API
      const response = await fetch(`${baseUrl}/devices`, { headers })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[tailscale-api] Tailscale API error:', response.status, errorText)
        return errorResponse(req, `Tailscale API error: ${response.status}`, response.status)
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

      return jsonResponse(req, { devices: transformedDevices })
    }

    if (action === 'audit-logs') {
      // Fetch audit logs - need to use the admin API
      // Note: Audit logs require a Tailscale plan that supports them
      const response = await fetch(`${baseUrl}/logs?stream=audit`, { headers })
      
      if (!response.ok) {
        // Audit logs may not be available on all plans
        if (response.status === 403 || response.status === 404) {
          return jsonResponse(req, { 
            events: [],
            message: 'Audit logs not available on current Tailscale plan'
          })
        }
        const errorText = await response.text()
        console.error('[tailscale-api] Tailscale audit API error:', response.status, errorText)
        return errorResponse(req, `Tailscale API error: ${response.status}`, response.status)
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

      return jsonResponse(req, { events: transformedEvents })
    }

    if (action === 'keys') {
      // Fetch auth keys
      const response = await fetch(`${baseUrl}/keys`, { headers })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[tailscale-api] Tailscale keys API error:', response.status, errorText)
        return errorResponse(req, `Tailscale API error: ${response.status}`, response.status)
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

      return jsonResponse(req, { keys: transformedKeys })
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

    return errorResponse(req, 'Invalid action', 400)

  } catch (error) {
    console.error('[tailscale-api] Edge function error:', error)
    return errorResponse(req, error instanceof Error ? error.message : 'Unknown error', 500)
  }
})

function mapEventType(eventType: string): 'login' | 'logout' | 'failed' | 'refresh' {
  if (eventType.includes('login') || eventType.includes('auth')) return 'login'
  if (eventType.includes('logout') || eventType.includes('disconnect')) return 'logout'
  if (eventType.includes('fail') || eventType.includes('deny') || eventType.includes('reject')) return 'failed'
  return 'refresh'
}
