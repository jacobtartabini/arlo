import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";
import { BUDGET_CATEGORIES } from "@/lib/finance/categories";

const SELECTABLE = BUDGET_CATEGORIES.filter(c => c.countsAsSpend);

type AddBudgetDialogProps = {
  onSuccess?: () => void;
  triggerLabel?: string;
};

export function AddBudgetDialog({ onSuccess, triggerLabel = "Add budget" }: AddBudgetDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { upsertBudget } = useFinancePersistence();

  const now = new Date();
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    carryover_enabled: false,
    notes: "",
  });

  const reset = () => {
    setFormData({
      category: "",
      amount: "",
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      carryover_enabled: false,
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount) {
      toast.error("Category and amount are required");
      return;
    }
    setLoading(true);
    try {
      await upsertBudget({
        category: formData.category,
        amount: parseFloat(formData.amount),
        month: formData.month,
        year: formData.year,
        carryover_enabled: formData.carryover_enabled,
        notes: formData.notes || null,
      } as any);
      toast.success("Budget saved");
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create budget:", error);
      toast.error("Failed to create budget");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {SELECTABLE.map((cat) => (
                  <SelectItem key={cat.key} value={cat.key}>
                    <span className="mr-2">{cat.emoji}</span>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Monthly limit</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="amount"
                type="number"
                step="10"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="500"
                className="pl-7"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={formData.month.toString()}
                onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={month} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="carryover" className="text-sm font-medium">Roll unused over</Label>
              <p className="text-xs text-muted-foreground">Leftover this month adds to next month.</p>
            </div>
            <Switch
              id="carryover"
              checked={formData.carryover_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, carryover_enabled: checked })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
