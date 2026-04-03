import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  getCorsHeaders,
} from '../_shared/arloAuth.ts'
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts'
import { checkRateLimit, getClientIP } from '../_shared/rateLimit.ts'
import { AUTH_RATE_LIMITS, logAuthFailure } from '../_shared/authRateLimit.ts'


// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface RequestBody {
  action: string
  table: string
  data?: Record<string, unknown>
  id?: string
  filters?: Record<string, unknown>
  order?: { column: string; ascending?: boolean }
  orderBy?: string
  orderDirection?: string
  limit?: number
}

// Allowed tables for security - prevents arbitrary table access
const ALLOWED_TABLES = [
  'notes', 'note_folders', 'tasks', 'habits', 'habit_logs',
  'calendar_events', 'booking_slots', 'notifications',
  'conversations', 'conversation_messages', 'chat_folders', 'user_settings',
  'routines', 'user_progress', 'rewards', 'reward_redemptions', 'xp_events',
  'creation_projects', 'creation_assets', 'creation_scene_state', 'lab_items',
  'calendar_integrations', 'calendar_integrations_safe', 'google_calendar_selections',
  'inbox_accounts', 'inbox_accounts_safe', 'inbox_threads', 'inbox_messages', 
  'inbox_drafts', 'inbox_sync_state',
  // Productivity system tables
  'projects', 'subtasks', 'time_blocks', 'project_links',
  // Travel system tables
  'trips', 'trip_destinations', 'trip_travelers', 'trip_itinerary_items',
  'trip_saved_places', 'trip_reservations', 'trip_expenses',
  'trip_flight_searches', 'trip_saved_flights',
  // Finance system tables
  'finance_linked_accounts', 'finance_transactions', 'finance_budgets',
  'finance_subscriptions', 'finance_gift_cards', 'finance_gift_card_usage',
  'finance_portfolio', 'finance_watchlist', 'finance_settings',
  // Voice system tables
  'voice_settings',
  // Maps system tables
  'map_recent_searches', 'map_user_settings', 'map_destination_patterns',
  'map_incidents', 'map_incident_votes'
]

// Fields that should be encrypted when stored
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  'user_settings': ['api_token']
}

const SENSITIVE_FIELDS: Record<string, string[]> = {
  'finance_linked_accounts': ['plaid_access_token']
}

// Tables that don't have user_key directly but use parent table references
// These tables need special handling - don't auto-filter by user_key
const PARENT_REF_TABLES: Record<string, { parentTable: string; foreignKey: string }> = {
  'google_calendar_selections': { parentTable: 'calendar_integrations', foreignKey: 'integration_id' }
}

// All user-facing tables now use user_key (TEXT) instead of user_id (UUID)
// This is the column name used for filtering by authenticated user
const USER_KEY_COLUMN = 'user_key'

// Helper to encrypt sensitive fields before insert/update
async function encryptSensitiveFields(
  table: string, 
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const fieldsToEncrypt = ENCRYPTED_FIELDS[table]
  if (!fieldsToEncrypt) return data
  
  const result = { ...data }
  for (const field of fieldsToEncrypt) {
    const value = result[field]
    if (typeof value === 'string' && value && !isEncrypted(value)) {
      result[field] = await encrypt(value)
    }
  }
  return result
}

// Helper to decrypt sensitive fields after select
async function decryptSensitiveFields(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[] | null
): Promise<Record<string, unknown> | Record<string, unknown>[] | null> {
  if (!data) return data
  
  const fieldsToDecrypt = ENCRYPTED_FIELDS[table]
  if (!fieldsToDecrypt) return data
  
  const decryptRecord = async (record: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const result = { ...record }
    for (const field of fieldsToDecrypt) {
      const value = result[field]
      if (typeof value === 'string' && isEncrypted(value)) {
        try {
          result[field] = await decrypt(value)
        } catch (e) {
          console.error(`[data-api] Failed to decrypt ${field}:`, e)
          // Return null for the field if decryption fails
          result[field] = null
        }
      }
    }
    return result
  }
  
  if (Array.isArray(data)) {
    return Promise.all(data.map(decryptRecord))
  }
  return decryptRecord(data)
}

