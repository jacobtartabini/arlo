import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";

type AddGiftCardDialogProps = {
  onSuccess?: () => void;
};

export function AddGiftCardDialog({ onSuccess }: AddGiftCardDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { createGiftCard } = useFinancePersistence();

  const [formData, setFormData] = useState({
    merchant_name: "",
    initial_balance: "",
    current_balance: "",
    card_number_last4: "",
    expiry_date: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.merchant_name || !formData.initial_balance) {
      toast.error("Merchant and initial balance are required");
      return;
    }

    const initialBalance = parseFloat(formData.initial_balance);
    const currentBalance = formData.current_balance 
      ? parseFloat(formData.current_balance) 
      : initialBalance;

    setLoading(true);
    try {
      await createGiftCard({
        merchant_name: formData.merchant_name,
        initial_balance: initialBalance,
        current_balance: currentBalance,
        card_number_last4: formData.card_number_last4 || null,
        expiry_date: formData.expiry_date || null,
        notes: formData.notes || null,
        purchase_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Gift card added");
      setOpen(false);
      setFormData({
        merchant_name: "",
        initial_balance: "",
        current_balance: "",
        card_number_last4: "",
        expiry_date: "",
        notes: "",
      });
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create gift card:", error);
      toast.error("Failed to add gift card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Gift Card
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Gift Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant</Label>
            <Input
              id="merchant"
              value={formData.merchant_name}
              onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
              placeholder="Amazon"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="initial_balance">Initial Balance</Label>
              <Input
                id="initial_balance"
                type="number"
                step="0.01"
                value={formData.initial_balance}
                onChange={(e) => setFormData({ ...formData, initial_balance: e.target.value })}
                placeholder="50.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_balance">Current Balance</Label>
              <Input
                id="current_balance"
                type="number"
                step="0.01"
                value={formData.current_balance}
                onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })}
                placeholder="Same as initial if blank"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last4">Last 4 Digits</Label>
              <Input
                id="last4"
                maxLength={4}
                value={formData.card_number_last4}
                onChange={(e) => setFormData({ ...formData, card_number_last4: e.target.value })}
                placeholder="1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Gift Card"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
