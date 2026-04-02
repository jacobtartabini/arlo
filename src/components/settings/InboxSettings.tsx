import { useState, useEffect } from 'react';
import { 
  Mail, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Clock,
  MessageCircle,
  Users,
  Send,
  Instagram,
  Linkedin,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useInboxAccounts } from '@/hooks/useInboxPersistence';
import { useAuth } from '@/providers/AuthProvider';
import { PROVIDER_META, type InboxProvider, type InboxAccount } from '@/types/inbox';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { getAuthHeaders } from '@/lib/arloAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

function decodeOAuthStateFromQuery(state: string): { provider?: string } | null {
  try {
    // Support base64url + legacy base64 (and tolerate + turning into spaces).
    const normalized = state.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(normalized + pad)) as { provider?: string };
  } catch {
    return null;
  }
}

// Helper to invoke edge functions with auth (matches CalendarIntegrations pattern)
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

// Providers that have full OAuth implementation
const IMPLEMENTED_PROVIDERS: InboxProvider[] = ['gmail', 'outlook', 'teams'];

// Provider icon component
function ProviderIcon({ provider, className }: { provider: InboxProvider; className?: string }) {
  const meta = PROVIDER_META[provider];
  
  const iconMap: Record<string, React.ReactNode> = {
    Mail: <Mail className={className} />,
    Users: <Users className={className} />,
    MessageCircle: <MessageCircle className={className} />,
    Send: <Send className={className} />,
    Instagram: <Instagram className={className} />,
    Linkedin: <Linkedin className={className} />,
  };
  
  return (
    <div style={{ color: meta.color }}>
      {iconMap[meta.icon] || <Mail className={className} />}
    </div>
  );
}

// Integration card matching Calendar/Drive style
function IntegrationCard({
  provider,
  name,
  description,
  icon,
  isConnected,
  isConnecting,
  isAuthReady,
  onConnect,
}: {
  provider: InboxProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  isConnected: boolean;
  isConnecting: boolean;
  isAuthReady: boolean;
  onConnect: () => void;
}) {
  if (isConnected) return null; // Don't show if already connected (shows in connected accounts above)
  
  return (
    <div className="p-4 rounded-lg border bg-muted/20 border-border/20">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
            {icon}
          </div>
          <div>
            <h3 className="font-medium text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onConnect}
          disabled={isConnecting || !isAuthReady}
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ExternalLink className="w-4 h-4 mr-2" />
          )}
          Connect
        </Button>
      </div>
    </div>
  );
}
interface InboxSettingsProps {
  embedded?: boolean;
}

