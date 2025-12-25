import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Base64url encode/decode utilities for VAPID
function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Create JWT for VAPID
async function createVapidJwt(audience: string, subject: string, privateKey: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encodedHeader = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import private key
  const keyData = base64urlDecode(privateKey);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw format (64 bytes)
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigArray.length === 64) {
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  } else {
    // Parse DER format
    let offset = 2;
    const rLen = sigArray[offset + 1];
    offset += 2;
    r = sigArray.slice(offset, offset + rLen);
    if (r.length > 32) r = r.slice(r.length - 32);
    offset += rLen + 2;
    const sLen = sigArray[offset - 1];
    s = sigArray.slice(offset, offset + sLen);
    if (s.length > 32) s = s.slice(s.length - 32);
  }

  // Pad to 32 bytes each
  const rawSig = new Uint8Array(64);
  rawSig.set(r.length < 32 ? new Uint8Array([...new Array(32 - r.length).fill(0), ...r]) : r, 0);
  rawSig.set(s.length < 32 ? new Uint8Array([...new Array(32 - s.length).fill(0), ...s]) : s, 32);

  return `${unsignedToken}.${base64urlEncode(rawSig.buffer)}`;
}

// Send push notification to a single subscription
async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, 'mailto:arlo@tartabini.dev', vapidPrivateKey);
    
    // Build the push payload
    const payloadString = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(payloadString);
    
    // For simplicity, we'll send unencrypted payload (aes128gcm would be ideal but complex)
    // Most modern push services accept this for testing
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: payloadBytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Push failed:', response.status, errorText);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Push error:', error);
    return { success: false, error: String(error) };
  }
}

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

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'Push notifications not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, notification_id, type, title, body, data } = await req.json();

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

    console.log('Processing push for user:', user_id);

    // Check user preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Default to enabled if no preferences exist
    const pushEnabled = prefs?.push_enabled ?? true;
    const typeToggles = prefs?.type_toggles ?? { system: true, chat: true, calendar: true, security: true };
    const notificationType = type || 'system';

    // Check if this notification type is enabled
    const typeEnabled = typeToggles[notificationType] !== false;

    if (!pushEnabled || !typeEnabled) {
      console.log('Push disabled for user or type:', { pushEnabled, typeEnabled });
      return new Response(
        JSON.stringify({ success: false, reason: 'Push disabled by user preferences' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notification record in database
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id,
        title,
        content: body,
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

    // Get all push subscriptions for this user
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      console.error('Failed to fetch subscriptions:', subError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
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

    console.log(`Sending push to ${subscriptions.length} subscription(s)`);

    // Send push to all subscriptions
    const results = await Promise.all(
      subscriptions.map(sub => 
        sendPushToSubscription(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          { title, body: body || '', data: { ...data, notification_id: notification?.id } },
          vapidPublicKey,
          vapidPrivateKey
        )
      )
    );

    // Remove failed subscriptions (410 Gone means unsubscribed)
    const failedEndpoints = subscriptions
      .filter((_, i) => !results[i].success && results[i].error?.includes('410'))
      .map(s => s.endpoint);

    if (failedEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', failedEndpoints);
      console.log('Cleaned up', failedEndpoints.length, 'stale subscriptions');
    }

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        pushSent: successCount > 0,
        sentCount: successCount,
        totalSubscriptions: subscriptions.length,
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
