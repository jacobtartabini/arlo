import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  RefreshCw, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Fixed user ID for Tailscale-authenticated single-user app
const TAILSCALE_USER_ID = 'tailscale-user';

interface CalendarIntegration {
  id: string;
  provider: string;
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_error: string | null;
  ical_url?: string;
}

export default function CalendarIntegrations() {
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outlookUrl, setOutlookUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadIntegrations();

    // Check for Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_callback') === 'true') {
      const code = params.get('code');
      const state = params.get('state');
      
      if (code && state) {
        handleGoogleCallback(code, state);
      }
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_integrations')
        .select('*')
        .eq('user_id', TAILSCALE_USER_ID);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleCallback = async (code: string, state: string) => {
    setIsConnecting(prev => ({ ...prev, google: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'exchange_code', code, state, userId: TAILSCALE_USER_ID },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Google Calendar connected successfully');
      
      // Trigger initial sync
      await syncCalendar('google');
      loadIntegrations();
    } catch (error: any) {
      toast.error('Failed to connect Google Calendar: ' + error.message);
    } finally {
      setIsConnecting(prev => ({ ...prev, google: false }));
    }
  };

  const connectGoogle = async () => {
    setIsConnecting(prev => ({ ...prev, google: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'get_auth_url', userId: TAILSCALE_USER_ID },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast.error('Failed to start Google connection: ' + error.message);
      setIsConnecting(prev => ({ ...prev, google: false }));
    }
  };

  const disconnectGoogle = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-auth', {
        body: { action: 'disconnect', userId: TAILSCALE_USER_ID },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Google Calendar disconnected');
      loadIntegrations();
    } catch (error: any) {
      toast.error('Failed to disconnect: ' + error.message);
    }
  };

  const connectOutlook = async () => {
    if (!outlookUrl.trim()) {
      toast.error('Please enter your Outlook iCal URL');
      return;
    }

    setIsConnecting(prev => ({ ...prev, outlook: true }));

    try {
      const { data, error } = await supabase.functions.invoke('outlook-ical', {
        body: { action: 'connect', icalUrl: outlookUrl.trim(), userId: TAILSCALE_USER_ID },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Outlook Calendar connected successfully');
      setOutlookUrl('');
      
      // Trigger initial sync
      await syncCalendar('outlook_ics');
      loadIntegrations();
    } catch (error: any) {
      toast.error('Failed to connect Outlook: ' + error.message);
    } finally {
      setIsConnecting(prev => ({ ...prev, outlook: false }));
    }
  };

  const disconnectOutlook = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('outlook-ical', {
        body: { action: 'disconnect', userId: TAILSCALE_USER_ID },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Outlook Calendar disconnected');
      loadIntegrations();
    } catch (error: any) {
      toast.error('Failed to disconnect: ' + error.message);
    }
  };

  const syncCalendar = async (provider: string) => {
    setIsSyncing(prev => ({ ...prev, [provider]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('calendar-sync', {
        body: { 
          action: 'sync_provider', 
          provider,
          userId: TAILSCALE_USER_ID 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${provider === 'google' ? 'Google' : 'Outlook'} Calendar synced`);
      loadIntegrations();
    } catch (error: any) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(prev => ({ ...prev, [provider]: false }));
    }
  };

  const googleIntegration = integrations.find(i => i.provider === 'google');
  const outlookIntegration = integrations.find(i => i.provider === 'outlook_ics');

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <Card className="bg-background/40 backdrop-blur-md border border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Calendar Integrations
        </CardTitle>
        <CardDescription>
          Connect your calendars for unified availability and 2-way sync
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Calendar */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Google Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  2-way sync: Events sync both ways
                </p>
                {googleIntegration && (
                  <div className="flex items-center gap-2 mt-2">
                    {googleIntegration.last_sync_status === 'success' ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30">
                        <Check className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : googleIntegration.last_sync_status === 'error' ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending sync
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Last sync: {formatLastSync(googleIntegration.last_sync_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleIntegration ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => syncCalendar('google')}
                    disabled={isSyncing.google}
                  >
                    {isSyncing.google ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnectGoogle}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={connectGoogle}
                  disabled={isConnecting.google}
                >
                  {isConnecting.google ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Outlook iCal */}
        <div className="p-4 rounded-lg bg-muted/20 border border-border/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0078d4] flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M21.5 2h-19A2.5 2.5 0 000 4.5v15A2.5 2.5 0 002.5 22h19a2.5 2.5 0 002.5-2.5v-15A2.5 2.5 0 0021.5 2zM8 17.5a5.5 5.5 0 115.5-5.5A5.51 5.51 0 018 17.5zm0-9a3.5 3.5 0 103.5 3.5A3.5 3.5 0 008 8.5z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Outlook Calendar</h3>
                <p className="text-sm text-muted-foreground">
                  Read-only: Import via iCal feed URL
                </p>
                {outlookIntegration && (
                  <div className="flex items-center gap-2 mt-2">
                    {outlookIntegration.last_sync_status === 'success' ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30">
                        <Check className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : outlookIntegration.last_sync_status === 'error' ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Pending sync
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Last sync: {formatLastSync(outlookIntegration.last_sync_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {outlookIntegration ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => syncCalendar('outlook_ics')}
                    disabled={isSyncing.outlook_ics}
                  >
                    {isSyncing.outlook_ics ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnectOutlook}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          {!outlookIntegration && (
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="outlook-url" className="text-sm">
                  Private iCal subscription URL
                </Label>
                <Input
                  id="outlook-url"
                  placeholder="https://outlook.live.com/owa/calendar/..."
                  value={outlookUrl}
                  onChange={(e) => setOutlookUrl(e.target.value)}
                  className="bg-background/60"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Outlook → Settings → Calendar → Shared calendars → Publish a calendar
                </p>
              </div>
              <Button
                size="sm"
                onClick={connectOutlook}
                disabled={isConnecting.outlook || !outlookUrl.trim()}
              >
                {isConnecting.outlook ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Connect Outlook
              </Button>
            </div>
          )}
        </div>

        {/* Sync All */}
        {(googleIntegration || outlookIntegration) && (
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              if (googleIntegration) await syncCalendar('google');
              if (outlookIntegration) await syncCalendar('outlook_ics');
            }}
            disabled={isSyncing.google || isSyncing.outlook_ics}
          >
            {(isSyncing.google || isSyncing.outlook_ics) ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync All Calendars
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
