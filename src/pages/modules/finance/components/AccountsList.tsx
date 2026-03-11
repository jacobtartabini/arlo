import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Link2, RefreshCw, Loader2 } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { PlaidLinkButton } from "@/components/finance/PlaidLinkButton";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

interface LinkedAccountRow {
  id: string;
  institution_name: string;
  account_name: string | null;
  account_type: string | null;
  account_subtype: string | null;
  account_mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  currency: string;
  last_synced_at: string | null;
  error_code: string | null;
  error_message: string | null;
  is_active: boolean;
  plaid_item_id: string;
}

export function AccountsList() {
  const { getLinkedAccounts, syncTransactions, refreshBalances, loading } = useFinancePersistence();
  const [accounts, setAccounts] = useState<LinkedAccountRow[]>([]);
  const [syncing, setSyncing] = useState(false);

  const loadAccounts = useCallback(async () => {
    const data = await getLinkedAccounts();
    setAccounts(data as unknown as LinkedAccountRow[]);
  }, [getLinkedAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncTransactions();
      if (result?.success) {
        toast.success(`Synced ${result.total_synced || 0} transactions`);
        // Refresh balances after sync
        await refreshBalances();
        await loadAccounts();
      } else {
        toast.error("Sync failed. Please try again.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const formatBalance = (balance: number | null, currency: string) => {
    if (balance === null) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(balance);
  };

  const formatLastSync = (lastSynced: string | null) => {
    if (!lastSynced) return "Never";
    const diff = Date.now() - new Date(lastSynced).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusBadge = (account: LinkedAccountRow) => {
    if (account.error_code) {
      return (
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
          {account.error_code === 'PENDING_EXPIRATION' ? 'Relink' : 'Error'}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
        Synced
      </Badge>
    );
  };

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

  return (
    <Card className="glass p-6 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Accounts at a glance</h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length > 0
                ? `${accounts.length} account${accounts.length > 1 ? 's' : ''} linked`
                : 'Connect your bank to get started'}
            </p>
          </div>
        </div>
        {accounts.length > 0 && (
          <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> {formatBalance(totalBalance, 'USD')}
          </Badge>
        )}
      </div>

      {accounts.length > 0 && (
        <div className="grid md:grid-cols-2 gap-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-lg border border-border/40 p-4 bg-muted/30 flex flex-col gap-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">
                  {account.account_name || account.institution_name}
                  {account.account_mask ? ` ••${account.account_mask}` : ''}
                </span>
                {getStatusBadge(account)}
              </div>
              <p className="text-xs text-muted-foreground">
                {account.institution_name} • {account.account_type}
                {account.account_subtype ? ` / ${account.account_subtype}` : ''}
                {' • '}
                {formatLastSync(account.last_synced_at)}
              </p>
              {account.error_message && (
                <p className="text-xs text-amber-400">{account.error_message}</p>
              )}
              <p className="text-lg font-semibold text-foreground">
                {formatBalance(account.current_balance, account.currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <PlaidLinkButton onSuccess={loadAccounts} />
        {accounts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing || loading}
            className="gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync All
          </Button>
        )}
      </div>
    </Card>
  );
}
