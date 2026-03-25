import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { verifyArloJWT, handleCorsOptions, getCorsHeaders, validateOrigin } from '../_shared/arloAuth.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  const originError = validateOrigin(req);
  if (originError) return originError;

  try {
    // Verify JWT
    const authResult = await verifyArloJWT(req);
    if (!authResult.authenticated || !authResult.userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userKey = authResult.userId;
    const { text, voiceId, model } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Cartesia API key from voice_settings or fall back to environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: voiceSettings } = await supabase
      .from('voice_settings')
      .select('cartesia_api_key, cartesia_voice_id, cartesia_model')
      .eq('user_key', userKey)
      .single();

    // Use user's API key if set, otherwise use environment variable
    const cartesiaApiKey = voiceSettings?.cartesia_api_key || Deno.env.get('CARTESIA_API_KEY');
    
    if (!cartesiaApiKey) {
      return new Response(
        JSON.stringify({ error: 'Cartesia API key not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const finalVoiceId = voiceId || voiceSettings?.cartesia_voice_id || '41f3c367-e0a8-4a85-89e0-c27bae9c9b6d';
    const finalModel = model || voiceSettings?.cartesia_model || 'sonic-english';

    // Call Cartesia TTS API
    const cartesiaResponse = await fetch('https://api.cartesia.ai/tts/bytes', {
      method: 'POST',
      headers: {
        'X-API-Key': cartesiaApiKey,
        'Cartesia-Version': '2024-06-10',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: text,
        model_id: finalModel,
        voice: {
          mode: 'id',
          id: finalVoiceId,
        },
        output_format: {
          container: 'mp3',
          encoding: 'mp3',
          sample_rate: 44100,
        },
      }),
    });

    if (!cartesiaResponse.ok) {
      const errorText = await cartesiaResponse.text();
      console.error('[cartesia-tts] Cartesia API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'TTS generation failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the audio as binary
    const audioBuffer = await cartesiaResponse.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('[cartesia-tts] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
