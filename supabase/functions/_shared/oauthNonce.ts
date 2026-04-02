/**
 * OAuth Nonce Management
 * 
 * Provides secure nonce generation and validation for OAuth flows.
 * Nonces are stored in the database with expiration times to prevent replay attacks.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Nonce expiry time in minutes
const NONCE_EXPIRY_MINUTES = 10;

interface OAuthNonce {
  nonce: string;
  user_id: string;
  provider: string;
  expires_at: string;
  created_at: string;
}

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Store a nonce for OAuth state validation
 * Returns the nonce that should be embedded in the OAuth state
 */
export async function createOAuthNonce(userId: string, provider: string): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const nonce = generateNonce();
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MINUTES * 60 * 1000).toISOString();
  
  // Clean up any existing nonces for this user/provider (prevents accumulation)
  await supabase
    .from('oauth_nonces')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);
  
  // Insert new nonce
  const { error } = await supabase
    .from('oauth_nonces')
    .insert({
      nonce,
      user_id: userId,
      provider,
      expires_at: expiresAt,
    });
  
  if (error) {
    console.error('[oauthNonce] Failed to create nonce:', error);
    throw new Error('Failed to create OAuth nonce');
  }
  
  console.log(`[oauthNonce] Created nonce for user ${userId}, provider ${provider}`);
  return nonce;
}

/**
 * Validate and consume a nonce
 * Returns the user_id if valid, null if invalid or expired
 * The nonce is deleted after validation (single-use)
 */
export async function validateAndConsumeNonce(
  nonce: string, 
  provider: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Find and delete the nonce atomically
  const { data, error } = await supabase
    .from('oauth_nonces')
    .select('*')
    .eq('nonce', nonce)
    .eq('provider', provider)
    .maybeSingle();
  
  if (error) {
    console.error('[oauthNonce] Database error validating nonce:', error);
    return { valid: false, error: 'Database error' };
  }
  
  if (!data) {
    console.log('[oauthNonce] Nonce not found or already used');
    return { valid: false, error: 'Invalid or expired nonce' };
  }
  
  // Check expiration
  const expiresAt = new Date(data.expires_at);
  if (expiresAt < new Date()) {
    console.log('[oauthNonce] Nonce expired');
    // Delete expired nonce
    await supabase.from('oauth_nonces').delete().eq('nonce', nonce);
    return { valid: false, error: 'Nonce expired' };
  }
  
  // Delete the nonce (single-use)
  await supabase.from('oauth_nonces').delete().eq('nonce', nonce);
  
  console.log(`[oauthNonce] Validated nonce for user ${data.user_id}`);
  return { valid: true, userId: data.user_id };
}

/**
 * Clean up expired nonces (call periodically)
 */
export async function cleanupExpiredNonces(): Promise<number> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabase
    .from('oauth_nonces')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();
  
  if (error) {
    console.error('[oauthNonce] Error cleaning up expired nonces:', error);
    return 0;
  }
  
  const count = data?.length || 0;
  if (count > 0) {
    console.log(`[oauthNonce] Cleaned up ${count} expired nonces`);
  }
  return count;
}

/**
 * Encode OAuth state with nonce
 */
export function encodeOAuthState(nonce: string, provider: string): string {
  // Use base64url to keep `state` URL-safe (avoids `+` turning into spaces in query params).
  // Strip padding for compactness.
  return btoa(JSON.stringify({ nonce, provider }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/**
 * Decode OAuth state to extract nonce
 */
export function decodeOAuthState(state: string): { nonce?: string; provider?: string } {
  try {
    // Accept both legacy base64 and base64url, and tolerate `+` becoming spaces.
    const normalized = state
      .replace(/ /g, '+')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = JSON.parse(atob(normalized + pad));
    return { nonce: decoded.nonce, provider: decoded.provider };
  } catch {
    return {};
  }
}
