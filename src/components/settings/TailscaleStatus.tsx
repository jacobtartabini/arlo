import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/arloAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type Status = 'idle' | 'checking' | 'ok' | 'error';

interface TailscaleStatusProps {
  embedded?: boolean;
}

/**
 * Tailscale connectivity panel.
 *
 * Pings the `tailscale-api` edge function with `action: 'devices'` and surfaces
 * the response as one of three states:
 *   - OK: API key valid + tailnet reachable (devices array returned)
 *   - Error: 401/403/404 from upstream → typically a missing/invalid key or tailnet
 *   - Unknown: network or unexpected failure
 */
export default function TailscaleStatus({ embedded = false }: TailscaleStatusProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkStatus = async () => {
    setStatus('checking');
    setMessage(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setStatus('error');
        setMessage('Authentication required');
        return;
      }
      const { data, error } = await supabase.functions.invoke('tailscale-api', {
        body: { action: 'devices' },
        headers: headers as Record<string, string>,
      });

      if (error) {
        setStatus('error');
        setMessage(error.message || 'Tailscale API unreachable');
        return;
      }

      if (data?.error) {
        const errMsg = typeof data.error === 'string' ? data.error : data.error.message;
        setStatus('error');
        setMessage(errMsg || 'Tailscale API returned an error');
        return;
      }

      const devices = Array.isArray(data?.devices) ? data.devices : [];
      setDeviceCount(devices.length);
      setStatus('ok');
      setMessage(null);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = (
    <div className="space-y-3">
      <div className="p-4 rounded-lg border bg-muted/20 border-border/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-foreground">Tailscale</h3>
                {status === 'ok' && (
                  <Badge
                    variant="outline"
                    className="text-emerald-600 border-emerald-600/30 bg-emerald-100 dark:bg-emerald-950/50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Reachable
                  </Badge>
                )}
                {status === 'error' && (
                  <Badge
                    variant="outline"
                    className="text-destructive border-destructive/30 bg-destructive/10"
                  >
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Unreachable
                  </Badge>
                )}
                {status === 'checking' && (
                  <Badge variant="outline">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Checking…
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {status === 'ok' && deviceCount !== null
                  ? `API key valid · ${deviceCount} device${deviceCount === 1 ? '' : 's'} in tailnet`
                  : status === 'error'
                  ? message ?? 'Check that TAILSCALE_API_KEY and TAILSCALE_TAILNET are configured.'
                  : 'Verifying Tailscale credentials…'}
              </p>
              {lastChecked && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last checked: {lastChecked.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={checkStatus}
            disabled={status === 'checking'}
            className="gap-1.5 shrink-0"
          >
            {status === 'checking' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Recheck
          </Button>
        </div>
      </div>
    </div>
  );

  if (embedded) return content;

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Services
        </CardTitle>
        <CardDescription>
          Verify connectivity to internal services like Tailscale.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
