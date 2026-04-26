import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  formatCurrency,
  statusColor,
  statusLabel,
} from "@/lib/finance/budgetMath";
import type { BudgetCategoryState } from "@/hooks/useBudgetData";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";
import { EditBudgetDialog } from "./EditBudgetDialog";

interface BudgetCategoryRowProps {
  category: BudgetCategoryState;
  onChange: () => void;
}

export function BudgetCategoryRow({ category, onChange }: BudgetCategoryRowProps) {
  const { deleteBudget } = useFinancePersistence();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const pct = category.budgeted > 0 ? (category.spent / category.budgeted) * 100 : 0;
  const color = statusColor(category.pacing.status);

  const handleDelete = async () => {
    if (!category.budgetId) return;
    const ok = await deleteBudget(category.budgetId);
    if (ok) {
      toast.success(`${category.label} budget removed`);
      onChange();
    }
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="group rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/30">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-lg leading-none">{category.emoji}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{category.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {statusLabel(category.pacing.status, category.pacing.pace)}
                {category.carryover > 0 && (
                  <span> · +{formatCurrency(category.carryover)} rollover</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">
                {formatCurrency(category.spent)}
                <span className="text-muted-foreground"> / {formatCurrency(category.budgeted)}</span>
              </p>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {Math.round(pct)}%
              </p>
            </div>
            <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setEditOpen(true)}
                aria-label="Edit budget"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => setConfirmOpen(true)}
                aria-label="Remove budget"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-2.5 relative h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 transition-all"
            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }}
          />
          <div
            className="absolute inset-y-0 w-px bg-foreground/30"
            style={{ left: `${Math.min(100, category.pacing.periodElapsed * 100)}%` }}
          />
        </div>
      </div>

      <EditBudgetDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        onSuccess={onChange}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops tracking {category.label} against a limit. Your transactions stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
