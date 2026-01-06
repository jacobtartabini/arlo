import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Cloud, RefreshCw, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import type { DriveAccount } from "@/types/files";
import { formatFileSize } from "@/types/files";
import { formatDistanceToNow } from "date-fns";

interface DriveAccountCardProps {
  account: DriveAccount;
  onDisconnect: () => void;
  onSync: () => void;
}

export function DriveAccountCard({ account, onDisconnect, onSync }: DriveAccountCardProps) {
  const usagePercent = account.storage_quota_total && account.storage_quota_used
    ? Math.round((account.storage_quota_used / account.storage_quota_total) * 100)
    : null;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Cloud className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h4 className="font-medium">{account.account_name || 'Google Drive'}</h4>
            <p className="text-sm text-muted-foreground">{account.account_email}</p>
          </div>
        </div>
        
        {account.is_connected ? (
          <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-3 w-3" />
            Reconnect needed
          </Badge>
        )}
      </div>

      {/* Storage */}
      {usagePercent !== null && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Storage used</span>
            <span className="font-medium">{usagePercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatFileSize(account.storage_quota_used)} of {formatFileSize(account.storage_quota_total)}
          </p>
        </div>
      )}

      {/* Last Sync */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {account.last_sync_at 
            ? `Last synced ${formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}`
            : 'Never synced'
          }
        </span>
      </div>

      {/* Error */}
      {account.last_sync_error && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="line-clamp-2">{account.last_sync_error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={onSync}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Files
        </Button>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDisconnect}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}
