import { useState } from 'react';
import { 
  Mail, 
  Plus, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  ExternalLink,
  Clock,
  MessageCircle,
  Users,
  Send,
  Instagram,
  Linkedin,
  Loader2
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
import { cn } from '@/lib/utils';
import { getAuthHeaders } from '@/lib/arloAuth';
import { supabase } from '@/integrations/supabase/client';

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

// Provider card for connecting new accounts
function ProviderCard({ 
  provider, 
  onConnect,
  isConnecting,
  existingAccounts,
  isAuthReady
}: { 
  provider: InboxProvider;
  onConnect: (provider: InboxProvider) => void;
  isConnecting: boolean;
  existingAccounts: InboxAccount[];
  isAuthReady: boolean;
}) {
  const meta = PROVIDER_META[provider];
  const accountsForProvider = existingAccounts.filter(a => a.provider === provider);
  const isImplemented = IMPLEMENTED_PROVIDERS.includes(provider);
  
  return (
    <Card className={cn("relative overflow-hidden", !isImplemented && "opacity-60")}>
      <div 
        className="absolute top-0 left-0 right-0 h-1" 
        style={{ backgroundColor: meta.color }} 
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={provider} className="h-6 w-6" />
            <div>
              <CardTitle className="text-base">{meta.name}</CardTitle>
              <CardDescription className="text-xs">
                {isImplemented 
                  ? `${accountsForProvider.length} account${accountsForProvider.length !== 1 ? 's' : ''} connected`
                  : 'Integration not yet available'
                }
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onConnect(provider)}
            disabled={isConnecting || !isImplemented || !isAuthReady}
            title={!isAuthReady ? 'Authentication required' : undefined}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : !isImplemented ? null : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {isConnecting ? 'Connecting...' : !isImplemented ? 'Coming soon' : 'Connect'}
          </Button>
        </div>
      </CardHeader>
      
      {meta.requiresBridge && isImplemented && (
        <CardContent className="pt-0">
          <Badge variant="secondary" className="text-xs">
            Requires business API or bridge
          </Badge>
        </CardContent>
      )}
      
      {!meta.supportsSend && isImplemented && (
        <CardContent className="pt-0">
          <Badge variant="outline" className="text-xs">
            Read-only
          </Badge>
        </CardContent>
      )}
    </Card>
  );
}

// Connected account row
function ConnectedAccountRow({ 
  account, 
  onDisconnect,
  onSync
}: { 
  account: InboxAccount;
  onDisconnect: () => void;
  onSync: () => void;
}) {
  const meta = PROVIDER_META[account.provider];
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSync();
      toast.success('Sync started');
    } catch (err) {
      toast.error('Failed to start sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDeleting(true);
    try {
      await onDisconnect();
      toast.success('Account disconnected');
    } catch (err) {
      toast.error('Failed to disconnect account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <ProviderIcon provider={account.provider} className="h-5 w-5" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {account.account_name}
          </span>
          {account.enabled ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {account.account_email && (
            <span>{account.account_email}</span>
          )}
          {account.last_sync_at && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Synced {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}
              </span>
            </>
          )}
        </div>
        {account.last_sync_error && (
          <p className="text-xs text-destructive mt-1">
            {account.last_sync_error}
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {account.scopes && (
          <Badge variant="outline" className="text-xs hidden md:flex">
            {account.scopes.length} scopes
          </Badge>
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isDeleting}>
              <Trash2 className="h-4 w-4 text-destructive" />
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
              <AlertDialogAction onClick={handleDisconnect}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function InboxSettings() {
  const { userKey, isAuthenticated, isLoading: authLoading } = useAuth();
  const { accounts, loading, refetch, disconnectAccount } = useInboxAccounts();
  const [connectingProvider, setConnectingProvider] = useState<InboxProvider | null>(null);

  const handleConnect = async (provider: InboxProvider) => {
    // Ensure authentication is ready
    if (!isAuthenticated || !userKey) {
      toast.error('Authentication required. Please verify your Tailscale connection.');
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
    
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleDisconnect = async (accountId: string) => {
    await disconnectAccount(accountId);
  };

  const allProviders: InboxProvider[] = [
    'gmail',
    'outlook',
    'teams',
    'whatsapp',
    'telegram',
    'instagram',
    'linkedin',
  ];

  // Show loading state while auth initializes
  if (authLoading) {
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

  return (
    <div className="space-y-6">
      {/* Show auth warning if not authenticated */}
      {!isAuthenticated && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Authentication required. Please verify your Tailscale connection to connect inbox accounts.
            </p>
          </CardContent>
        </Card>
      )}
      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
          <CardDescription>
            Manage your connected email and messaging accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No accounts connected yet</p>
              <p className="text-sm">Connect an account below to get started</p>
            </div>
          ) : (
            accounts.map(account => (
              <ConnectedAccountRow
                key={account.id}
                account={account}
                onDisconnect={() => handleDisconnect(account.id)}
                onSync={() => handleSync(account.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Add New Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Account
          </CardTitle>
          <CardDescription>
            Connect a new email or messaging account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allProviders.map(provider => (
              <ProviderCard
                key={provider}
                provider={provider}
                onConnect={handleConnect}
                isConnecting={connectingProvider === provider}
                existingAccounts={accounts}
                isAuthReady={isAuthenticated && !!userKey}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how often your accounts are synced
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Messages are synced automatically when available via webhooks. 
            For providers without webhook support, messages are synced every 5 minutes.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