function stripSensitiveFields(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[] | null
): Record<string, unknown> | Record<string, unknown>[] | null {
  if (!data) return data
  const fieldsToStrip = SENSITIVE_FIELDS[table]
  if (!fieldsToStrip?.length) return data
  const stripRecord = (record: Record<string, unknown>) => {
    const result = { ...record }
    for (const field of fieldsToStrip) {
      delete result[field]
    }
    return result
  }
  if (Array.isArray(data)) {
    return data.map(stripRecord)
  }
  return stripRecord(data)
}

interface ErrorDetails {
  [key: string]: unknown
}

const jsonError = (
  req: Request,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
): Response => {
  return jsonResponse(
    req,
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    status,
  )
}

const logRequest = (requestId: string, message: string, details?: Record<string, unknown>) => {
  const payload = {
    requestId,
    ...details,
  }
  console.log(`[data-api] ${message}`, payload)
}

/** creation_* / lab_items use user_id (Tailscale identity text) and project_id scoping — not user_key */
const CREATION_PROJECT_SCOPED_TABLES = new Set([
  'creation_assets',
  'creation_scene_state',
  'lab_items',
])

async function getCreationProjectIdsForUser(userKey: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('creation_projects')
    .select('id')
    .eq('user_id', userKey)
  if (error) {
    console.error('[data-api] getCreationProjectIdsForUser:', error)
    return []
  }
  return (data ?? []).map((r: { id: string }) => r.id)
}

