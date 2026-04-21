import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/arloAuth';
import { toast } from 'sonner';

/**
 * Unified OAuth callback dispatcher.
 *
 * All provider OAuth flows (Google Calendar, Google Drive, Gmail, Outlook, Teams)
 * redirect to /auth/oauth-callback. We decode the `state` param to identify which
 * edge function should perform the code exchange, then route the user back to
 * /settings with the correct tab selected.
 *
 * State payload format produced by the edge functions:
 *   base64url(JSON({ nonce, provider }))
 * where `provider` is one of:
 *   'google'        → calendar
 *   'google_drive'  → drive
 *   'gmail'         → inbox (gmail)
 *   'outlook'       → inbox (outlook)
 *   'teams'         → inbox (teams)
 */

type ProviderKind = 'google' | 'google_drive' | 'gmail' | 'outlook' | 'teams';

interface DecodedState {
  nonce?: string;
  provider?: string;
}

function decodeState(raw: string): DecodedState | null {
  try {
    const normalized = raw.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(normalized + pad)) as DecodedState;
  } catch {
    return null;
  }
}

async function invokeWithAuth(functionName: string, body: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  if (!headers) throw new Error('Authentication required');
  return supabase.functions.invoke(functionName, {
    body,
    headers: headers as Record<string, string>,
  });
}

function dispatchTarget(provider: ProviderKind): { fn: string; tab: string; label: string } {
  switch (provider) {
    case 'google':
      return { fn: 'google-calendar-auth', tab: 'calendar', label: 'Google Calendar' };
    case 'google_drive':
      return { fn: 'drive-auth', tab: 'drive', label: 'Google Drive' };
    case 'gmail':
      return { fn: 'inbox-connect', tab: 'inbox', label: 'Gmail' };
    case 'outlook':
      return { fn: 'inbox-connect', tab: 'inbox', label: 'Outlook' };
    case 'teams':
      return { fn: 'inbox-connect', tab: 'inbox', label: 'Microsoft Teams' };
  }
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'working' | 'success' | 'error'>('working');
  const [message, setMessage] = useState('Completing connection…');
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');
    const errorDescription = params.get('error_description');

    // Provider returned an error (user denied, invalid client, etc.)
    if (oauthError) {
      const text = errorDescription || oauthError;
      setStatus('error');
      setMessage(text);
      toast.error(`Connection failed: ${text}`);
      const t = setTimeout(() => navigate('/settings', { replace: true }), 2000);
      return () => clearTimeout(t);
    }

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing authorization code or state.');
      const t = setTimeout(() => navigate('/settings', { replace: true }), 2000);
      return () => clearTimeout(t);
    }

    const decoded = decodeState(state);
    const provider = decoded?.provider as ProviderKind | undefined;

    if (!provider || !['google', 'google_drive', 'gmail', 'outlook', 'teams'].includes(provider)) {
      setStatus('error');
      setMessage('Unrecognized OAuth provider in state.');
      const t = setTimeout(() => navigate('/settings', { replace: true }), 2000);
      return () => clearTimeout(t);
    }

    const target = dispatchTarget(provider);

    (async () => {
      try {
        setMessage(`Connecting ${target.label}…`);
        const { data, error } = await invokeWithAuth(target.fn, {
          action: 'exchange_code',
          code,
          state,
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setStatus('success');
        setMessage(`${target.label} connected.`);
        toast.success(`${target.label} connected`);
        // Hand back to settings with the right tab pre-selected.
        navigate(`/settings?tab=${target.tab}&connected=${provider}`, { replace: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setStatus('error');
        setMessage(msg);
        toast.error(`${target.label} connection failed: ${msg}`);
        const t = setTimeout(
          () => navigate(`/settings?tab=${target.tab}&error=${encodeURIComponent(msg)}`, { replace: true }),
          2500,
        );
        return () => clearTimeout(t);
      }
    })();
  }, [navigate]);

  const Icon = status === 'working' ? Loader2 : status === 'success' ? CheckCircle2 : AlertCircle;
  const iconColor =
    status === 'working' ? 'text-primary' : status === 'success' ? 'text-emerald-500' : 'text-destructive';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90 p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/20 mb-4 mx-auto">
          <Icon className={`w-8 h-8 ${iconColor} ${status === 'working' ? 'animate-spin' : ''}`} />
        </div>
        <p className="text-foreground font-medium">{message}</p>
        {status === 'error' && (
          <p className="text-muted-foreground text-sm mt-2">Returning you to Settings…</p>
        )}
      </div>
    </div>
  );
}
