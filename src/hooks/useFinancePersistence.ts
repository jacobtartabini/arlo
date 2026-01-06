/**
 * Finance persistence hook
 * Manages all finance data through the data-api edge function
 */

import { useCallback, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { getArloToken } from '@/lib/arloAuth';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface LinkedAccount {
  id: string;
  user_key: string;
  plaid_item_id: string;
  institution_id: string | null;
  institution_name: string;
  institution_logo: string | null;
  account_mask: string | null;
  account_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency: string;
  last_synced_at: string | null;
  error_code: string | null;
  error_message: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  user_key: string;
  linked_account_id: string | null;
  plaid_transaction_id: string | null;
  amount: number;
  currency: string;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string | null;
  category_detailed: string | null;
  pending: boolean;
  is_manual: boolean;
  notes: string | null;
  tags: string[] | null;
  receipt_file_id: string | null;
  project_id: string | null;
  task_id: string | null;
  location_city: string | null;
  location_state: string | null;
  payment_channel: string | null;
  is_recurring: boolean;
  recurring_stream_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Budget {
  id: string;
  user_key: string;
  category: string;
  amount: number;
  month: number;
  year: number;
  spent: number;
  carryover_enabled: boolean;
  carryover_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Subscription {
  id: string;
  user_key: string;
  plaid_stream_id: string | null;
  merchant_name: string;
  amount: number;
  currency: string;
  frequency: string;
  next_billing_date: string | null;
  last_billing_date: string | null;
  first_billing_date: string | null;
  category: string | null;
  is_active: boolean;
  is_manual: boolean;
  cancellation_date: string | null;
  cancellation_notes: string | null;
  price_increased: boolean;
  previous_amount: number | null;
  remind_before_days: number;
  website_url: string | null;
  notes: string | null;
  linked_account_id: string | null;
  created_at: string;
  updated_at: string;
}

interface GiftCard {
  id: string;
  user_key: string;
  merchant_name: string;
  initial_balance: number;
  current_balance: number;
  currency: string;
  card_number_last4: string | null;
  expiry_date: string | null;
  purchase_date: string | null;
  notes: string | null;
  photo_file_id: string | null;
  is_depleted: boolean;
  created_at: string;
  updated_at: string;
}

interface GiftCardUsage {
  id: string;
  user_key: string;
  gift_card_id: string;
  amount: number;
  description: string | null;
  used_at: string;
}

interface WatchlistItem {
  id: string;
  user_key: string;
  symbol: string;
  name: string | null;
  notes: string | null;
  target_price_high: number | null;
  target_price_low: number | null;
  alert_enabled: boolean;
  added_at: string;
}

interface PortfolioHolding {
  id: string;
  user_key: string;
  symbol: string;
  shares: number;
  average_cost: number | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface FinanceSettings {
  id: string;
  user_key: string;
  default_currency: string;
  fiscal_month_start: number;
  hide_balances: boolean;
  show_cents: boolean;
  created_at: string;
  updated_at: string;
}

export function useFinancePersistence() {
  const { userKey, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const getToken = useCallback(() => getArloToken(), []);

  const apiRequest = useCallback(async (
    action: string,
    table: string,
    data?: Record<string, unknown>,
    options?: { showErrors?: boolean }
  ) => {
    const token = getToken();
    if (!isAuthenticated || !token || !userKey) {
      console.log('[useFinancePersistence] Not authenticated');
      return null;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/data-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-key': userKey,
        },
        body: JSON.stringify({ action, table, ...data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`[useFinancePersistence] ${action} ${table} error:`, error);
      if (options?.showErrors !== false) {
        toast.error(error instanceof Error ? error.message : 'Failed to save data');
      }
      return null;
    }
  }, [getToken, userKey, isAuthenticated]);

  const plaidRequest = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    const token = getToken();
    if (!isAuthenticated || !token) {
      return null;
    }

    try {
      setLoading(true);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/plaid-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Plaid API error');
      }

      return await response.json();
    } catch (error) {
      console.error('[useFinancePersistence] Plaid error:', error);
      toast.error(error instanceof Error ? error.message : 'Plaid connection failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, [getToken, isAuthenticated]);

  const stocksRequest = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    const token = getToken();
    if (!isAuthenticated || !token) {
      return null;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/stocks-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Stocks API error');
      }

      return await response.json();
    } catch (error) {
      console.error('[useFinancePersistence] Stocks error:', error);
      return null;
    }
  }, [getToken, isAuthenticated]);

  // ==================== Linked Accounts ====================
  
  const getLinkedAccounts = useCallback(async (): Promise<LinkedAccount[]> => {
    const result = await apiRequest('list', 'finance_linked_accounts', {
      filters: { is_active: true },
      order: { column: 'institution_name', ascending: true },
    });
    return result?.data || [];
  }, [apiRequest]);

  const createLinkToken = useCallback(async () => {
    return await plaidRequest('create_link_token');
  }, [plaidRequest]);

  const exchangePublicToken = useCallback(async (publicToken: string) => {
    return await plaidRequest('exchange_token', { public_token: publicToken });
  }, [plaidRequest]);

  const syncTransactions = useCallback(async (itemId?: string) => {
    return await plaidRequest('sync_transactions', itemId ? { item_id: itemId } : {});
  }, [plaidRequest]);

  const refreshBalances = useCallback(async () => {
    return await plaidRequest('get_balances');
  }, [plaidRequest]);

  const syncRecurring = useCallback(async () => {
    return await plaidRequest('get_recurring');
  }, [plaidRequest]);

  const removeLinkedAccount = useCallback(async (itemId: string) => {
    return await plaidRequest('remove_item', { item_id: itemId });
  }, [plaidRequest]);

  // ==================== Transactions ====================

  const getTransactions = useCallback(async (options?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> => {
    const filters: Record<string, unknown> = {};
    if (options?.category) filters.category = options.category;
    
    const result = await apiRequest('list', 'finance_transactions', {
      filters,
      order: { column: 'date', ascending: false },
      limit: options?.limit || 100,
    });
    
    let transactions = result?.data || [];
    
    // Apply date filters client-side (data-api doesn't support range filters well)
    if (options?.startDate) {
      transactions = transactions.filter((t: Transaction) => t.date >= options.startDate!);
    }
    if (options?.endDate) {
      transactions = transactions.filter((t: Transaction) => t.date <= options.endDate!);
    }
    
    return transactions;
  }, [apiRequest]);

  const createTransaction = useCallback(async (transaction: Partial<Transaction>): Promise<Transaction | null> => {
    const result = await apiRequest('create', 'finance_transactions', {
      data: { ...transaction, is_manual: true },
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_transactions', {
      id,
      data: updates,
    });
    return !!result?.data;
  }, [apiRequest]);

  const deleteTransaction = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiRequest('delete', 'finance_transactions', { id });
    return result?.success;
  }, [apiRequest]);

  // ==================== Budgets ====================

  const getBudgets = useCallback(async (month: number, year: number): Promise<Budget[]> => {
    const result = await apiRequest('list', 'finance_budgets', {
      filters: { month, year },
      order: { column: 'category', ascending: true },
    });
    return result?.data || [];
  }, [apiRequest]);

  const createBudget = useCallback(async (budget: Partial<Budget>): Promise<Budget | null> => {
    const result = await apiRequest('create', 'finance_budgets', {
      data: budget,
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const upsertBudget = useCallback(async (budget: Partial<Budget>): Promise<Budget | null> => {
    const result = await apiRequest('upsert', 'finance_budgets', {
      data: budget,
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const deleteBudget = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiRequest('delete', 'finance_budgets', { id });
    return result?.success;
  }, [apiRequest]);

  // ==================== Subscriptions ====================

  const getSubscriptions = useCallback(async (activeOnly = true): Promise<Subscription[]> => {
    const filters: Record<string, unknown> = {};
    if (activeOnly) filters.is_active = true;
    
    const result = await apiRequest('list', 'finance_subscriptions', {
      filters,
      order: { column: 'next_billing_date', ascending: true },
    });
    return result?.data || [];
  }, [apiRequest]);

  const createSubscription = useCallback(async (subscription: Partial<Subscription>): Promise<Subscription | null> => {
    const result = await apiRequest('create', 'finance_subscriptions', {
      data: { ...subscription, is_manual: true },
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updateSubscription = useCallback(async (id: string, updates: Partial<Subscription>): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_subscriptions', {
      id,
      data: updates,
    });
    return !!result?.data;
  }, [apiRequest]);

  const cancelSubscription = useCallback(async (id: string, notes?: string): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_subscriptions', {
      id,
      data: {
        is_active: false,
        cancellation_date: new Date().toISOString().split('T')[0],
        cancellation_notes: notes,
      },
    });
    return !!result?.data;
  }, [apiRequest]);

  // ==================== Gift Cards ====================

  const getGiftCards = useCallback(async (includeEmpty = false): Promise<GiftCard[]> => {
    const filters: Record<string, unknown> = {};
    if (!includeEmpty) filters.is_depleted = false;
    
    const result = await apiRequest('list', 'finance_gift_cards', {
      filters,
      order: { column: 'merchant_name', ascending: true },
    });
    return result?.data || [];
  }, [apiRequest]);

  const createGiftCard = useCallback(async (card: Partial<GiftCard>): Promise<GiftCard | null> => {
    const result = await apiRequest('create', 'finance_gift_cards', {
      data: card,
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updateGiftCard = useCallback(async (id: string, updates: Partial<GiftCard>): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_gift_cards', {
      id,
      data: updates,
    });
    return !!result?.data;
  }, [apiRequest]);

  const useGiftCard = useCallback(async (cardId: string, amount: number, description?: string): Promise<boolean> => {
    // Create usage record
    await apiRequest('create', 'finance_gift_card_usage', {
      data: { gift_card_id: cardId, amount, description },
    });
    
    // Get current card
    const cards = await getGiftCards(true);
    const card = cards.find(c => c.id === cardId);
    if (!card) return false;
    
    // Update balance
    const newBalance = card.current_balance - amount;
    const result = await apiRequest('update', 'finance_gift_cards', {
      id: cardId,
      data: {
        current_balance: Math.max(0, newBalance),
        is_depleted: newBalance <= 0,
      },
    });
    
    return !!result?.data;
  }, [apiRequest, getGiftCards]);

  const getGiftCardUsage = useCallback(async (cardId: string): Promise<GiftCardUsage[]> => {
    const result = await apiRequest('list', 'finance_gift_card_usage', {
      filters: { gift_card_id: cardId },
      order: { column: 'used_at', ascending: false },
    });
    return result?.data || [];
  }, [apiRequest]);

  // ==================== Watchlist & Portfolio ====================

  const getWatchlist = useCallback(async (): Promise<WatchlistItem[]> => {
    const result = await apiRequest('list', 'finance_watchlist', {
      order: { column: 'added_at', ascending: false },
    });
    return result?.data || [];
  }, [apiRequest]);

  const addToWatchlist = useCallback(async (item: Partial<WatchlistItem>): Promise<WatchlistItem | null> => {
    const result = await apiRequest('create', 'finance_watchlist', {
      data: item,
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updateWatchlistItem = useCallback(async (id: string, updates: Partial<WatchlistItem>): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_watchlist', {
      id,
      data: updates,
    });
    return !!result?.data;
  }, [apiRequest]);

  const removeFromWatchlist = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiRequest('delete', 'finance_watchlist', { id });
    return result?.success;
  }, [apiRequest]);

  const getPortfolio = useCallback(async (): Promise<PortfolioHolding[]> => {
    const result = await apiRequest('list', 'finance_portfolio', {
      order: { column: 'symbol', ascending: true },
    });
    return result?.data || [];
  }, [apiRequest]);

  const addPortfolioHolding = useCallback(async (holding: Partial<PortfolioHolding>): Promise<PortfolioHolding | null> => {
    const result = await apiRequest('create', 'finance_portfolio', {
      data: holding,
    });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updatePortfolioHolding = useCallback(async (id: string, updates: Partial<PortfolioHolding>): Promise<boolean> => {
    const result = await apiRequest('update', 'finance_portfolio', {
      id,
      data: updates,
    });
    return !!result?.data;
  }, [apiRequest]);

  const deletePortfolioHolding = useCallback(async (id: string): Promise<boolean> => {
    const result = await apiRequest('delete', 'finance_portfolio', { id });
    return result?.success;
  }, [apiRequest]);

  // ==================== Stock Data ====================

  const getStockQuote = useCallback(async (symbol: string) => {
    return await stocksRequest('quote', { symbol });
  }, [stocksRequest]);

  const getBatchQuotes = useCallback(async (symbols: string[]) => {
    return await stocksRequest('batch_quote', { symbols });
  }, [stocksRequest]);

  const searchStocks = useCallback(async (query: string) => {
    return await stocksRequest('search', { query });
  }, [stocksRequest]);

  const getStockTimeSeries = useCallback(async (symbol: string, interval = '1day', outputsize = 30) => {
    return await stocksRequest('time_series', { symbol, interval, outputsize });
  }, [stocksRequest]);

  // ==================== Settings ====================

  const getSettings = useCallback(async (): Promise<FinanceSettings | null> => {
    const result = await apiRequest('list', 'finance_settings', {}, { showErrors: false });
    return result?.data?.[0] || null;
  }, [apiRequest]);

  const updateSettings = useCallback(async (settings: Partial<FinanceSettings>): Promise<boolean> => {
    const result = await apiRequest('upsert', 'finance_settings', {
      data: settings,
    });
    return !!result?.data;
  }, [apiRequest]);

  return {
    loading,
    // Raw API access for Plaid Link
    plaidRequest,
    stocksRequest,
    // Accounts
    getLinkedAccounts,
    createLinkToken,
    exchangePublicToken,
    syncTransactions,
    refreshBalances,
    syncRecurring,
    removeLinkedAccount,
    // Transactions
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    // Budgets
    getBudgets,
    createBudget,
    upsertBudget,
    deleteBudget,
    // Subscriptions
    getSubscriptions,
    createSubscription,
    updateSubscription,
    cancelSubscription,
    // Gift Cards
    getGiftCards,
    createGiftCard,
    updateGiftCard,
    useGiftCard,
    getGiftCardUsage,
    // Watchlist & Portfolio
    getWatchlist,
    addToWatchlist,
    updateWatchlistItem,
    removeFromWatchlist,
    getPortfolio,
    addPortfolioHolding,
    updatePortfolioHolding,
    deletePortfolioHolding,
    // Stock Data
    getStockQuote,
    getBatchQuotes,
    searchStocks,
    getStockTimeSeries,
    // Settings
    getSettings,
    updateSettings,
  };
}