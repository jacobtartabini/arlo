import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

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
  'creation_projects', 'creation_assets', 'creation_scene_state'
]

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req)
  }

  try {
    // Verify JWT authentication
    const authResult = await verifyArloJWT(req)
    
    if (!authResult.authenticated) {
      console.log('[data-api] Authentication failed:', authResult.error)
      return unauthorizedResponse(req, authResult.error || 'Authentication required')
    }

    const userId = authResult.userId
    console.log('[data-api] Authenticated user:', authResult.claims?.sub, 'userId:', userId)

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
        
        result = await query
        break
      }

      case 'insert': {
        if (!data) {
          return errorResponse(req, 'Data is required for insert', 400)
        }
        
        // Inject user_id automatically
        const insertData = { ...data, user_id: userId }
        
        result = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()
        break
      }

      case 'update': {
        if (!id || !data) {
          return errorResponse(req, 'ID and data are required for update', 400)
        }
        
        result = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .eq('user_id', userId) // Ensure user owns the record
          .select()
          .single()
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
        
        // Inject user_id automatically
        const upsertData = { ...data, user_id: userId }
        
        result = await supabase
          .from(table)
          .upsert(upsertData)
          .select()
          .single()
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
