import { getAuthHeadersWithContentType } from '@/lib/arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_FUNCTIONS_BASE_URL = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1`;

export interface EdgeFunctionResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: unknown;
  message?: string;
}

async function parseEdgeFunctionBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  return text;
}

export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: unknown,
  options?: { requireAuth?: boolean }
): Promise<EdgeFunctionResult<T>> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (options?.requireAuth !== false) {
    const authHeaders = await getAuthHeadersWithContentType();
    if (!authHeaders) {
      return {
        ok: false,
        status: 401,
        message: 'Authentication required',
      };
    }
    Object.entries(authHeaders).forEach(([key, value]) => {
      if (value) headers.set(key, value as string);
    });
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/${functionName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const payload = await parseEdgeFunctionBody(response);

  if (!response.ok) {
    const fallbackMessage = response.status === 404
      ? `Edge Function "${functionName}" was not found (404). Deploy it to your Supabase project and verify VITE_SUPABASE_URL points to the correct project.`
      : 'Request failed';

    const message =
      typeof payload === 'string'
        ? payload
        : (payload as { error?: { message?: string } })?.error?.message || fallbackMessage;
    return {
      ok: false,
      status: response.status,
      error: payload,
      message,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: (payload as { data?: T })?.data ?? (payload as T),
  };
}
