import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Loader2, TrendingUp } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SearchResult {
  symbol: string;
  instrument_name: string;
  exchange: string;
  country: string;
  currency: string;
  instrument_type: string;
}

type Props = {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
};

export function AddStockDialog({ onSuccess, trigger }: Props) {
  const { searchStocks, addToWatchlist, getStockQuote } = useFinancePersistence();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [enableAlerts, setEnableAlerts] = useState(false);
  const [targetHigh, setTargetHigh] = useState("");
  const [targetLow, setTargetLow] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || selected) {
      setResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchStocks(query.trim());
        setResults((data?.results || []).slice(0, 8));
      } catch (e) {
        console.error("Stock search failed", e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, selected, searchStocks]);

  const reset = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setEnableAlerts(false);
    setTargetHigh("");
    setTargetLow("");
    setNotes("");
  };

  const handlePick = async (item: SearchResult) => {
    setSelected(item);
    setQuery(`${item.symbol} — ${item.instrument_name}`);
    setResults([]);
    // Pre-fetch quote for context
    try {
      const q = await getStockQuote(item.symbol);
      if (q?.close) {
        // Suggest +/- 10% defaults if user enables alerts
        setTargetHigh((q.close * 1.1).toFixed(2));
        setTargetLow((q.close * 0.9).toFixed(2));
      }
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    if (!selected) {
      toast.error("Pick a stock from the list first");
      return;
    }
    setSaving(true);
    try {
      const created = await addToWatchlist({
        symbol: selected.symbol.toUpperCase(),
        name: selected.instrument_name,
        notes: notes || null,
        alert_enabled: enableAlerts,
        target_price_high: enableAlerts && targetHigh ? parseFloat(targetHigh) : null,
        target_price_low: enableAlerts && targetLow ? parseFloat(targetLow) : null,
      });
      if (created) {
        toast.success(`${selected.symbol} added to watchlist`);
        setOpen(false);
        reset();
        onSuccess?.();
      } else {
        toast.error("Already on your watchlist");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to add stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Stock
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Add to Watchlist
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock-search">Search ticker or company</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="stock-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (selected) setSelected(null);
                }}
                placeholder="AAPL, Tesla, Microsoft..."
                className="pl-9"
                autoFocus
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {results.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-auto bg-card">
                {results.map((r) => (
                  <button
                    key={`${r.symbol}-${r.exchange}`}
                    type="button"
                    onClick={() => handlePick(r)}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.instrument_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-xs text-muted-foreground">Price alerts</p>
                  <p className="text-sm">Notify me when price crosses targets</p>
                </div>
                <Switch checked={enableAlerts} onCheckedChange={setEnableAlerts} />
              </div>

              {enableAlerts && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="target-low" className="text-xs">Alert below</Label>
                    <Input
                      id="target-low"
                      type="number"
                      step="0.01"
                      value={targetLow}
                      onChange={(e) => setTargetLow(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="target-high" className="text-xs">Alert above</Label>
                    <Input
                      id="target-high"
                      type="number"
                      step="0.01"
                      value={targetHigh}
                      onChange={(e) => setTargetHigh(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="stock-notes" className="text-xs">Notes (optional)</Label>
                <Input
                  id="stock-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why are you watching this?"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!selected || saving}>
              {saving ? "Adding..." : "Add to watchlist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
