import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { GripVertical, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { HabitReorderList } from "./HabitReorderList";
import type { RoutineWithHabits } from "@/types/habits";
import { toast } from "@/hooks/use-toast";

interface RoutineEditSheetProps {
  routine: RoutineWithHabits | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReorderHabits: (routineId: string, habitIds: string[]) => Promise<void>;
  onDeleteRoutine?: (routineId: string) => Promise<void>;
}

export function RoutineEditSheet({
  routine,
  open,
  onOpenChange,
  onReorderHabits,
  onDeleteRoutine,
}: RoutineEditSheetProps) {
  const [isReordering, setIsReordering] = useState(false);

  const handleReorder = useCallback(
    async (habitIds: string[]) => {
      if (!routine) return;

      setIsReordering(true);
      try {
        await onReorderHabits(routine.id, habitIds);
        toast({
          title: "Order saved",
          description: "Habit order has been updated",
        });
      } catch (error) {
        toast({
          title: "Failed to save order",
          description: "Please try again",
          variant: "destructive",
        });
      } finally {
        setIsReordering(false);
      }
    },
    [routine, onReorderHabits]
  );

  const handleDelete = useCallback(async () => {
    if (!routine || !onDeleteRoutine) return;

    try {
      await onDeleteRoutine(routine.id);
      onOpenChange(false);
      toast({
        title: "Routine deleted",
        description: `"${routine.name}" has been removed`,
      });
    } catch (error) {
      toast({
        title: "Failed to delete",
        description: "Please try again",
        variant: "destructive",
      });
    }
  }, [routine, onDeleteRoutine, onOpenChange]);

  if (!routine) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            Edit Routine Order
          </SheetTitle>
          <SheetDescription>
            Drag habits to reorder them in "{routine.name}"
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Habit List with Drag and Drop */}
          <div className="relative">
            {isReordering && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-xl">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <HabitReorderList
              habits={routine.habits}
              onReorder={handleReorder}
            />
          </div>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            Changes are saved automatically when you drag and drop
          </p>

          {/* Delete Button */}
          {onDeleteRoutine && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Routine
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
