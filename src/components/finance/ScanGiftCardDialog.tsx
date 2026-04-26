import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Sparkles, Loader2, RotateCcw, ScanLine } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = { onSuccess?: () => void; trigger?: React.ReactNode };

interface ScanResult {
  merchant_name: string | null;
  balance: number | null;
  card_number_last4: string | null;
  expiry_date: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
}

export function ScanGiftCardDialog({ onSuccess, trigger }: Props) {
  const { createGiftCard } = useFinancePersistence();
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanned, setScanned] = useState<ScanResult | null>(null);
  const [form, setForm] = useState({
    merchant_name: "",
    initial_balance: "",
    current_balance: "",
    card_number_last4: "",
    expiry_date: "",
    notes: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setImagePreview(null);
    setScanned(null);
    setForm({
      merchant_name: "", initial_balance: "", current_balance: "",
      card_number_last4: "", expiry_date: "", notes: "",
    });
  };

  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const compressImage = async (dataUrl: string): Promise<{ dataUrl: string; mime: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), mime: "image/jpeg" });
      };
      img.onerror = () => resolve({ dataUrl, mime: "image/jpeg" });
      img.src = dataUrl;
    });
  };

  const handleFile = async (file: File) => {
    try {
      const raw = await fileToBase64(file);
      const { dataUrl } = await compressImage(raw);
      setImagePreview(dataUrl);
      await runScan(dataUrl);
    } catch (e) {
      console.error(e);
      toast.error("Could not read image");
    }
  };

  const runScan = async (dataUrl: string) => {
    setScanning(true);
    setScanned(null);
    try {
      const { data, error } = await supabase.functions.invoke("scan-gift-card", {
        body: { image_base64: dataUrl, mime_type: "image/jpeg" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Scan failed");

      const result = data as ScanResult & { success: boolean };
      setScanned(result);
      setForm(f => ({
        merchant_name: result.merchant_name || f.merchant_name,
        initial_balance: result.balance != null ? String(result.balance) : f.initial_balance,
        current_balance: result.balance != null ? String(result.balance) : f.current_balance,
        card_number_last4: result.card_number_last4 || f.card_number_last4,
        expiry_date: result.expiry_date || f.expiry_date,
        notes: result.notes || f.notes,
      }));

      if (result.confidence === "low") {
        toast.warning("Low confidence — please double-check the fields");
      } else {
        toast.success("Card details extracted!");
      }
    } catch (e: any) {
      console.error("Scan error:", e);
      toast.error(e?.message || "Could not scan card. Try again or enter manually.");
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    if (!form.merchant_name || !form.initial_balance) {
      toast.error("Merchant and balance are required");
      return;
    }
    const initial = parseFloat(form.initial_balance);
    const current = form.current_balance ? parseFloat(form.current_balance) : initial;
    setSaving(true);
    try {
      await createGiftCard({
        merchant_name: form.merchant_name,
        initial_balance: initial,
        current_balance: current,
        card_number_last4: form.card_number_last4 || null,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        purchase_date: new Date().toISOString().split("T")[0],
      });
      toast.success("Gift card added");
      setOpen(false);
      reset();
      onSuccess?.();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save gift card");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-2">
            <ScanLine className="w-4 h-4" /> Scan Gift Card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Scan a Gift Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!imagePreview ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Snap a photo of the front of your gift card. We'll extract the merchant, balance, and last 4 digits automatically.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 text-foreground"
                variant="outline"
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-primary" />
                  <span className="text-sm font-medium">Take photo or upload</span>
                </div>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border bg-black/5">
                <img src={imagePreview} alt="Gift card preview" className="w-full max-h-48 object-contain" />
                {scanning && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2 text-white">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm">Reading card...</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { reset(); fileInputRef.current?.click(); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Re-scan
                </Button>
                {scanned && (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-md flex items-center",
                    scanned.confidence === "high" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                    scanned.confidence === "medium" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    scanned.confidence === "low" && "bg-red-500/15 text-red-700 dark:text-red-400",
                  )}>
                    {scanned.confidence} confidence
                  </span>
                )}
              </div>
            </div>
          )}

          {(imagePreview || true) && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                {scanned ? "Review and edit, then save" : "Or enter details manually"}
              </p>
              <div className="space-y-2">
                <Label htmlFor="gc-merchant" className="text-xs">Merchant</Label>
                <Input
                  id="gc-merchant"
                  value={form.merchant_name}
                  onChange={(e) => setForm({ ...form, merchant_name: e.target.value })}
                  placeholder="Amazon"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gc-initial" className="text-xs">Initial balance</Label>
                  <Input
                    id="gc-initial"
                    type="number"
                    step="0.01"
                    value={form.initial_balance}
                    onChange={(e) => setForm({ ...form, initial_balance: e.target.value, current_balance: form.current_balance || e.target.value })}
                    placeholder="50.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gc-current" className="text-xs">Current balance</Label>
                  <Input
                    id="gc-current"
                    type="number"
                    step="0.01"
                    value={form.current_balance}
                    onChange={(e) => setForm({ ...form, current_balance: e.target.value })}
                    placeholder="50.00"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="gc-last4" className="text-xs">Last 4 digits</Label>
                  <Input
                    id="gc-last4"
                    maxLength={4}
                    value={form.card_number_last4}
                    onChange={(e) => setForm({ ...form, card_number_last4: e.target.value })}
                    placeholder="1234"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gc-expiry" className="text-xs">Expiry</Label>
                  <Input
                    id="gc-expiry"
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gc-notes" className="text-xs">Notes</Label>
                <Input
                  id="gc-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || scanning}>
              {saving ? "Saving..." : "Save gift card"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
