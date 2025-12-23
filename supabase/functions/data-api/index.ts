import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tailscale-verified',
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Static user ID for Tailscale-authenticated users (single-user system)
const ARLO_USER_ID = 'arlo-tailscale-user'

interface RequestBody {
  action: string
  table: string
  data?: Record<string, unknown>
  id?: string
  filters?: Record<string, unknown>
  order?: { column: string; ascending?: boolean }
  limit?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify request is from an authenticated Tailscale session
    // The client includes this header to indicate Tailscale verification
    const tailscaleVerified = req.headers.get('x-tailscale-verified')
    
    if (tailscaleVerified !== 'true') {
      console.log('Request rejected: Missing Tailscale verification')
      return new Response(
        JSON.stringify({ error: 'Tailscale authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: RequestBody = await req.json()
    const { action, table, data, id, filters, order, limit } = body

    console.log(`[data-api] Action: ${action}, Table: ${table}`)

    // Allowed tables for security
    const allowedTables = [
      'notes', 'note_folders', 'tasks', 'habits', 'habit_logs',
      'calendar_events', 'booking_slots', 'notifications',
      'conversations', 'conversation_messages', 'user_settings'
    ]

    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let result: { data: unknown; error: unknown }

    switch (action) {
      case 'select': {
        let query = supabase.from(table).select('*')
        
        // Apply user_id filter automatically
        query = query.eq('user_id', ARLO_USER_ID)
        
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
          return new Response(
            JSON.stringify({ error: 'Data is required for insert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Inject user_id automatically
        const insertData = { ...data, user_id: ARLO_USER_ID }
        
        result = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()
        break
      }

      case 'update': {
        if (!id || !data) {
          return new Response(
            JSON.stringify({ error: 'ID and data are required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        result = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .eq('user_id', ARLO_USER_ID) // Ensure user owns the record
          .select()
          .single()
        break
      }

      case 'delete': {
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID is required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        result = await supabase
          .from(table)
          .delete()
          .eq('id', id)
          .eq('user_id', ARLO_USER_ID) // Ensure user owns the record
        break
      }

      case 'upsert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'Data is required for upsert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        // Inject user_id automatically
        const upsertData = { ...data, user_id: ARLO_USER_ID }
        
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
          .eq('user_id', ARLO_USER_ID)
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
          .eq('user_id', ARLO_USER_ID)
        
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
          return new Response(
            JSON.stringify({ error: 'Data and filters are required for update_where' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        let query = supabase
          .from(table)
          .update(data)
          .eq('user_id', ARLO_USER_ID)
        
        for (const [key, value] of Object.entries(filters)) {
          if (key !== 'user_id') {
            query = query.eq(key, value as string)
          }
        }
        
        result = await query
        break
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (result.error) {
      console.error(`[data-api] Error:`, result.error)
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ data: result.data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[data-api] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
