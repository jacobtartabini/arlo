import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  verifyArloJWT, 
  handleCorsOptions, 
  jsonResponse, 
  unauthorizedResponse, 
  errorResponse 
} from '../_shared/arloAuth.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Verify JWT authentication
    const authResult = await verifyArloJWT(req);
    
    if (!authResult.authenticated) {
      console.log('[send-push] Authentication failed:', authResult.error);
      return unauthorizedResponse(req, authResult.error || 'Authentication required');
    }

    // userId is derived from JWT.sub - no ARLO_USER_ID used
    const userId = authResult.userId;
    console.log('[send-push] Authenticated user (from JWT.sub):', userId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action } = body;

    // Handle subscription storage
    if (action === 'subscribe') {
      const { platform, endpoint, p256dh, auth, user_agent } = body;
      
      console.log('Saving push subscription for user:', userId);
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
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
        return errorResponse(req, 'Failed to save subscription', 500);
      }

      return jsonResponse(req, { success: true });
    }

    // Handle sending push notification
    const { notification_id, type, title, body: notifBody, data } = body;

    if (!title) {
      return errorResponse(req, 'title is required', 400);
    }

    console.log('Processing notification for user:', userId);

    // Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    const pushEnabled = prefs?.push_enabled ?? false;
    const typeToggles = prefs?.type_toggles ?? { system: true, chat: true, calendar: true, security: true };
    const notificationType = type || 'system';
    const typeEnabled = typeToggles[notificationType] !== false;

    // Create notification record in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
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
      return jsonResponse(req, { 
        success: true, 
        pushSent: false, 
        reason: !vapidPublicKey ? 'VAPID not configured' : 'Push disabled by user',
        notification_id: notification?.id 
      });
    }

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError || !subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return jsonResponse(req, { 
        success: true, 
        pushSent: false, 
        reason: 'No subscriptions',
        notification_id: notification?.id 
      });
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user`);

    // Note: Full Web Push with VAPID requires crypto operations not shown here
    // For production, use a library like web-push or implement full VAPID signing

    return jsonResponse(req, { 
      success: true, 
      pushSent: false,
      reason: 'Push delivery requires full VAPID implementation',
      subscriptionCount: subscriptions.length,
      notification_id: notification?.id
    });

  } catch (error) {
    console.error('Send push error:', error);
    return errorResponse(req, String(error), 500);
  }
});
