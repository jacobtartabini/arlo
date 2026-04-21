import { getAuthHeadersWithContentType } from '@/lib/arloAuth';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
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

  // Supabase Edge Functions gateway expects API key headers for project routing.
  if (SUPABASE_PUBLISHABLE_KEY) {
    headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);

    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${SUPABASE_PUBLISHABLE_KEY}`);
    }
  }

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
    // Try to surface the real upstream error message first. Many edge functions
    // proxy 4xx/5xx responses from third-party APIs (e.g. Anthropic), so the
    // status code alone does NOT mean the function is missing.
    const payloadObj = (typeof payload === 'object' && payload !== null) ? payload as Record<string, unknown> : null;
    const payloadError = payloadObj?.error;
    const payloadMessage =
      typeof payloadError === 'string'
        ? payloadError
        : (payloadError && typeof payloadError === 'object' && 'message' in (payloadError as object))
          ? String((payloadError as { message?: unknown }).message ?? '')
          : typeof payloadObj?.message === 'string'
            ? (payloadObj.message as string)
            : '';

    const stringPayload = typeof payload === 'string' ? payload : '';

    // Only treat as "function not found" when the gateway itself returned a
    // 404 with no JSON body (i.e. the function really isn't deployed).
    const looksLikeMissingFunction =
      response.status === 404 && !payloadObj && !stringPayload.trim();

    const fallbackMessage = looksLikeMissingFunction
      ? `Edge Function "${functionName}" was not found (404). Deploy it to your Supabase project and verify VITE_SUPABASE_URL points to the correct project.`
      : `Request to "${functionName}" failed (${response.status})`;

    const message = payloadMessage || stringPayload || fallbackMessage;
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
