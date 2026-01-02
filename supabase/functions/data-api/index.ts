import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  validateOrigin,
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'
import { encrypt, decrypt, isEncrypted } from '../_shared/encryption.ts'
import { checkAuthRateLimit, AUTH_RATE_LIMITS, logAuthFailure } from '../_shared/authRateLimit.ts'

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
  limit?: number
}

// Allowed tables for security - prevents arbitrary table access
const ALLOWED_TABLES = [
  'notes', 'note_folders', 'tasks', 'habits', 'habit_logs',
  'calendar_events', 'booking_slots', 'notifications',
  'conversations', 'conversation_messages', 'chat_folders', 'user_settings',
  'routines', 'user_progress', 'rewards', 'reward_redemptions', 'xp_events',
  'creation_projects', 'creation_assets', 'creation_scene_state',
  'calendar_integrations', 'calendar_integrations_safe', 'google_calendar_selections'
]

// Fields that should be encrypted when stored
const ENCRYPTED_FIELDS: Record<string, string[]> = {
  'user_settings': ['api_token']
}

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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  // Validate origin for non-preflight requests
  const originError = validateOrigin(req)
  if (originError) return originError

  try {
    // Rate limit data API requests
    const rateLimitResponse = checkAuthRateLimit(req, AUTH_RATE_LIMITS.dataApi)
    if (rateLimitResponse) return rateLimitResponse

    // Verify JWT authentication
    const authResult = await verifyArloJWT(req)
    
    if (!authResult.authenticated) {
      logAuthFailure(req, `data-api: ${authResult.error}`)
      console.log('[data-api] Authentication failed:', authResult.error)
      return unauthorizedResponse(req, authResult.error || 'Authentication required')
    }

    // userId is derived from JWT.sub - no ARLO_USER_ID used
    const userId = authResult.userId
    console.log('[data-api] Authenticated user (from JWT.sub):', userId)

    const body: RequestBody = await req.json()
    const { action, table, data, id, filters, order, limit } = body

    console.log(`[data-api] Action: ${action}, Table: ${table}`)

    // Validate table name against allowlist
    if (!ALLOWED_TABLES.includes(table)) {
      console.log(`[data-api] Table '${table}' not in allowlist`)
      return errorResponse(req, `Table '${table}' is not allowed`, 400)
    }

    let result: { data: unknown; error: unknown }

    switch (action) {
      case 'select': {
        let query = supabase.from(table).select('*')
        
        // Apply user_id filter automatically
        query = query.eq('user_id', userId)
        
        // Apply additional filters
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== 'user_id') { // Prevent user_id override
              query = query.eq(key, value as string)
            }
          }
        }
        
        // Apply ordering
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true })
        }
        
        // Apply limit
        if (limit) {
          query = query.limit(limit)
        }
        
        const queryResult = await query
        // Decrypt sensitive fields before returning
        result = {
          data: await decryptSensitiveFields(table, queryResult.data as Record<string, unknown>[] | null),
          error: queryResult.error
        }
        break
      }

      case 'insert': {
        if (!data) {
          return errorResponse(req, 'Data is required for insert', 400)
        }
        
        // Inject user_id automatically and encrypt sensitive fields
        const insertData = await encryptSensitiveFields(table, { ...data, user_id: userId })
        
        const insertResult = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()
        
        // Decrypt before returning
        result = {
          data: await decryptSensitiveFields(table, insertResult.data as Record<string, unknown> | null),
          error: insertResult.error
        }
        break
      }

      case 'update': {
        if (!id || !data) {
          return errorResponse(req, 'ID and data are required for update', 400)
        }
        
        // Encrypt sensitive fields before update
        const updateData = await encryptSensitiveFields(table, data)
        
        const updateResult = await supabase
          .from(table)
          .update(updateData)
          .eq('id', id)
          .eq('user_id', userId) // Ensure user owns the record
          .select()
          .single()
        
        // Decrypt before returning
        result = {
          data: await decryptSensitiveFields(table, updateResult.data as Record<string, unknown> | null),
          error: updateResult.error
        }
        break
      }

      case 'delete': {
        if (!id) {
          return errorResponse(req, 'ID is required for delete', 400)
        }
        
        result = await supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq('user_id', userId) // Ensure user owns the record
        break
      }

      case 'upsert': {
        if (!data) {
          return errorResponse(req, 'Data is required for upsert', 400)
        }
        
        // Inject user_id automatically and encrypt sensitive fields
        const upsertData = await encryptSensitiveFields(table, { ...data, user_id: userId })
        
        const upsertResult = await supabase
          .from(table)
          .upsert(upsertData)
          .select()
          .single()
        
        // Decrypt before returning
        result = {
          data: await decryptSensitiveFields(table, upsertResult.data as Record<string, unknown> | null),
          error: upsertResult.error
        }
        break
      }

      case 'select_with_in': {
        // For queries like fetching messages for multiple conversations
        const { column, values } = filters as { column: string; values: string[] }
        
        let query = supabase
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .in(column, values)
        
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true })
        }
        
        result = await query
        break
      }

      case 'count': {
        let query = supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            if (key !== 'user_id') {
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
          return errorResponse(req, 'Data and filters are required for update_where', 400)
        }
        
        let query = supabase
          .from(table)
          .update(data)
          .eq('user_id', userId)
        
        for (const [key, value] of Object.entries(filters)) {
          if (key !== 'user_id') {
            query = query.eq(key, value as string)
          }
        }
        
        result = await query
        break
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400)
    }

    if (result.error) {
      console.error(`[data-api] Error:`, result.error)
      return errorResponse(req, JSON.stringify(result.error), 500)
    }

    return jsonResponse(req, { data: result.data })

  } catch (error) {
    console.error('[data-api] Unexpected error:', error)
    return errorResponse(req, error instanceof Error ? error.message : 'Internal server error', 500)
  }
})
