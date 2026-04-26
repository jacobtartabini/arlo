import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";
import { useBudgetSuggestions } from "@/hooks/useBudgetData";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { formatCurrency } from "@/lib/finance/budgetMath";
import { toast } from "sonner";

interface BudgetSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function BudgetSetupWizard({ open, onOpenChange, onComplete }: BudgetSetupWizardProps) {
  const { suggestions, loading, refresh } = useBudgetSuggestions();
  const { upsertBudget } = useFinancePersistence();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      refresh();
    }
  }, [open, refresh]);

  useEffect(() => {
    // Pre-select top 6 categories with non-zero suggestion
    if (suggestions.length && selected.size === 0) {
      setSelected(new Set(suggestions.slice(0, 6).filter(s => s.suggested > 0).map(s => s.key)));
    }
  }, [suggestions, selected.size]);

  const toggle = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleApply = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const items = suggestions.filter(s => selected.has(s.key));
    if (items.length === 0) {
      toast.error("Select at least one category");
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        items.map(s => {
          const amt = parseFloat(overrides[s.key] ?? String(s.suggested));
          return upsertBudget({
            category: s.key,
            amount: Number.isFinite(amt) ? amt : s.suggested,
            month,
            year,
            carryover_enabled: false,
          } as any);
        }),
      );
      toast.success(`${items.length} budgets created`);
      onComplete();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save budgets");
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = suggestions
    .filter(s => selected.has(s.key))
    .reduce((sum, s) => {
      const amt = parseFloat(overrides[s.key] ?? String(s.suggested));
      return sum + (Number.isFinite(amt) ? amt : s.suggested);
    }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart budget setup
          </DialogTitle>
          <DialogDescription>
            We looked at your last 90 days of spending and suggested budgets that
            nudge you to spend ~10% less. Adjust anything before applying.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suggestions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Not enough transaction history yet. Link an account and sync, then come back.
            </p>
          </div>
        ) : (
          <>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {suggestions.map(s => {
                const isSel = selected.has(s.key);
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                      isSel ? "border-primary/50 bg-primary/5" : "border-border/60"
                    }`}
                  >
                    <Checkbox checked={isSel} onCheckedChange={() => toggle(s.key)} />
                    <div className="flex flex-1 items-center gap-2">
                      <span className="text-lg">{s.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          You averaged {formatCurrency(s.averageMonthly)}/mo
                        </p>
                      </div>
                    </div>
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="10"
                        className="h-8 pl-5 text-sm tabular-nums"
                        value={overrides[s.key] ?? String(s.suggested)}
                        onChange={e =>
                          setOverrides(prev => ({ ...prev, [s.key]: e.target.value }))
                        }
                        disabled={!isSel}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-sm text-muted-foreground">
                Total monthly:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(totalSelected)}
                </span>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleApply} disabled={saving || selected.size === 0}>
                  {saving ? "Saving…" : `Apply ${selected.size} budgets`}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
