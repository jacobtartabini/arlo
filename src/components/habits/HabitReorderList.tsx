import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { GripVertical, Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HabitWithStreak } from "@/types/habits";

interface SortableHabitItemProps {
  habit: HabitWithStreak;
}

function SortableHabitItem({ habit }: SortableHabitItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border bg-card transition-all",
        isDragging && "shadow-lg ring-2 ring-primary/20 bg-card/90"
      )}
    >
      <button
        className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{habit.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          {habit.durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {habit.durationMinutes}m
            </span>
          )}
          {habit.difficulty === "hard" && (
            <span className="flex items-center gap-1 text-orange-500">
              <Flame className="h-3 w-3" />
              Hard
            </span>
          )}
        </div>
      </div>

      <span className="text-xs text-muted-foreground tabular-nums">
        #{habit.routineOrder + 1}
      </span>
    </div>
  );
}

interface HabitReorderListProps {
  habits: HabitWithStreak[];
  onReorder: (habitIds: string[]) => void;
}

export function HabitReorderList({ habits, onReorder }: HabitReorderListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedHabits = useMemo(
    () => [...habits].sort((a, b) => a.routineOrder - b.routineOrder),
    [habits]
  );

  const habitIds = useMemo(
    () => sortedHabits.map((h) => h.id),
    [sortedHabits]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = habitIds.indexOf(active.id as string);
      const newIndex = habitIds.indexOf(over.id as string);
      const newOrder = arrayMove(habitIds, oldIndex, newIndex);
      onReorder(newOrder);
    }
  }

  if (habits.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No habits in this routine yet</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={habitIds} strategy={verticalListSortingStrategy}>
        <motion.div layout className="space-y-2">
          {sortedHabits.map((habit) => (
            <SortableHabitItem key={habit.id} habit={habit} />
          ))}
        </motion.div>
      </SortableContext>
    </DndContext>
  );
}
