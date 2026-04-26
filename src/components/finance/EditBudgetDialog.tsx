import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";
import type { BudgetCategoryState } from "@/hooks/useBudgetData";

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: BudgetCategoryState;
  onSuccess?: () => void;
}

export function EditBudgetDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditBudgetDialogProps) {
  const { upsertBudget } = useFinancePersistence();
  const [amount, setAmount] = useState(String(category.budgeted));
  const [carryover, setCarryover] = useState(category.carryover > 0 || false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(category.budgeted));
      setCarryover(category.budgeted > 0 ? category.carryover > 0 : false);
    }
  }, [open, category]);

  const handleSave = async () => {
    const val = parseFloat(amount);
    if (!Number.isFinite(val) || val < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const now = new Date();
      await upsertBudget({
        ...(category.budgetId ? { id: category.budgetId } : {}),
        category: category.key,
        amount: val,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        carryover_enabled: carryover,
      } as any);
      toast.success(`${category.label} budget saved`);
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{category.emoji}</span> Edit {category.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Monthly budget</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="edit-amount"
                type="number"
                step="10"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="pl-7"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Currently spent: ${category.spent.toFixed(2)}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="edit-rollover" className="text-sm font-medium">
                Roll unused over
              </Label>
              <p className="text-xs text-muted-foreground">
                Leftover this month adds to next month's budget.
              </p>
            </div>
            <Switch id="edit-rollover" checked={carryover} onCheckedChange={setCarryover} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
