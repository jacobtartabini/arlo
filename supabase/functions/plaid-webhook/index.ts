/**
 * Plaid Webhook Handler
 * 
 * Receives webhooks from Plaid for:
 * - Transaction updates
 * - Account errors
 * - Item updates
 * 
 * SECURITY: Verifies webhook signatures to prevent forged requests
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { decrypt } from "../_shared/encryption.ts";

const PLAID_BASE_URL = Deno.env.get('PLAID_ENV') === 'sandbox' 
  ? 'https://sandbox.plaid.com'
  : Deno.env.get('PLAID_ENV') === 'development'
    ? 'https://development.plaid.com'
    : 'https://production.plaid.com';

interface PlaidWebhook {
  webhook_type: string;
  webhook_code: string;
  item_id: string;
  error?: {
    error_code: string;
    error_message: string;
  };
  new_transactions?: number;
  removed_transactions?: string[];
}

interface JWKSet {
  keys: Array<{
    alg: string;
    created_at: number;
    crv: string;
    expired_at: number | null;
    kid: string;
    kty: string;
    use: string;
    x: string;
    y: string;
  }>;
}

let jwkCache: { keys: JWKSet; fetchedAt: number } | null = null;
const JWK_CACHE_TTL = 3600000;

async function getPlaidJWKS(): Promise<JWKSet> {
  if (jwkCache && Date.now() - jwkCache.fetchedAt < JWK_CACHE_TTL) {
    return jwkCache.keys;
  }

  const response = await fetch(`${PLAID_BASE_URL}/webhook_verification_key/get`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Deno.env.get('PLAID_CLIENT_ID'),
      secret: Deno.env.get('PLAID_SECRET'),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Plaid JWKS: ${response.status}`);
  }

  const data = await response.json();
  jwkCache = { keys: data, fetchedAt: Date.now() };
  return data;
}

async function importKey(jwk: JWKSet['keys'][0]): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function verifyPlaidWebhook(
  body: string,
  signedJwt: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const parts = signedJwt.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerJson);

    const kid = header.kid;
    if (!kid) {
      return { valid: false, error: 'Missing key ID in JWT header' };
    }

    // Fetch JWKS and find matching key
    let jwks = await getPlaidJWKS();
    let jwk = jwks.keys?.find((k) => k.kid === kid);
    if (!jwk) {
      // Clear cache and retry once
      jwkCache = null;
      jwks = await getPlaidJWKS();
      jwk = jwks.keys?.find((k) => k.kid === kid);
      if (!jwk) {
        return { valid: false, error: 'Key not found in JWKS' };
      }
    }

    // Check if key is expired
    if (jwk.expired_at && jwk.expired_at < Math.floor(Date.now() / 1000)) {
      return { valid: false, error: 'Signing key is expired' };
    }

    const key = await importKey(jwk);

    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      signedData
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Verify payload claims
    const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.iat && now - payload.iat > 300) {
      return { valid: false, error: 'JWT expired (older than 5 minutes)' };
    }

    // Verify body hash
    const data = new TextEncoder().encode(body);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const bodyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (payload.request_body_sha256 !== bodyHash) {
      return { valid: false, error: 'Body hash mismatch' };
    }

    return { valid: true };
  } catch (error) {
    console.error('[plaid-webhook] Verification error:', error);
    return { valid: false, error: 'Verification failed' };
  }
}

async function plaidApiRequest(endpoint: string, body: Record<string, unknown>) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  
  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured');
  }

  const response = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });

  return await response.json();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const rawBody = await req.text();
    const plaidSignature = req.headers.get('plaid-verification');
    
    if (!plaidSignature) {
      console.error('[plaid-webhook] Missing Plaid-Verification header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify the webhook signature - DO NOT process data if verification fails
    const verifyResult = await verifyPlaidWebhook(rawBody, plaidSignature);
    if (!verifyResult.valid) {
      console.error('[plaid-webhook] REJECTED - Invalid signature:', verifyResult.error);
      return new Response(JSON.stringify({ error: 'Invalid signature', detail: verifyResult.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const webhook: PlaidWebhook = JSON.parse(rawBody);
    console.log('[plaid-webhook] Verified webhook:', webhook.webhook_type, webhook.webhook_code);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ALL accounts for this item (there can be multiple)
    const { data: accounts } = await supabase
      .from('finance_linked_accounts')
      .select('*')
      .eq('plaid_item_id', webhook.item_id);

    if (!accounts || accounts.length === 0) {
      console.log('[plaid-webhook] No accounts found for item:', webhook.item_id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build account map for transaction mapping
    const accountMap = new Map<string, string>();
    for (const acc of accounts) {
      if (acc.plaid_account_id) {
        accountMap.set(acc.plaid_account_id, acc.id);
      }
    }

    // Use the first account's credentials (all share the same access token per item)
    const firstAccount = accounts[0];
    const userKey = firstAccount.user_key;

    switch (webhook.webhook_type) {
      case 'TRANSACTIONS': {
        switch (webhook.webhook_code) {
          case 'SYNC_UPDATES_AVAILABLE':
          case 'INITIAL_UPDATE':
          case 'HISTORICAL_UPDATE':
          case 'DEFAULT_UPDATE': {
            const accessToken = await decrypt(firstAccount.plaid_access_token);
            
            let hasMore = true;
            let cursor = firstAccount.sync_cursor || undefined;
            let totalAdded = 0;

            while (hasMore) {
              const syncData = await plaidApiRequest('/transactions/sync', {
                access_token: accessToken,
                cursor: cursor,
                count: 500,
              });

              for (const tx of syncData.added || []) {
                const linkedAccountId = accountMap.get(tx.account_id) || null;
                await supabase
                  .from('finance_transactions')
                  .upsert({
                    user_key: userKey,
                    linked_account_id: linkedAccountId,
                    plaid_transaction_id: tx.transaction_id,
                    amount: tx.amount,
                    currency: tx.iso_currency_code || 'USD',
                    date: tx.date,
                    name: tx.name,
                    merchant_name: tx.merchant_name,
                    category: tx.personal_finance_category?.primary,
                    category_detailed: tx.personal_finance_category?.detailed,
                    pending: tx.pending,
                    is_manual: false,
                    location_city: tx.location?.city,
                    location_state: tx.location?.region,
                    payment_channel: tx.payment_channel,
                  }, {
                    onConflict: 'plaid_transaction_id',
                    ignoreDuplicates: false,
                  });
                totalAdded++;
              }

              for (const tx of syncData.removed || []) {
                await supabase
                  .from('finance_transactions')
                  .delete()
                  .eq('plaid_transaction_id', tx.transaction_id);
              }

              cursor = syncData.next_cursor;
              hasMore = syncData.has_more;
            }

            // Update cursor on ALL accounts for this item
            await supabase
              .from('finance_linked_accounts')
              .update({
                sync_cursor: cursor,
                last_synced_at: new Date().toISOString(),
              })
              .eq('plaid_item_id', webhook.item_id);

            console.log('[plaid-webhook] Synced', totalAdded, 'transactions');
            break;
          }

          case 'TRANSACTIONS_REMOVED': {
            for (const txId of webhook.removed_transactions || []) {
              await supabase
                .from('finance_transactions')
                .delete()
                .eq('plaid_transaction_id', txId);
            }
            break;
          }
        }
        break;
      }

      case 'ITEM': {
        switch (webhook.webhook_code) {
          case 'ERROR': {
            // Update ALL accounts for this item with error
            await supabase
              .from('finance_linked_accounts')
              .update({
                error_code: webhook.error?.error_code,
                error_message: webhook.error?.error_message,
              })
              .eq('plaid_item_id', webhook.item_id);
            break;
          }

          case 'PENDING_EXPIRATION': {
            await supabase
              .from('finance_linked_accounts')
              .update({
                error_code: 'PENDING_EXPIRATION',
                error_message: 'Account credentials will expire soon',
              })
              .eq('plaid_item_id', webhook.item_id);
            break;
          }
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[plaid-webhook] Error:', error);
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
