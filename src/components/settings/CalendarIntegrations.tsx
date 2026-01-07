import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/arloAuth';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Calendar, 
  RefreshCw, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { toast } from 'sonner';

// NO MORE HARD-CODED USER ID - identity comes from JWT via AuthProvider

interface CalendarIntegration {
  id: string;
  provider: string;
  enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_error: string | null;
  ical_url?: string;
}

interface GoogleCalendar {
  id: string;
  name: string;
  color: string;
  primary: boolean;
  enabled: boolean;
}

// Helper to invoke edge functions with auth - no userId needed in body
async function invokeWithAuth(functionName: string, body: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  if (!headers) {
    throw new Error('Authentication required');
  }
  return supabase.functions.invoke(functionName, {
    body,
    headers: headers as Record<string, string>,
  });
}

interface CalendarIntegrationsProps {
  embedded?: boolean;
}

export default function CalendarIntegrations({ embedded = false }: CalendarIntegrationsProps) {
  const { identity } = useAuth();
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [outlookUrl, setOutlookUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [isConnecting, setIsConnecting] = useState<Record<string, boolean>>({});
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendar[]>([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);
  const [showCalendarSelector, setShowCalendarSelector] = useState(false);
  const [isSavingCalendars, setIsSavingCalendars] = useState(false);

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
      // Use the data-api which enforces user_id via JWT
      const { data, error } = await invokeWithAuth('data-api', {
        action: 'select',
        table: 'calendar_integrations',
      });

      if (error) throw error;
      setIntegrations(data?.data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load Google calendars list
  const loadGoogleCalendars = async (integrationId: string) => {
    setIsLoadingCalendars(true);
    try {
      // Server derives userId from JWT
      const { data, error } = await invokeWithAuth('google-calendar-auth', {
        action: 'list_calendars',
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Get saved selections from database using data-api (passes user_key header for RLS)
      const { data: selectionsData } = await invokeWithAuth('data-api', {
        action: 'select',
        table: 'google_calendar_selections',
        filters: { integration_id: integrationId },
      });

      const savedSelections = selectionsData?.data || [];
      const savedMap = new Map(savedSelections.map((s: any) => [s.calendar_id, s.enabled]));

      // Merge available calendars with saved selections
      const calendars: GoogleCalendar[] = (data?.calendars || []).map((cal: any) => ({
        id: cal.id,
        name: cal.name,
        color: cal.color,
        primary: cal.primary,
        enabled: savedMap.has(cal.id) ? savedMap.get(cal.id) : cal.primary,
      }));

      setGoogleCalendars(calendars);
      setShowCalendarSelector(true);
    } catch (error: any) {
      toast.error('Failed to load calendars: ' + error.message);
    } finally {
      setIsLoadingCalendars(false);
    }
  };

  // Save selected calendars
  const saveGoogleCalendars = async () => {
    const googleIntegration = integrations.find(i => i.provider === 'google');
    if (!googleIntegration) return;

    setIsSavingCalendars(true);
    try {
      const { data, error } = await invokeWithAuth('google-calendar-auth', {
        action: 'save_calendars',
        integrationId: googleIntegration.id,
        calendars: googleCalendars.filter(c => c.enabled).map(c => ({
          id: c.id,
          name: c.name,
          color: c.color,
          enabled: true,
        })),
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Calendar selections saved');
      setShowCalendarSelector(false);
      await syncCalendar('google');
    } catch (error: any) {
      toast.error('Failed to save calendars: ' + error.message);
    } finally {
      setIsSavingCalendars(false);
    }
  };

  const toggleCalendar = (calendarId: string) => {
    setGoogleCalendars(prev => 
      prev.map(cal => 
        cal.id === calendarId ? { ...cal, enabled: !cal.enabled } : cal
      )
    );
  };

  const handleGoogleCallback = async (code: string, state: string) => {
    setIsConnecting(prev => ({ ...prev, google: true }));
    
    try {
      // exchange_code now requires JWT auth with nonce validation
      const { data, error } = await invokeWithAuth('google-calendar-auth', {
        action: 'exchange_code', code, state,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Google Calendar connected successfully');
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
      const { data, error } = await invokeWithAuth('google-calendar-auth', {
        action: 'get_auth_url',
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
      const { data, error } = await invokeWithAuth('google-calendar-auth', {
        action: 'disconnect',
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
      const { data, error } = await invokeWithAuth('outlook-ical', {
        action: 'connect',
        icalUrl: outlookUrl.trim(),
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Outlook Calendar connected successfully');
      setOutlookUrl('');
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
      const { data, error } = await invokeWithAuth('outlook-ical', {
        action: 'disconnect',
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
      const { data, error } = await invokeWithAuth('calendar-sync', {
        action: 'sync_provider',
        provider,
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
    if (embedded) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      );
    }
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

  const content = (
    <div className="space-y-4">
        {/* Google Calendar */}
        <div className={`p-4 rounded-lg border ${googleIntegration ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-muted/20 border-border/20'}`}>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">Google Calendar</h3>
                  {googleIntegration && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-100 dark:bg-emerald-950/50">
                      <Check className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  2-way sync: Events sync both ways
                </p>
                {googleIntegration && (
                  <div className="flex items-center gap-2 mt-2">
                    {googleIntegration.last_sync_status === 'error' && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Sync Error
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
                    variant="outline"
                    size="sm"
                    onClick={() => loadGoogleCalendars(googleIntegration.id)}
                    disabled={isLoadingCalendars}
                    className="gap-1.5"
                  >
                    {isLoadingCalendars ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Settings2 className="w-4 h-4" />
                    )}
                    Calendars
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncCalendar('google')}
                    disabled={isSyncing.google}
                    className="gap-1.5"
                  >
                    {isSyncing.google ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sync
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
          
          {/* Calendar Selector */}
          {showCalendarSelector && googleIntegration && (
            <div className="mt-4 border-t border-border/20 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Select calendars to sync</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCalendarSelector(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {googleCalendars.map((cal) => (
                  <div
                    key={cal.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      id={`cal-${cal.id}`}
                      checked={cal.enabled}
                      onCheckedChange={() => toggleCalendar(cal.id)}
                    />
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cal.color }}
                    />
                    <Label
                      htmlFor={`cal-${cal.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {cal.name}
                      {cal.primary && (
                        <span className="text-xs text-muted-foreground ml-2">(Primary)</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCalendarSelector(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveGoogleCalendars}
                  disabled={isSavingCalendars}
                >
                  {isSavingCalendars && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Outlook Calendar */}
        <div className={`p-4 rounded-lg border ${outlookIntegration ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30' : 'bg-muted/20 border-border/20'}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 24 24" className="w-6 h-6">
                  <path fill="#0078D4" d="M21.17 3H7.83C6.82 3 6 3.82 6 4.83v14.34c0 1.01.82 1.83 1.83 1.83h13.34c1.01 0 1.83-.82 1.83-1.83V4.83C23 3.82 22.18 3 21.17 3z"/>
                  <path fill="#fff" d="M15.5 15H12v-4h3.5v4zm0-5H12V6h3.5v4zm4 5H16v-4h3.5v4zm0-5H16V6h3.5v4zm-8.5 5H7.5v-4H11v4zm0-5H7.5V6H11v4z" opacity=".8"/>
                  <path fill="#0078D4" d="M2 6h4v12H2z"/>
                  <path fill="#103262" d="M6 18H2a2 2 0 01-2-2V8a2 2 0 012-2h4v12z" opacity=".5"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground">Outlook Calendar</h3>
                  {outlookIntegration && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-100 dark:bg-emerald-950/50">
                      <Check className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Read-only: View events in Arlo
                </p>
                {outlookIntegration && (
                  <div className="flex items-center gap-2 mt-2">
                    {outlookIntegration.last_sync_status === 'error' && (
                      <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Sync Error
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
                    variant="outline"
                    size="sm"
                    onClick={() => syncCalendar('outlook_ics')}
                    disabled={isSyncing.outlook_ics}
                    className="gap-1.5"
                  >
                    {isSyncing.outlook_ics ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sync
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
          
          {/* Outlook Connect Form */}
          {!outlookIntegration && (
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="outlook-url" className="text-sm">
                  Outlook iCal URL
                </Label>
                <Input
                  id="outlook-url"
                  type="url"
                  placeholder="https://outlook.live.com/owa/calendar/..."
                  value={outlookUrl}
                  onChange={(e) => setOutlookUrl(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Outlook → Calendar → Settings → Shared calendars → Publish a calendar
                </p>
              </div>
              <Button
                size="sm"
                onClick={connectOutlook}
                disabled={isConnecting.outlook || !outlookUrl.trim()}
              >
                {isConnecting.outlook ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ExternalLink className="w-4 h-4 mr-2" />
                )}
                Connect
              </Button>
            </div>
          )}
        </div>

        {/* Info */}
        {!embedded && (
          <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Google Calendar:</strong> Full 2-way sync. Events created in Arlo appear in Google.</li>
              <li><strong>Outlook Calendar:</strong> Read-only. Outlook events show in Arlo but changes don't sync back.</li>
              <li>Calendars sync automatically every 60 seconds.</li>
            </ul>
          </div>
        )}
      </div>
  );

  if (embedded) {
    return content;
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
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