async function userOwnsCreationProject(userKey: string, projectId: string): Promise<boolean> {
  const { data } = await supabase
    .from('creation_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userKey)
    .maybeSingle()
  return !!data
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const url = new URL(req.url)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  if (req.method !== 'POST') {
    logRequest(requestId, 'Method not allowed', { method: req.method, path: url.pathname })
    return jsonError(req, 405, 'method_not_allowed', 'Method not allowed', {
      allowed: ['POST'],
      requestId,
    })
  }

  // Validate origin for non-preflight requests
  const originError = validateOrigin(req)
  if (originError) return originError

  try {
    // Rate limit data API requests
    const clientIP = getClientIP(req)
    const rateLimitResult = checkRateLimit(clientIP, AUTH_RATE_LIMITS.dataApi)
    if (!rateLimitResult.allowed) {
      logRequest(requestId, 'Rate limited', { ip: clientIP, path: url.pathname })
      return new Response(
        JSON.stringify({
          error: {
            code: 'rate_limited',
            message: 'Too many requests. Please try again later.',
            details: {
              requestId,
              retryAfterSeconds: rateLimitResult.retryAfterSeconds,
            },
          },
        }),
        {
          status: 429,
          headers: {
            ...getCorsHeaders(req.headers.get('origin')),
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfterSeconds || 60),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimitResult.resetAt / 1000)),
          },
        }
      )
    }

    // Verify JWT authentication
    const authResult = await verifyArloJWT(req)
    
    if (!authResult.authenticated) {
      logAuthFailure(req, `data-api: ${authResult.error}`)
      logRequest(requestId, 'Authentication failed', { error: authResult.error, path: url.pathname })
      return jsonError(req, 401, 'unauthorized', authResult.error || 'Authentication required', {
        requestId,
      })
    }

    // userKey is derived from JWT.sub - this is the email or Tailscale identity (TEXT, not UUID)
    const userKey = authResult.userId
    logRequest(requestId, 'Authenticated request', { userKey, path: url.pathname })

    let body: RequestBody
    try {
      body = await req.json()
    } catch (error) {
      logRequest(requestId, 'Invalid JSON body', { error: error instanceof Error ? error.message : error })
      return jsonError(req, 422, 'invalid_json', 'Request body must be valid JSON', { requestId })
    }

    const { action, table, data, id, filters, order, limit } = body

    logRequest(requestId, 'Request received', { action, table, path: url.pathname })

    if (!action || !table) {
      const missing = [!action ? 'action' : null, !table ? 'table' : null].filter(Boolean)
      logRequest(requestId, 'Missing required fields', { missing })
      return jsonError(req, 422, 'missing_fields', 'Action and table are required.', {
        missing,
        requestId,
      })
    }

    // Validate table name against allowlist
    if (!ALLOWED_TABLES.includes(table)) {
      logRequest(requestId, 'Table not allowed', { table })
      return jsonError(req, 403, 'table_not_allowed', `Table '${table}' is not allowed`, {
        table,
        requestId,
      })
    }

    let result: { data: unknown; error: unknown }

    switch (action) {
      case 'list':
      case 'select': {
        let query = supabase.from(table).select('*')
        let scopedProjectFilter: string | undefined

        // Check if this table uses parent references instead of direct user_key
        const parentRef = PARENT_REF_TABLES[table]
        if (parentRef) {
          // For tables like google_calendar_selections, filter via parent table
          // First get the parent IDs that belong to this user
          const { data: parentData } = await supabase
            .from(parentRef.parentTable)
            .select('id')
            .eq(USER_KEY_COLUMN, userKey)
          
          const parentIds = (parentData || []).map((p: { id: string }) => p.id)
          if (parentIds.length === 0) {
            // User has no parent records, return empty
            result = { data: [], error: null }
            break
          }
          query = query.in(parentRef.foreignKey, parentIds)
        } else if (table === 'creation_projects') {
          query = query.eq('user_id', userKey)
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          if (projectIds.length === 0) {
            result = { data: [], error: null }
            break
          }
          scopedProjectFilter =
            filters && typeof filters.project_id === 'string' ? (filters.project_id as string) : undefined
          if (scopedProjectFilter) {
            if (!projectIds.includes(scopedProjectFilter)) {
              result = { data: [], error: null }
              break
            }
            query = query.eq('project_id', scopedProjectFilter)
          } else {
            query = query.in('project_id', projectIds)
          }
        } else {
          // Apply user_key filter automatically (TEXT column, not UUID)
          query = query.eq(USER_KEY_COLUMN, userKey)
        }
        
        // Apply additional filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key === USER_KEY_COLUMN || key === 'user_id') {
              continue
            }
            if (CREATION_PROJECT_SCOPED_TABLES.has(table) && key === 'project_id' && scopedProjectFilter) {
              continue
            }
            if (value === null) {
              query = query.is(key, null)
            } else {
              query = query.eq(key, value as string)
            }
          }
        }
        
        // Apply ordering - support both formats
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true })
        } else if (body.orderBy) {
          query = query.order(body.orderBy as string, { ascending: body.orderDirection !== 'desc' })
        }
        
        // Apply limit
        if (limit) {
          query = query.limit(limit)
        }
        
        const queryResult = await query
        // Decrypt sensitive fields before returning
        result = {
          data: stripSensitiveFields(
            table,
            await decryptSensitiveFields(table, queryResult.data as Record<string, unknown>[] | null)
          ),
          error: queryResult.error
        }
        break
      }

      case 'create':
      case 'insert': {
        if (!data) {
          logRequest(requestId, 'Missing data for insert')
          return jsonError(req, 422, 'missing_fields', 'Data is required for insert', {
            requestId,
          })
        }

        let insertPayload: Record<string, unknown> = { ...data, [USER_KEY_COLUMN]: userKey }

        if (table === 'creation_projects') {
          const d = data as Record<string, unknown>
          insertPayload = {
            ...d,
            user_id: typeof d.user_id === 'string' ? d.user_id : userKey,
          }
          delete insertPayload[USER_KEY_COLUMN]
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectId = (data as Record<string, unknown>).project_id as string | undefined
          if (!projectId || !(await userOwnsCreationProject(userKey, projectId))) {
            return jsonError(req, 403, 'forbidden', 'Invalid or inaccessible project', { requestId })
          }
          insertPayload = { ...data }
          delete insertPayload[USER_KEY_COLUMN]
        }

        const insertData = await encryptSensitiveFields(table, insertPayload)
        
        const insertResult = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()
        
        // Decrypt before returning
        result = {
          data: stripSensitiveFields(
            table,
            await decryptSensitiveFields(table, insertResult.data as Record<string, unknown> | null)
          ),
          error: insertResult.error
        }
        break
      }

      case 'update': {
        if (!id || !data) {
          const missing = [!id ? 'id' : null, !data ? 'data' : null].filter(Boolean)
          logRequest(requestId, 'Missing fields for update', { missing })
          return jsonError(req, 422, 'missing_fields', 'ID and data are required for update', {
            missing,
            requestId,
          })
        }
        
        // Encrypt sensitive fields before update
        const updateData = await encryptSensitiveFields(table, data)

        let updateResult: {
          data: Record<string, unknown> | null
          error: unknown
        }

        if (table === 'creation_projects') {
          updateResult = await supabase
            .from(table)
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userKey)
            .select()
            .single()
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          updateResult = await supabase
            .from(table)
            .update(updateData)
            .eq('id', id)
            .in('project_id', projectIds)
            .select()
            .single()
        } else {
          updateResult = await supabase
            .from(table)
            .update(updateData)
            .eq('id', id)
            .eq(USER_KEY_COLUMN, userKey)
            .select()
            .single()
        }
        
        // Decrypt before returning
        result = {
          data: stripSensitiveFields(
            table,
            await decryptSensitiveFields(table, updateResult.data as Record<string, unknown> | null)
          ),
          error: updateResult.error
        }
        break
      }

      case 'delete': {
        if (!id) {
          logRequest(requestId, 'Missing id for delete')
          return jsonError(req, 422, 'missing_fields', 'ID is required for delete', { requestId })
        }
        
        if (table === 'creation_projects') {
          result = await supabase.from(table).delete().eq('id', id).eq('user_id', userKey)
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          result = await supabase.from(table).delete().eq('id', id).in('project_id', projectIds)
        } else {
          result = await supabase.from(table).delete().eq('id', id).eq(USER_KEY_COLUMN, userKey)
        }
        break
      }

      case 'upsert': {
        if (!data) {
          logRequest(requestId, 'Missing data for upsert')
          return jsonError(req, 422, 'missing_fields', 'Data is required for upsert', {
            requestId,
          })
        }

        let upsertPayload: Record<string, unknown> = { ...data, [USER_KEY_COLUMN]: userKey }
        if (table === 'creation_projects') {
          const d = data as Record<string, unknown>
          upsertPayload = {
            ...d,
            user_id: typeof d.user_id === 'string' ? d.user_id : userKey,
          }
          delete upsertPayload[USER_KEY_COLUMN]
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectId = (data as Record<string, unknown>).project_id as string | undefined
          if (!projectId || !(await userOwnsCreationProject(userKey, projectId))) {
            return jsonError(req, 403, 'forbidden', 'Invalid or inaccessible project', { requestId })
          }
          upsertPayload = { ...data }
          delete upsertPayload[USER_KEY_COLUMN]
        }

        const upsertData = await encryptSensitiveFields(table, upsertPayload)
        
        const upsertResult = await supabase
          .from(table)
          .upsert(upsertData)
          .select()
          .single()
        
        // Decrypt before returning
        result = {
          data: stripSensitiveFields(
            table,
            await decryptSensitiveFields(table, upsertResult.data as Record<string, unknown> | null)
          ),
          error: upsertResult.error
        }
        break
      }

      case 'select_with_in': {
        // For queries like fetching messages for multiple conversations
        if (!filters) {
          logRequest(requestId, 'Missing filters for select_with_in')
          return jsonError(req, 422, 'missing_fields', 'Filters are required for select_with_in', {
            requestId,
          })
        }

        const { column, values } = filters as { column: string; values: string[] }
        if (!column || !values?.length) {
          logRequest(requestId, 'Invalid filters for select_with_in', { filters })
          return jsonError(req, 422, 'invalid_filters', 'Column and values are required for select_with_in', {
            requestId,
          })
        }
        
        let query = supabase.from(table).select('*').in(column, values)

        if (table === 'creation_projects') {
          query = query.eq('user_id', userKey)
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          if (projectIds.length === 0) {
            result = { data: [], error: null }
            break
          }
          query = query.in('project_id', projectIds)
        } else {
          query = query.eq(USER_KEY_COLUMN, userKey)
        }
        
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true })
        }
        
        result = await query
        break
      }

      case 'count': {
        let query = supabase.from(table).select('*', { count: 'exact', head: true })
        let countScopedProject: string | undefined

        if (table === 'creation_projects') {
          query = query.eq('user_id', userKey)
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          if (projectIds.length === 0) {
            result = { data: { count: 0 }, error: null }
            break
          }
          countScopedProject =
            filters && typeof filters.project_id === 'string' ? (filters.project_id as string) : undefined
          if (countScopedProject) {
            if (!projectIds.includes(countScopedProject)) {
              result = { data: { count: 0 }, error: null }
              break
            }
            query = query.eq('project_id', countScopedProject)
          } else {
            query = query.in('project_id', projectIds)
          }
        } else {
          query = query.eq(USER_KEY_COLUMN, userKey)
        }
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key === USER_KEY_COLUMN || key === 'user_id') {
              continue
            }
            if (CREATION_PROJECT_SCOPED_TABLES.has(table) && key === 'project_id' && countScopedProject) {
              continue
            }
            if (value === null) {
              query = query.is(key, null)
            } else {
              query = query.eq(key, value as string)
            }
          }
        }
        
        const { count, error } = await query
        result = { data: { count }, error }
        break
      }

      case 'update_where': {
        // Update multiple records based on filters
        if (!data || !filters) {
          const missing = [!data ? 'data' : null, !filters ? 'filters' : null].filter(Boolean)
          logRequest(requestId, 'Missing fields for update_where', { missing })
          return jsonError(req, 422, 'missing_fields', 'Data and filters are required for update_where', {
            missing,
            requestId,
          })
        }
        
        let query = supabase.from(table).update(data)

        if (table === 'creation_projects') {
          query = query.eq('user_id', userKey)
        } else if (CREATION_PROJECT_SCOPED_TABLES.has(table)) {
          const projectIds = await getCreationProjectIdsForUser(userKey)
          query = query.in('project_id', projectIds)
        } else {
          query = query.eq(USER_KEY_COLUMN, userKey)
        }
        
        for (const [key, value] of Object.entries(filters)) {
          if (key === USER_KEY_COLUMN || key === 'user_id') {
            continue
          }
          if (value === null) {
            query = query.is(key, null)
          } else {
            query = query.eq(key, value as string)
          }
        }
        
        result = await query
        break
      }

      default:
        logRequest(requestId, 'Unknown action', { action })
        return jsonError(req, 422, 'invalid_action', `Unknown action: ${action}`, {
          requestId,
        })
    }

    if (result.error) {
      console.error(`[data-api] Error:`, result.error)
      return jsonError(req, 500, 'database_error', 'Database request failed', {
        requestId,
        error: result.error,
      })
    }

    return jsonResponse(req, { data: result.data })

  } catch (error) {
    console.error('[data-api] Unexpected error:', error)
    return jsonError(req, 500, 'internal_error', 'Unexpected server error', {
      requestId,
      error: error instanceof Error ? error.message : error,
    })
  }
})