export default function InboxSettings({ embedded = false }: InboxSettingsProps) {
  const { userKey, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loading, refetch, disconnectAccount } = useInboxAccounts();
  const [connectingProvider, setConnectingProvider] = useState<InboxProvider | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  // Check for OAuth callback on mount (same pattern as CalendarIntegrations)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    // Check if this is an inbox OAuth callback by looking at the state
    // State format from inbox-connect includes provider info
    if (code && state) {
      const decoded = decodeOAuthStateFromQuery(state);
      if (decoded?.provider && ['gmail', 'outlook', 'teams'].includes(decoded.provider)) {
        handleInboxCallback(code, state);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Handle OAuth callback - exchange code for tokens with JWT auth
  const handleInboxCallback = async (code: string, state: string) => {
    setConnectingProvider('gmail'); // Show loading state
    
    try {
      const { data, error } = await invokeWithAuth('inbox-connect', {
        action: 'exchange_code',
        code,
        state,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Connected ${data.email || data.provider}`);
      await refetch();
      
      // Trigger initial sync for the newly connected account
      if (data.account_id) {
        toast.info('Starting initial sync...');
        try {
          await handleSync(data.account_id);
          toast.success('Messages synced successfully');
        } catch (syncErr) {
          console.error('Initial sync failed:', syncErr);
          toast.error('Connected but initial sync failed. Try syncing manually.');
        }
      }
    } catch (error: unknown) {
      toast.error('Failed to connect: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleConnect = async (provider: InboxProvider) => {
    // Ensure authentication is ready
    if (!isAuthenticated || !userKey) {
      toast.error('Authentication required. Please sign in to Aegis.');
      return;
    }
    
    // Check if provider is implemented
    if (!IMPLEMENTED_PROVIDERS.includes(provider)) {
      toast.info(`${PROVIDER_META[provider].name} integration is coming soon`);
      return;
    }
    
    setConnectingProvider(provider);
    
    try {
      // Use invokeWithAuth like CalendarIntegrations does
      const { data, error } = await invokeWithAuth('inbox-connect', { provider });

      if (error) {
        console.error('inbox-connect error:', error);
        throw new Error(error.message || 'Failed to initialize connection');
      }
      if (data?.error) throw new Error(data.error);
      
      if (data?.oauth_url) {
        // Redirect to OAuth flow (same tab like calendar integrations)
        window.location.href = data.oauth_url;
      } else if (data?.instructions) {
        // Show instructions for non-OAuth providers
        toast.info(data.instructions);
        setConnectingProvider(null);
      }
    } catch (err) {
      console.error('Connect error:', err);
      toast.error(err instanceof Error ? err.message : `Failed to connect ${PROVIDER_META[provider].name}`);
      setConnectingProvider(null);
    }
  };

  const handleSync = async (accountId: string) => {
    const { data, error } = await invokeWithAuth('inbox-sync', { 
      account_id: accountId, 
      sync_type: 'incremental' 
    });
    
    if (error) {
      console.error('Sync error:', error);
      throw new Error(error.message || 'Sync failed');
    }
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleSyncClick = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      await handleSync(accountId);
      toast.success('Messages synced successfully');
      refetch();
    } catch (error: unknown) {
      toast.error('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAccount(accountId);
  };
  // Show loading state while auth initializes
  if (authLoading) {
    if (embedded) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Show auth warning if not authenticated */}
      {!isAuthenticated && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            Authentication required. Please sign in to Aegis to connect inbox accounts.
          </p>
        </div>
      )}

        {/* Connected Accounts */}
        {accounts.map(account => {
          const meta = PROVIDER_META[account.provider];
          return (
            <div 
              key={account.id}
              className="p-4 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm">
                    <ProviderIcon provider={account.provider} className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{meta.name}</h3>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-100 dark:bg-emerald-950/50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.account_email || account.account_name}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {account.last_sync_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last sync: {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    {account.last_sync_error && (
                      <div className="flex items-center gap-1 mt-2">
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">
                          <XCircle className="w-3 h-3 mr-1" />
                          Sync Error
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSyncClick(account.id)}
                    disabled={syncingAccountId === account.id}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncingAccountId === account.id && "animate-spin")} />
                    {syncingAccountId === account.id ? 'Syncing...' : 'Sync'}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <X className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect {meta.name} account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the connection to {account.account_name}. 
                          Your messages will be deleted from Arlo, but your {meta.name} account will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDisconnect(account.id)}>
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}

        {/* Gmail Integration */}
        <IntegrationCard
          provider="gmail"
          name="Gmail"
          description="Read and send Gmail messages"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          }
          isConnected={accounts.some(a => a.provider === 'gmail')}
          isConnecting={connectingProvider === 'gmail'}
          isAuthReady={isAuthenticated && !!userKey}
          onConnect={() => handleConnect('gmail')}
        />

        {/* Outlook Integration */}
        <IntegrationCard
          provider="outlook"
          name="Outlook"
          description="Read and send Outlook emails"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.352.233-.578.233h-8.77v-6.761l1.983 1.478c.063.047.137.07.22.07.082 0 .156-.023.22-.07l6.163-4.593v-.001.59zm-.818-1.535H14.414l6.165 4.593c.094.063.156.07.22.07.064 0 .127-.007.22-.07l6.163-4.593v-.59c0-.064-.016-.126-.048-.185l-2.952 2.172-3.982-2.987z"/>
              <path fill="#0078D4" d="M0 6.912v10.176c0 .252.088.466.264.644.176.178.392.268.648.268h9.177V5.087l-9.177 1.23c-.512.068-.912.595-.912 1.595z"/>
              <path fill="#28A8EA" d="M10.09 18V6l7.09-1v13z"/>
              <path fill="#0078D4" d="M7.08 10.47c-.232-.35-.54-.525-.924-.525-.44 0-.805.162-1.096.486-.29.324-.436.764-.436 1.32 0 .58.142 1.03.426 1.35.284.32.657.48 1.118.48.372 0 .68-.168.924-.504v.444h1.32v-4.5H7.08v.45zM6.66 12.72c-.168.168-.378.252-.63.252-.252 0-.458-.084-.618-.252-.16-.168-.24-.408-.24-.72 0-.312.08-.556.24-.732.16-.176.366-.264.618-.264.252 0 .462.088.63.264.168.176.252.42.252.732 0 .312-.084.552-.252.72z"/>
            </svg>
          }
          isConnected={accounts.some(a => a.provider === 'outlook')}
          isConnecting={connectingProvider === 'outlook'}
          isAuthReady={isAuthenticated && !!userKey}
          onConnect={() => handleConnect('outlook')}
        />

        {/* Teams Integration */}
        <IntegrationCard
          provider="teams"
          name="Microsoft Teams"
          description="Read Teams chat messages"
          icon={
            <svg viewBox="0 0 24 24" className="w-6 h-6">
              <path fill="#5059C9" d="M19.2 7.2h-1.6c.8-.8 1.2-1.9 1.2-3.2 0-2.2-1.8-4-4-4-1.1 0-2.1.4-2.8 1.2V0h-8c-.6 0-1.2.3-1.6.8-.4.5-.6 1-.6 1.6v11.2c0 .6.2 1.1.6 1.6.4.5 1 .8 1.6.8h8V14h4.8c1.3 0 2.4-1.1 2.4-2.4V9.6c0-1.3-1.1-2.4-2-2.4z"/>
              <path fill="#7B83EB" d="M12 16h-8c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2z"/>
              <circle fill="#7B83EB" cx="17.6" cy="4" r="2.8"/>
              <path fill="#fff" d="M5.6 7.2h4.8v1.6H5.6zM5.6 10.4h4.8V12H5.6z"/>
            </svg>
          }
          isConnected={accounts.some(a => a.provider === 'teams')}
          isConnecting={connectingProvider === 'teams'}
          isAuthReady={isAuthenticated && !!userKey}
          onConnect={() => handleConnect('teams')}
        />

        {/* Coming Soon Providers */}
        <div className="pt-4 border-t border-border/20">
          <p className="text-sm text-muted-foreground mb-4">Coming Soon</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['whatsapp', 'telegram', 'instagram', 'linkedin'] as InboxProvider[]).map(provider => {
              const meta = PROVIDER_META[provider];
              return (
                <div 
                  key={provider}
                  className="p-3 rounded-lg border bg-muted/10 border-border/20 opacity-60"
                >
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={provider} className="h-4 w-4" />
                    <span className="text-sm font-medium">{meta.name}</span>
                  </div>
                </div>
              );
            })}
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
          <Mail className="h-5 w-5 text-primary" />
          Inbox Integrations
        </CardTitle>
        <CardDescription>
          Connect your email and messaging accounts for unified inbox access
        </CardDescription>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}
