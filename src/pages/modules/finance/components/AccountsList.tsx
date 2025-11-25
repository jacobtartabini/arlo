import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Activity, Link2 } from "lucide-react";
import { LinkedAccount } from "../finance-data";

type AccountsListProps = {
  accounts: LinkedAccount[];
};

export function AccountsList({ accounts }: AccountsListProps) {
  return (
    <Card className="glass p-6 space-y-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/12 flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Accounts at a glance</h2>
            <p className="text-sm text-muted-foreground">Clean, Rocket Money-style rollup of every balance.</p>
          </div>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary flex items-center gap-1">
          <TrendingUp className="w-4 h-4" /> Net worth +4.2%
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {accounts.map((account) => (
          <div
            key={account.name}
            className="rounded-lg border border-border/40 p-4 bg-muted/30 flex flex-col gap-1"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground font-medium">{account.name}</span>
              <Badge
                variant="outline"
                className={
                  account.status === "connected"
                    ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                    : account.status === "relink"
                      ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                      : "border-primary/40 text-primary bg-primary/10"
                }
              >
                {account.status === "connected" ? "Synced" : account.status === "relink" ? "Relink" : "Connect"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{account.type} • {account.lastSync}</p>
            <p className="text-lg font-semibold text-foreground">{account.balance}</p>
            <Button variant="outline" size="sm" className="mt-2">
              <Link2 className="w-4 h-4 mr-2" /> {account.status === "connected" ? "Resync" : "Link with Plaid"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
