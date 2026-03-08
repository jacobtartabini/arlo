/**
 * Plaid API Edge Function
 * 
 * Handles:
 * - Creating link tokens for Plaid Link
 * - Exchanging public tokens for access tokens
 * - Syncing transactions
 * - Getting account balances
 * - Getting recurring transactions (subscriptions)
 * 
 * All Plaid secrets are kept server-side only.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from "../_shared/arloAuth.ts";
import { encrypt, decrypt } from "../_shared/encryption.ts";

const PLAID_BASE_URL = Deno.env.get('PLAID_ENV') === 'sandbox' 
  ? 'https://sandbox.plaid.com'
  : Deno.env.get('PLAID_ENV') === 'development'
    ? 'https://development.plaid.com'
    : 'https://production.plaid.com';

interface PlaidRequest {
  action?: 'create_link_token' | 'exchange_token' | 'exchange_public_token' | 'sync_transactions' | 'get_balances' | 'get_recurring' | 'remove_item';
  public_token?: string;
  account_id?: string;
  item_id?: string;
  metadata?: {
    institution?: {
      name?: string;
      institution_id?: string;
    };
  };
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

  const data = await response.json();
  
  if (!response.ok) {
    console.error('[plaid-api] Plaid error:', data);
    throw new Error(data.error_message || 'Plaid API error');
  }

  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  // Validate origin
  const originError = validateOrigin(req);
  if (originError) return originError;

  // Verify JWT
  const auth = await verifyArloJWT(req);
  if (!auth.authenticated) {
    return unauthorizedResponse(req, auth.error || 'Unauthorized');
  }

  const userKey = auth.userId;
  
  // Hash the userKey to a non-sensitive ID for Plaid (it rejects emails)
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(userKey));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const plaidUserId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const body: PlaidRequest = await req.json();
    const url = new URL(req.url);
    // Supabase may or may not include the function name in the path
    const pathname = url.pathname;
    const functionPathIndex = pathname.indexOf('/plaid-api');
    const subPath = functionPathIndex >= 0
      ? pathname.slice(functionPathIndex + '/plaid-api'.length)
      : pathname; // Use full pathname if function name not found (Supabase strips it)
    
    let pathAction: string | undefined;
    if (subPath === '/plaid/create_link_token' || subPath === '/create_link_token') {
      pathAction = 'create_link_token';
    } else if (subPath === '/plaid/exchange_public_token' || subPath === '/exchange_public_token') {
      pathAction = 'exchange_public_token';
    }
    
    const action = pathAction ?? body.action;
    console.log('[plaid-api] Resolved action:', action, 'pathname:', pathname, 'subPath:', subPath);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case 'create_link_token': {
        // Create a link token for Plaid Link
        const webhookUrl = Deno.env.get('PLAID_WEBHOOK_URL');
        const linkTokenPayload: Record<string, unknown> = {
          user: { client_user_id: plaidUserId },
          client_name: 'Arlo Finance',
          products: ['transactions'],
          country_codes: ['US'],
          language: 'en',
        };
        
        // Only include webhook if configured
        if (webhookUrl && webhookUrl.startsWith('https://')) {
          linkTokenPayload.webhook = webhookUrl;
        }
        
        const data = await plaidRequest('/link/token/create', linkTokenPayload);

        return jsonResponse(req, { link_token: data.link_token });
      }

      case 'exchange_token':
      case 'exchange_public_token': {
        // Exchange public token for access token
        if (!body.public_token) {
          return errorResponse(req, 'public_token required', 400);
        }

        const exchangeData = await plaidRequest('/item/public_token/exchange', {
          public_token: body.public_token,
        });

        const accessToken = exchangeData.access_token;
        const itemId = exchangeData.item_id;

        const metadataInstitution = body.metadata?.institution;
        const fallbackItemData = !metadataInstitution?.institution_id
          ? await plaidRequest('/item/get', { access_token: accessToken })
          : null;
        const institutionId = metadataInstitution?.institution_id ?? fallbackItemData?.item?.institution_id;
        
        // Get institution details
        let institutionName = 'Unknown Bank';
        let institutionLogo = null;
        try {
          if (institutionId) {
            const instData = await plaidRequest('/institutions/get_by_id', {
              institution_id: institutionId,
              country_codes: ['US'],
              options: { include_optional_metadata: true },
            });
            institutionName = instData.institution.name;
            institutionLogo = instData.institution.logo;
          } else if (metadataInstitution?.name) {
            institutionName = metadataInstitution.name;
          }
        } catch (e) {
          console.log('[plaid-api] Could not fetch institution details:', e);
        }

        // Get accounts
        const accountsData = await plaidRequest('/accounts/get', {
          access_token: accessToken,
        });

        // Encrypt and store access token
        const encryptedToken = encrypt(accessToken);

        // Store each account
        const accounts = accountsData.accounts;
        for (const account of accounts) {
          const { error } = await supabase
            .from('finance_linked_accounts')
            .upsert({
              user_key: userKey,
              plaid_item_id: itemId,
              plaid_access_token: encryptedToken,
              institution_id: institutionId,
              institution_name: institutionName,
              institution_logo: institutionLogo,
              account_mask: account.mask,
              account_name: account.name,
              account_type: account.type,
              account_subtype: account.subtype,
              current_balance: account.balances.current,
              available_balance: account.balances.available,
              currency: account.balances.iso_currency_code || 'USD',
              last_synced_at: new Date().toISOString(),
              is_active: true,
            }, { 
              onConflict: 'plaid_item_id',
              ignoreDuplicates: false 
            });

          if (error) {
            console.error('[plaid-api] Error storing account:', error);
          }
        }

        // Trigger initial transaction sync
        await syncTransactions(supabase, userKey, itemId, encryptedToken);

        return jsonResponse(req, { item_id: itemId });
      }

      case 'sync_transactions': {
        // Sync transactions for all linked accounts or specific item
        const { data: accounts, error } = await supabase
          .from('finance_linked_accounts')
          .select('*')
          .eq('user_key', userKey)
          .eq('is_active', true);

        if (error) {
          return errorResponse(req, 'Failed to fetch accounts', 500);
        }

        let totalSynced = 0;
        const results = [];

        for (const account of accounts || []) {
          if (body.item_id && account.plaid_item_id !== body.item_id) continue;

          try {
            const synced = await syncTransactions(
              supabase, 
              userKey, 
              account.plaid_item_id, 
              account.plaid_access_token,
              account.sync_cursor
            );
            totalSynced += synced.added;
            results.push({ 
              item_id: account.plaid_item_id, 
              added: synced.added,
              modified: synced.modified,
              removed: synced.removed,
            });
          } catch (e) {
            console.error('[plaid-api] Sync error for item:', account.plaid_item_id, e);
            results.push({ 
              item_id: account.plaid_item_id, 
              error: e instanceof Error ? e.message : 'Sync failed',
            });
          }
        }

        return jsonResponse(req, { 
          success: true, 
          total_synced: totalSynced,
          results,
        });
      }

      case 'get_balances': {
        // Get fresh balances for all accounts
        const { data: accounts, error } = await supabase
          .from('finance_linked_accounts')
          .select('*')
          .eq('user_key', userKey)
          .eq('is_active', true);

        if (error) {
          return errorResponse(req, 'Failed to fetch accounts', 500);
        }

        const results = [];

        for (const account of accounts || []) {
          try {
            const accessToken = decrypt(account.plaid_access_token);
            const balanceData = await plaidRequest('/accounts/balance/get', {
              access_token: accessToken,
            });

            for (const acc of balanceData.accounts) {
              await supabase
                .from('finance_linked_accounts')
                .update({
                  current_balance: acc.balances.current,
                  available_balance: acc.balances.available,
                  last_synced_at: new Date().toISOString(),
                })
                .eq('plaid_item_id', account.plaid_item_id);

              results.push({
                account_id: acc.account_id,
                name: acc.name,
                current: acc.balances.current,
                available: acc.balances.available,
              });
            }
          } catch (e) {
            console.error('[plaid-api] Balance error:', e);
          }
        }

        return jsonResponse(req, { success: true, accounts: results });
      }

      case 'get_recurring': {
        // Get recurring transactions (subscriptions)
        const { data: accounts, error } = await supabase
          .from('finance_linked_accounts')
          .select('*')
          .eq('user_key', userKey)
          .eq('is_active', true);

        if (error) {
          return errorResponse(req, 'Failed to fetch accounts', 500);
        }

        const allSubscriptions = [];

        for (const account of accounts || []) {
          try {
            const accessToken = decrypt(account.plaid_access_token);
            const recurringData = await plaidRequest('/transactions/recurring/get', {
              access_token: accessToken,
            });

            // Process inflow and outflow streams
            const streams = [
              ...recurringData.inflow_streams || [],
              ...recurringData.outflow_streams || [],
            ];

            for (const stream of streams) {
              // Upsert subscription
              const { error: upsertError } = await supabase
                .from('finance_subscriptions')
                .upsert({
                  user_key: userKey,
                  plaid_stream_id: stream.stream_id,
                  merchant_name: stream.merchant_name || stream.description,
                  amount: Math.abs(stream.average_amount.amount),
                  currency: stream.average_amount.iso_currency_code || 'USD',
                  frequency: stream.frequency,
                  next_billing_date: stream.predicted_next_date,
                  last_billing_date: stream.last_date,
                  first_billing_date: stream.first_date,
                  category: stream.personal_finance_category?.primary,
                  is_active: stream.is_active,
                  is_manual: false,
                  linked_account_id: account.id,
                }, {
                  onConflict: 'plaid_stream_id',
                  ignoreDuplicates: false,
                });

              if (upsertError) {
                console.error('[plaid-api] Subscription upsert error:', upsertError);
              }

              allSubscriptions.push({
                stream_id: stream.stream_id,
                merchant: stream.merchant_name || stream.description,
                amount: Math.abs(stream.average_amount.amount),
                frequency: stream.frequency,
                next_date: stream.predicted_next_date,
              });
            }
          } catch (e) {
            console.error('[plaid-api] Recurring error:', e);
          }
        }

        return jsonResponse(req, { 
          success: true, 
          subscriptions: allSubscriptions,
        });
      }

      case 'remove_item': {
        // Remove a linked account
        if (!body.item_id) {
          return errorResponse(req, 'item_id required', 400);
        }

        const { data: account } = await supabase
          .from('finance_linked_accounts')
          .select('plaid_access_token')
          .eq('user_key', userKey)
          .eq('plaid_item_id', body.item_id)
          .single();

        if (account) {
          try {
            const accessToken = decrypt(account.plaid_access_token);
            await plaidRequest('/item/remove', {
              access_token: accessToken,
            });
          } catch (e) {
            console.error('[plaid-api] Error removing from Plaid:', e);
          }
        }

        // Mark as inactive in our database
        await supabase
          .from('finance_linked_accounts')
          .update({ is_active: false })
          .eq('user_key', userKey)
          .eq('plaid_item_id', body.item_id);

        return jsonResponse(req, { success: true });
      }

      default:
        return errorResponse(req, `Unknown action: ${action}`, 400);
    }
  } catch (error) {
    console.error('[plaid-api] Error:', error);
    return errorResponse(req, error instanceof Error ? error.message : 'Internal error', 500);
  }
});

// Helper function to sync transactions
async function syncTransactions(
  supabase: ReturnType<typeof createClient>,
  userKey: string,
  itemId: string,
  encryptedToken: string,
  cursor?: string | null
) {
  const accessToken = decrypt(encryptedToken);
  
  let hasMore = true;
  let currentCursor = cursor || undefined;
  let added = 0;
  let modified = 0;
  let removed = 0;

  while (hasMore) {
    const syncData = await plaidRequest('/transactions/sync', {
      access_token: accessToken,
      cursor: currentCursor,
      count: 500,
    });

    // Get account ID for linking
    const { data: linkedAccount } = await supabase
      .from('finance_linked_accounts')
      .select('id')
      .eq('plaid_item_id', itemId)
      .single();

    // Process added transactions
    for (const tx of syncData.added || []) {
      const { error } = await supabase
        .from('finance_transactions')
        .upsert({
          user_key: userKey,
          linked_account_id: linkedAccount?.id,
          plaid_transaction_id: tx.transaction_id,
          amount: tx.amount, // Plaid: positive = expense, negative = income
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

      if (!error) added++;
    }

    // Process modified transactions
    for (const tx of syncData.modified || []) {
      await supabase
        .from('finance_transactions')
        .update({
          amount: tx.amount,
          name: tx.name,
          merchant_name: tx.merchant_name,
          category: tx.personal_finance_category?.primary,
          category_detailed: tx.personal_finance_category?.detailed,
          pending: tx.pending,
        })
        .eq('plaid_transaction_id', tx.transaction_id);
      modified++;
    }

    // Process removed transactions
    for (const tx of syncData.removed || []) {
      await supabase
        .from('finance_transactions')
        .delete()
        .eq('plaid_transaction_id', tx.transaction_id);
      removed++;
    }

    currentCursor = syncData.next_cursor;
    hasMore = syncData.has_more;
  }

  // Update cursor for next sync
  await supabase
    .from('finance_linked_accounts')
    .update({ 
      sync_cursor: currentCursor,
      last_synced_at: new Date().toISOString(),
    })
    .eq('plaid_item_id', itemId);

  return { added, modified, removed };
}
