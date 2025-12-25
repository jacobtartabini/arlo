import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    // Handle subscription storage
    if (action === 'subscribe') {
      const { user_id, platform, endpoint, p256dh, auth, user_agent } = body;
      
      console.log('Saving push subscription for user:', user_id);
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id,
          platform,
          endpoint,
          p256dh,
          auth,
          user_agent,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'endpoint',
        });

      if (error) {
        console.error('Error saving subscription:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to save subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle sending push notification
    const { user_id, notification_id, type, title, body: notifBody, data } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing notification for user:', user_id);

    // Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    const pushEnabled = prefs?.push_enabled ?? false;
    const typeToggles = prefs?.type_toggles ?? { system: true, chat: true, calendar: true, security: true };
    const notificationType = type || 'system';
    const typeEnabled = typeToggles[notificationType] !== false;

    // Create notification record in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        content: notifBody,
        type: notificationType,
        source: notificationType,
        action_data: data,
        read: false,
      })
      .select()
      .single();

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // If push is not enabled or VAPID keys not set, just return the notification
    if (!pushEnabled || !typeEnabled || !vapidPublicKey || !vapidPrivateKey) {
      console.log('Push disabled or not configured:', { pushEnabled, typeEnabled, hasVapid: !!vapidPublicKey });
      return new Response(
        JSON.stringify({ 
          success: true, 
          pushSent: false, 
          reason: !vapidPublicKey ? 'VAPID not configured' : 'Push disabled by user',
          notification_id: notification?.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ 
          success: true, 
          pushSent: false, 
          reason: 'No subscriptions',
          notification_id: notification?.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Note: Full Web Push with VAPID requires crypto operations not shown here
    // For production, use a library like web-push or implement full VAPID signing

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushSent: false,
        reason: 'Push delivery requires full VAPID implementation',
        subscriptionCount: subscriptions.length,
        notification_id: notification?.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Send push error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
