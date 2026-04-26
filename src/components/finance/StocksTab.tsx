import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, X, Bell, BellOff, Briefcase,
  RefreshCw, AlertTriangle,
} from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { AddStockDialog } from "./AddStockDialog";
import { AddHoldingDialog } from "./AddHoldingDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Quote {
  symbol: string;
  close: number;
  previous_close: number;
  change: number;
  percent_change: number;
  is_market_open?: boolean;
}

const fmt = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

export function StocksTab() {
  const finance = useFinancePersistence();
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [w, p] = await Promise.all([finance.getWatchlist(), finance.getPortfolio()]);
      setWatchlist(w);
      setPortfolio(p);
    } finally {
      setLoading(false);
    }
  }, [finance]);

  const refreshQuotes = useCallback(async (w: any[], p: any[]) => {
    const symbols = Array.from(new Set([...w.map(s => s.symbol), ...p.map(s => s.symbol)]));
    if (symbols.length === 0) return;
    try {
      const data = await finance.getBatchQuotes(symbols);
      const next: Record<string, Quote> = {};
      for (const q of data?.quotes || []) {
        if (q?.symbol) next[q.symbol.toUpperCase()] = q;
      }
      setQuotes(next);
    } catch (e) {
      console.error("Failed to fetch quotes", e);
    }
  }, [finance]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    if (!loading && (watchlist.length || portfolio.length)) {
      refreshQuotes(watchlist, portfolio);
    }
  }, [loading, watchlist, portfolio, refreshQuotes]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refreshQuotes(watchlist, portfolio);
    setRefreshing(false);
    toast.success("Quotes refreshed");
  };

  const removeWatch = async (id: string, symbol: string) => {
    const ok = await finance.removeFromWatchlist(id);
    if (ok) {
      toast.success(`${symbol} removed`);
      setWatchlist(w => w.filter(x => x.id !== id));
    }
  };

  const toggleAlert = async (item: any) => {
    const next = !item.alert_enabled;
    const ok = await finance.updateWatchlistItem(item.id, { alert_enabled: next });
    if (ok) {
      setWatchlist(w => w.map(x => x.id === item.id ? { ...x, alert_enabled: next } : x));
      toast.success(next ? "Alerts on" : "Alerts off");
    }
  };

  const removeHolding = async (id: string, symbol: string) => {
    const ok = await finance.deletePortfolioHolding(id);
    if (ok) {
      toast.success(`${symbol} removed from portfolio`);
      setPortfolio(p => p.filter(x => x.id !== id));
    }
  };

  // Portfolio totals
  const portfolioStats = useMemo(() => {
    let value = 0, cost = 0;
    for (const h of portfolio) {
      const q = quotes[h.symbol.toUpperCase()];
      const price = q?.close ?? h.average_cost ?? 0;
      value += price * (h.shares || 0);
      cost += (h.average_cost || 0) * (h.shares || 0);
    }
    const gain = value - cost;
    const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
    return { value, cost, gain, gainPct };
  }, [portfolio, quotes]);

  // Triggered alerts
  const triggered = useMemo(() => {
    const out: { item: any; type: "high" | "low"; price: number }[] = [];
    for (const w of watchlist) {
      if (!w.alert_enabled) continue;
      const q = quotes[w.symbol.toUpperCase()];
      if (!q) continue;
      if (w.target_price_high && q.close >= w.target_price_high) {
        out.push({ item: w, type: "high", price: q.close });
      } else if (w.target_price_low && q.close <= w.target_price_low) {
        out.push({ item: w, type: "low", price: q.close });
      }
    }
    return out;
  }, [watchlist, quotes]);

  if (loading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-4">
      {/* Triggered alerts banner */}
      {triggered.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Price alerts triggered</p>
            </div>
            {triggered.map(({ item, type, price }) => (
              <p key={item.id} className="text-sm">
                <span className="font-semibold">{item.symbol}</span> hit {fmt(price)} —{" "}
                {type === "high"
                  ? `above your ${fmt(item.target_price_high)} target`
                  : `below your ${fmt(item.target_price_low)} floor`}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Portfolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" /> Portfolio
              </CardTitle>
              <CardDescription>Your holdings and live performance</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleManualRefresh} disabled={refreshing}>
                <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              </Button>
              <AddHoldingDialog onSuccess={loadAll} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {portfolio.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Add your first holding to track gains</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Stat label="Market value" value={fmt(portfolioStats.value)} />
                <Stat label="Cost basis" value={fmt(portfolioStats.cost)} />
                <Stat
                  label="Total gain"
                  value={`${portfolioStats.gain >= 0 ? "+" : ""}${fmt(portfolioStats.gain)}`}
                  sub={`${portfolioStats.gainPct >= 0 ? "+" : ""}${portfolioStats.gainPct.toFixed(2)}%`}
                  trend={portfolioStats.gain >= 0 ? "up" : "down"}
                />
              </div>
              <div className="space-y-2">
                {portfolio.map(h => {
                  const q = quotes[h.symbol.toUpperCase()];
                  const price = q?.close ?? h.average_cost ?? 0;
                  const value = price * (h.shares || 0);
                  const cost = (h.average_cost || 0) * (h.shares || 0);
                  const gain = value - cost;
                  const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                  const allocPct = portfolioStats.value > 0 ? (value / portfolioStats.value) * 100 : 0;
                  return (
                    <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm">{h.symbol}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{allocPct.toFixed(0)}%</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {h.shares} shares @ {h.average_cost ? fmt(h.average_cost) : "—"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(value)}</p>
                        <p className={cn(
                          "text-xs flex items-center justify-end gap-0.5",
                          gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {gain >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {gain >= 0 ? "+" : ""}{fmt(gain)} ({gainPct.toFixed(1)}%)
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="ml-2 opacity-0 group-hover:opacity-100 h-8 w-8"
                        onClick={() => removeHolding(h.id, h.symbol)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Watchlist */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" /> Watchlist
              </CardTitle>
              <CardDescription>Track stocks and set price alerts</CardDescription>
            </div>
            <AddStockDialog onSuccess={loadAll} />
          </div>
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <div className="text-center py-10">
              <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Search and add stocks to your watchlist</p>
            </div>
          ) : (
            <div className="space-y-2">
              {watchlist.map(stock => {
                const q = quotes[stock.symbol.toUpperCase()];
                const change = q?.percent_change ?? 0;
                const positive = change >= 0;
                return (
                  <div key={stock.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{stock.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{stock.name}</p>
                      {stock.alert_enabled && (stock.target_price_high || stock.target_price_low) && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Alert: {stock.target_price_low ? `↓${fmt(stock.target_price_low)}` : ""}{" "}
                          {stock.target_price_high ? `↑${fmt(stock.target_price_high)}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right mr-2">
                      {q ? (
                        <>
                          <p className="text-sm font-semibold">{fmt(q.close)}</p>
                          <p className={cn(
                            "text-xs flex items-center justify-end gap-0.5",
                            positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                          )}>
                            {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {positive ? "+" : ""}{change.toFixed(2)}%
                          </p>
                        </>
                      ) : (
                        <Skeleton className="h-8 w-16" />
                      )}
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleAlert(stock)}
                      title={stock.alert_enabled ? "Disable alerts" : "Enable alerts"}
                    >
                      {stock.alert_enabled
                        ? <Bell className="h-3.5 w-3.5 text-primary" />
                        : <BellOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="opacity-0 group-hover:opacity-100 h-8 w-8"
                      onClick={() => removeWatch(stock.id, stock.symbol)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/20">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn(
        "text-base font-semibold mt-0.5",
        trend === "up" && "text-emerald-600 dark:text-emerald-400",
        trend === "down" && "text-red-600 dark:text-red-400",
      )}>{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
