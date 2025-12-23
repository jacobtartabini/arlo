/**
 * Data API client for server-side database operations.
 * All database operations go through the edge function which uses the service role key.
 * Tailscale verification is passed via header.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

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
 * Check if user is Tailscale-verified from session storage
 */
function isTailscaleVerified(): boolean {
  if (typeof window === 'undefined') return false;
  
  const verified = sessionStorage.getItem('arlo_access_verified') === 'true';
  const expiry = sessionStorage.getItem('arlo_access_verified_expiry');
  const isValid = expiry && Date.now() < parseInt(expiry);
  
  return verified && !!isValid;
}

/**
 * Call the data-api edge function
 */
export async function dataApi<T = unknown>(request: DataApiRequest): Promise<DataApiResponse<T>> {
  if (!isTailscaleVerified()) {
    return { error: { message: 'Tailscale authentication required' } };
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/data-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tailscale-verified': 'true',
      },
      body: JSON.stringify(request),
    });

    const result = await response.json();

    if (!response.ok) {
      return { error: result.error || { message: 'Request failed' } };
    }

    return { data: result.data };
  } catch (error) {
    console.error('[dataApi] Error:', error);
    return { error: { message: error instanceof Error ? error.message : 'Network error' } };
  }
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
