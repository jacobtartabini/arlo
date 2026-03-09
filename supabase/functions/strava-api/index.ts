import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  errorResponse,
} from '../_shared/arloAuth.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const STRAVA_API = 'https://www.strava.com/api/v3'
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
}

async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_at: number
} | null> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('STRAVA_CLIENT_ID'),
      client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    console.error('[strava-api] Token refresh failed:', res.status, await res.text())
    return null
  }
  return await res.json()
}

async function getValidToken(userKey: string): Promise<string | null> {
  const sb = getSupabaseAdmin()
  const { data: conn } = await sb
    .from('strava_connections')
    .select('*')
    .eq('user_key', userKey)
    .single()

  if (!conn) return null

  const now = Math.floor(Date.now() / 1000)
  const expiresAt = conn.token_expires_at
    ? Math.floor(new Date(conn.token_expires_at).getTime() / 1000)
    : 0

  // Token still valid (with 60s buffer)
  if (conn.access_token && expiresAt > now + 60) {
    return conn.access_token
  }

  // Refresh needed
  if (!conn.refresh_token) return null
  const refreshed = await refreshStravaToken(conn.refresh_token)
  if (!refreshed) return null

  // Save new tokens
  await sb
    .from('strava_connections')
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token,
      token_expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_key', userKey)

  return refreshed.access_token
}

async function stravaFetch(token: string, path: string, params?: Record<string, string>) {
  const url = new URL(`${STRAVA_API}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Strava API ${res.status}: ${text}`)
  }
  return await res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsOptions(req)

  try {
    const originError = validateOrigin(req)
    if (originError) return originError

    if (req.method !== 'POST') {
      return errorResponse(req, 'Method not allowed', 405)
    }

    let body: { action: string; code?: string; per_page?: number; page?: number }
    try {
      body = await req.json()
    } catch {
      return errorResponse(req, 'Invalid JSON', 422)
    }

    const { action } = body

    // OAuth callback — exchange code for tokens (no auth required for this step)
    if (action === 'exchange-token') {
      const authResult = await verifyArloJWT(req)
      if (!authResult.authenticated) {
        return errorResponse(req, authResult.error || 'Unauthorized', 401)
      }

      if (!body.code) {
        return errorResponse(req, 'Authorization code required', 422)
      }

      const tokenRes = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: Deno.env.get('STRAVA_CLIENT_ID'),
          client_secret: Deno.env.get('STRAVA_CLIENT_SECRET'),
          code: body.code,
          grant_type: 'authorization_code',
        }),
      })

      if (!tokenRes.ok) {
        const err = await tokenRes.text()
        console.error('[strava-api] Token exchange failed:', err)
        return errorResponse(req, 'Strava token exchange failed', 502)
      }

      const tokenData = await tokenRes.json()
      const sb = getSupabaseAdmin()

      // Upsert connection
      const { error: dbErr } = await sb
        .from('strava_connections')
        .upsert({
          user_key: authResult.userId,
          strava_athlete_id: String(tokenData.athlete?.id || ''),
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
          athlete_name: `${tokenData.athlete?.firstname || ''} ${tokenData.athlete?.lastname || ''}`.trim(),
          athlete_avatar: tokenData.athlete?.profile || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_key' })

      if (dbErr) {
        console.error('[strava-api] DB upsert error:', dbErr)
        return errorResponse(req, 'Failed to save connection', 500)
      }

      return jsonResponse(req, {
        connected: true,
        athlete: {
          name: `${tokenData.athlete?.firstname || ''} ${tokenData.athlete?.lastname || ''}`.trim(),
          avatar: tokenData.athlete?.profile,
        },
      })
    }

    // All other actions require auth + active connection
    const authResult = await verifyArloJWT(req)
    if (!authResult.authenticated) {
      return errorResponse(req, authResult.error || 'Unauthorized', 401)
    }

    const userKey = authResult.userId

    if (action === 'status') {
      const sb = getSupabaseAdmin()
      const { data: conn } = await sb
        .from('strava_connections')
        .select('strava_athlete_id, athlete_name, athlete_avatar, created_at')
        .eq('user_key', userKey)
        .single()

      return jsonResponse(req, {
        connected: !!conn,
        athlete: conn ? {
          name: conn.athlete_name,
          avatar: conn.athlete_avatar,
          id: conn.strava_athlete_id,
        } : null,
      })
    }

    if (action === 'disconnect') {
      const sb = getSupabaseAdmin()
      await sb.from('strava_connections').delete().eq('user_key', userKey)
      return jsonResponse(req, { disconnected: true })
    }

    // Data actions — need valid token
    const token = await getValidToken(userKey)
    if (!token) {
      return jsonResponse(req, { connected: false, error: 'Not connected to Strava' }, 200)
    }

    if (action === 'activities') {
      const perPage = Math.min(body.per_page || 20, 50)
      const page = body.page || 1
      const activities = await stravaFetch(token, '/athlete/activities', {
        per_page: String(perPage),
        page: String(page),
      })

      const formatted = activities.map((a: any) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        sport_type: a.sport_type,
        distance: a.distance,
        moving_time: a.moving_time,
        elapsed_time: a.elapsed_time,
        total_elevation_gain: a.total_elevation_gain,
        start_date: a.start_date_local,
        average_speed: a.average_speed,
        max_speed: a.max_speed,
        average_heartrate: a.average_heartrate,
        max_heartrate: a.max_heartrate,
        calories: a.kilojoules ? Math.round(a.kilojoules * 0.239) : null,
        suffer_score: a.suffer_score,
        has_heartrate: a.has_heartrate,
        kudos_count: a.kudos_count,
        map_polyline: a.map?.summary_polyline || null,
      }))

      return jsonResponse(req, { activities: formatted })
    }

    if (action === 'stats') {
      // Get athlete stats
      const sb = getSupabaseAdmin()
      const { data: conn } = await sb
        .from('strava_connections')
        .select('strava_athlete_id')
        .eq('user_key', userKey)
        .single()

      if (!conn) return errorResponse(req, 'Connection not found', 404)

      const stats = await stravaFetch(token, `/athletes/${conn.strava_athlete_id}/stats`)
      return jsonResponse(req, {
        stats: {
          recent_runs: stats.recent_run_totals,
          recent_rides: stats.recent_ride_totals,
          recent_swims: stats.recent_swim_totals,
          ytd_runs: stats.ytd_run_totals,
          ytd_rides: stats.ytd_ride_totals,
          all_runs: stats.all_run_totals,
          all_rides: stats.all_ride_totals,
          biggest_ride_distance: stats.biggest_ride_distance,
          biggest_climb_elevation_gain: stats.biggest_climb_elevation_gain,
        },
      })
    }

    if (action === 'zones') {
      const zones = await stravaFetch(token, '/athlete/zones')
      return jsonResponse(req, { zones })
    }

    if (action === 'athlete') {
      const athlete = await stravaFetch(token, '/athlete')
      return jsonResponse(req, {
        athlete: {
          id: athlete.id,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          profile: athlete.profile,
          city: athlete.city,
          state: athlete.state,
          country: athlete.country,
          weight: athlete.weight,
          ftp: athlete.ftp,
        },
      })
    }

    return errorResponse(req, `Unknown action: ${action}`, 422)
  } catch (error) {
    console.error('[strava-api] Error:', error)
    return errorResponse(req, error instanceof Error ? error.message : 'Internal error', 500)
  }
})
