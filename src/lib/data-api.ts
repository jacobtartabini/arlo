/**
 * Data API client for server-side database operations.
 * All database operations go through the edge function which validates JWT tokens.
 */

import { getArloToken, isAuthenticated } from '@/lib/arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// Network timeout for data API requests (12 seconds)
const DATA_API_TIMEOUT_MS = 12 * 1000;

interface DataApiRequest {
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'select_with_in' | 'count' | 'update_where';
  table: string;
  data?: Record<string, unknown>;
  id?: string;
  filters?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

interface DataApiResponse<T = unknown> {
  data?: T;
  error?: { message: string; code?: string };
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call the data-api edge function with JWT authentication
 */
export async function dataApi<T = unknown>(request: DataApiRequest): Promise<DataApiResponse<T>> {
  // Get a valid token (will auto-refresh if needed)
  const token = await getArloToken();
  
  if (!token) {
    return { error: { message: 'Authentication required' } };
  }

  try {
    const response = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/data-api`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      },
      DATA_API_TIMEOUT_MS
    );

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || { message: 'Request failed' } };
    }

    return { data: result.data };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[dataApi] Request timed out');
      return { error: { message: 'Request timed out' } };
    }
    console.error('[dataApi] Error:', error);
    return { error: { message: error instanceof Error ? error.message : 'Network error' } };
  }
}

/**
 * Check if authenticated (for quick sync checks)
 */
export function isArloAuthenticated(): boolean {
  return isAuthenticated();
}

/**
 * Helper functions for common operations
 */
export const dataApiHelpers = {
  async select<T = unknown[]>(
    table: string,
    options?: {
      filters?: Record<string, unknown>;
      order?: { column: string; ascending?: boolean };
      limit?: number;
    }
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: 'select',
      table,
      ...options,
    });
    return {
      data: result.data ?? null,
      error: result.error?.message ?? null,
    };
  },

  async insert<T = unknown>(
    table: string,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: 'insert',
      table,
      data,
    });
    return {
      data: result.data ?? null,
      error: result.error?.message ?? null,
    };
  },

  async update<T = unknown>(
    table: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: 'update',
      table,
      id,
      data,
    });
    return {
      data: result.data ?? null,
      error: result.error?.message ?? null,
    };
  },

  async delete(
    table: string,
    id: string
  ): Promise<{ error: string | null }> {
    const result = await dataApi({
      action: 'delete',
      table,
      id,
    });
    return {
      error: result.error?.message ?? null,
    };
  },

  async upsert<T = unknown>(
    table: string,
    data: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: 'upsert',
      table,
      data,
    });
    return {
      data: result.data ?? null,
      error: result.error?.message ?? null,
    };
  },

  async selectWithIn<T = unknown[]>(
    table: string,
    column: string,
    values: string[],
    order?: { column: string; ascending?: boolean }
  ): Promise<{ data: T | null; error: string | null }> {
    const result = await dataApi<T>({
      action: 'select_with_in',
      table,
      filters: { column, values } as unknown as Record<string, unknown>,
      order,
    });
    return {
      data: result.data ?? null,
      error: result.error?.message ?? null,
    };
  },

  async count(
    table: string,
    filters?: Record<string, unknown>
  ): Promise<{ count: number; error: string | null }> {
    const result = await dataApi<{ count: number }>({
      action: 'count',
      table,
      filters,
    });
    return {
      count: result.data?.count ?? 0,
      error: result.error?.message ?? null,
    };
  },

  async updateWhere(
    table: string,
    filters: Record<string, unknown>,
    data: Record<string, unknown>
  ): Promise<{ error: string | null }> {
    const result = await dataApi({
      action: 'update_where',
      table,
      filters,
      data,
    });
    return {
      error: result.error?.message ?? null,
    };
  },
};
