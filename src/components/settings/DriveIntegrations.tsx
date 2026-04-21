import React, { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useFilesPersistence } from '@/hooks/useFilesPersistence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  HardDrive, 
  RefreshCw, 
  Check, 
  X, 
  ExternalLink,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DriveAccount } from '@/types/files';
import { formatFileSize } from '@/types/files';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/arloAuth';
import { parseSyncError } from '@/lib/integration-errors';

// Helper to invoke edge functions with auth (same pattern as CalendarIntegrations)
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

interface DriveIntegrationsProps {
  embedded?: boolean;
}

export default function DriveIntegrations({ embedded = false }: DriveIntegrationsProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    isLoading,
    listAccounts,
    disconnectAccount,
    syncFiles,
  } = useFilesPersistence();

  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});
  const [isDisconnecting, setIsDisconnecting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAccounts();
    }
    // OAuth callback handling is now centralized in /auth/oauth-callback (OAuthCallback.tsx).
    // After a successful exchange, that page redirects back to /settings?tab=drive&connected=google_drive.
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'google_drive') {
      toast.success('Google Drive connected');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [authLoading, isAuthenticated]);

  const loadAccounts = async () => {
    const data = await listAccounts();
    setAccounts(data);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await invokeWithAuth('drive-auth', { action: 'get_auth_url' });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      if (data?.oauth_url) {
        // Redirect to OAuth (same pattern as Calendar - full page redirect)
        window.location.href = data.oauth_url;
      } else {
        setIsConnecting(false);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Failed to start connection: ' + message);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setIsDisconnecting(prev => ({ ...prev, [accountId]: true }));
    try {
      const success = await disconnectAccount(accountId);
      if (success) {
        toast.success('Google Drive disconnected');
        loadAccounts();
      }
    } finally {
      setIsDisconnecting(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleSync = async (accountId: string) => {
    setIsSyncing(prev => ({ ...prev, [accountId]: true }));
    try {
      const count = await syncFiles(accountId);
      toast.success(`Synced ${count} files`);
      loadAccounts();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('Sync failed: ' + message);
    } finally {
      setIsSyncing(prev => ({ ...prev, [accountId]: false }));
    }
  };

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

  if (isLoading && accounts.length === 0) {
    if (embedded) {
      return <Skeleton className="h-20 w-full rounded-lg" />;
    }
    return (
      <Card className="bg-background/40 backdrop-blur-md border border-border/30">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Connected Accounts */}
      {accounts.map((account) => (
        <div 
          key={account.id}
          className="p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">Google Drive</h3>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-100 dark:bg-emerald-950/50">
                      <Check className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {account.account_email}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {account.storage_quota_used && account.storage_quota_total && (
                      <span>
                        {formatFileSize(account.storage_quota_used)} / {formatFileSize(account.storage_quota_total)} used
                      </span>
                    )}
                    <span>Last sync: {formatLastSync(account.last_sync_at)}</span>
                  </div>
                  {(() => {
                    const parsed = parseSyncError(account.last_sync_error);
                    if (!parsed) return null;
                    return (
                      <div className="flex items-center gap-1 mt-2">
                        {parsed.reconnectRequired ? (
                          <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-100 dark:bg-amber-950/50">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Reconnect required
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sync Error
                          </Badge>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {parseSyncError(account.last_sync_error)?.reconnectRequired && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="gap-1.5"
                  >
                    {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Reconnect
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSync(account.id)}
                  disabled={isSyncing[account.id]}
                  className="gap-1.5"
                >
                  {isSyncing[account.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Sync
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={isDisconnecting[account.id]}
                  className="text-destructive hover:text-destructive"
                >
                  {isDisconnecting[account.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add new Google Drive account */}
        <div className="p-4 rounded-lg border bg-muted/20 border-border/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <svg viewBox="0 0 87.3 78" className="w-6 h-6">
                  <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                  <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                  <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                  <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                  <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                  <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-foreground">Google Drive</h3>
                <p className="text-sm text-muted-foreground">
                  {accounts.length > 0 ? 'Connect another Google Drive account' : 'Connect your Google Drive to browse and link files'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : accounts.length > 0 ? (
                <Plus className="w-4 h-4 mr-2" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {accounts.length > 0 ? 'Add Account' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="bg-background/40 backdrop-blur-md border border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Cloud Storage
        </CardTitle>
        <CardDescription>
          Connect your cloud storage accounts to access files across all your drives
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
