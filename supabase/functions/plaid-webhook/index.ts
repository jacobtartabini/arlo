/**
 * Plaid Webhook Handler
 * 
 * Receives webhooks from Plaid for:
 * - Transaction updates
 * - Account errors
 * - Item updates
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

async function plaidRequest(endpoint: string, body: Record<string, unknown>) {
  const clientId = Deno.env.get('PLAID_CLIENT_ID');
  const secret = Deno.env.get('PLAID_SECRET');
  
  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured');
  }

  const response = await fetch(`${PLAID_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret: secret,
      ...body,
    }),
  });

  return await response.json();
}

Deno.serve(async (req) => {
  // Plaid webhooks don't require authentication but should be verified
  // In production, you'd verify the webhook signature
  
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const webhook: PlaidWebhook = await req.json();
    console.log('[plaid-webhook] Received:', webhook.webhook_type, webhook.webhook_code);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the linked account for this item
    const { data: account } = await supabase
      .from('finance_linked_accounts')
      .select('*')
      .eq('plaid_item_id', webhook.item_id)
      .single();

    if (!account) {
      console.log('[plaid-webhook] No account found for item:', webhook.item_id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    switch (webhook.webhook_type) {
      case 'TRANSACTIONS': {
        switch (webhook.webhook_code) {
          case 'SYNC_UPDATES_AVAILABLE':
          case 'INITIAL_UPDATE':
          case 'HISTORICAL_UPDATE':
          case 'DEFAULT_UPDATE': {
            // Sync transactions
            const accessToken = decrypt(account.plaid_access_token);
            
            let hasMore = true;
            let cursor = account.sync_cursor || undefined;
            let totalAdded = 0;

            while (hasMore) {
              const syncData = await plaidRequest('/transactions/sync', {
                access_token: accessToken,
                cursor: cursor,
                count: 500,
              });

              // Process added transactions
              for (const tx of syncData.added || []) {
                await supabase
                  .from('finance_transactions')
                  .upsert({
                    user_key: account.user_key,
                    linked_account_id: account.id,
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

              // Process removed transactions
              for (const tx of syncData.removed || []) {
                await supabase
                  .from('finance_transactions')
                  .delete()
                  .eq('plaid_transaction_id', tx.transaction_id);
              }

              cursor = syncData.next_cursor;
              hasMore = syncData.has_more;
            }

            // Update cursor
            await supabase
              .from('finance_linked_accounts')
              .update({
                sync_cursor: cursor,
                last_synced_at: new Date().toISOString(),
              })
              .eq('id', account.id);

            console.log('[plaid-webhook] Synced', totalAdded, 'transactions');
            break;
          }

          case 'TRANSACTIONS_REMOVED': {
            // Remove specific transactions
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
            // Update account with error status
            await supabase
              .from('finance_linked_accounts')
              .update({
                error_code: webhook.error?.error_code,
                error_message: webhook.error?.error_message,
              })
              .eq('id', account.id);
            break;
          }

          case 'PENDING_EXPIRATION': {
            // Mark account as needing re-authentication
            await supabase
              .from('finance_linked_accounts')
              .update({
                error_code: 'PENDING_EXPIRATION',
                error_message: 'Account credentials will expire soon',
              })
              .eq('id', account.id);
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