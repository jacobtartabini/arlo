import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Search, Loader2, Briefcase } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";

type Props = { onSuccess?: () => void; trigger?: React.ReactNode };

export function AddHoldingDialog({ onSuccess, trigger }: Props) {
  const { searchStocks, getStockQuote, addPortfolioHolding } = useFinancePersistence();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ symbol: string; name: string } | null>(null);
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!query.trim() || picked) {
      setResults([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchStocks(query.trim());
        setResults((data?.results || []).slice(0, 6));
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query, picked, searchStocks]);

  const reset = () => {
    setQuery(""); setResults([]); setPicked(null);
    setShares(""); setAvgCost("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
  };

  const handlePick = async (r: any) => {
    setPicked({ symbol: r.symbol, name: r.instrument_name });
    setQuery(`${r.symbol} — ${r.instrument_name}`);
    setResults([]);
    try {
      const q = await getStockQuote(r.symbol);
      if (q?.close && !avgCost) setAvgCost(String(q.close));
    } catch { /* ignore */ }
  };

  const handleSave = async () => {
    if (!picked) return toast.error("Pick a stock first");
    const s = parseFloat(shares);
    if (!s || s <= 0) return toast.error("Enter share count");
    setSaving(true);
    try {
      await addPortfolioHolding({
        symbol: picked.symbol.toUpperCase(),
        shares: s,
        average_cost: avgCost ? parseFloat(avgCost) : null,
        purchase_date: purchaseDate || null,
      });
      toast.success(`${picked.symbol} added to portfolio`);
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add holding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add Holding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" /> Add Portfolio Holding
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Stock</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (picked) setPicked(null); }}
                placeholder="Search ticker..."
                className="pl-9"
                autoFocus
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            {results.length > 0 && (
              <div className="border rounded-lg divide-y max-h-56 overflow-auto bg-card">
                {results.map((r) => (
                  <button
                    key={`${r.symbol}-${r.exchange}`}
                    type="button"
                    onClick={() => handlePick(r)}
                    className="w-full text-left px-3 py-2 hover:bg-accent flex justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{r.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.instrument_name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">{r.exchange}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="shares" className="text-xs">Shares</Label>
              <Input id="shares" type="number" step="0.0001" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avg-cost" className="text-xs">Avg cost / share</Label>
              <Input id="avg-cost" type="number" step="0.01" value={avgCost} onChange={(e) => setAvgCost(e.target.value)} placeholder="150.00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchase-date" className="text-xs">Purchase date</Label>
            <Input id="purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!picked || saving}>
              {saving ? "Adding..." : "Add holding"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
