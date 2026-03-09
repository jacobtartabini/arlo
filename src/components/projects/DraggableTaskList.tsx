import { useCallback, useState, useEffect } from "react";
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
import { EnhancedTaskItem } from "./EnhancedTaskItem";
import type { Task } from "@/types/tasks";
import type { Subtask, Project } from "@/types/productivity";

interface SortableTaskProps {
  task: Task;
  projectColor?: string;
  projects: Project[];
  subtasks: Subtask[];
  onToggle: (taskId: string, done: boolean) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onAssignProject: (taskId: string, projectId: string | null) => void;
  onSubtaskToggle: (subtaskId: string, done: boolean) => void;
  onSubtaskCreate: (taskId: string, title: string) => void;
  onSubtaskDelete: (subtaskId: string) => void;
  onSubtaskUpdate: (subtaskId: string, title: string) => void;
  onTaskClick?: (task: Task) => void;
}

function SortableTask({
  task,
  projectColor,
  projects,
  subtasks,
  onToggle,
  onUpdate,
  onDelete,
  onAssignProject,
  onSubtaskToggle,
  onSubtaskCreate,
  onSubtaskDelete,
  onSubtaskUpdate,
  onTaskClick,
}: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      onClick={() => onTaskClick?.(task)}
      className="cursor-pointer"
    >
      <EnhancedTaskItem
        task={task}
        projectColor={projectColor}
        projects={projects}
        subtasks={subtasks}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onToggle={(taskId, done) => {
          onToggle(taskId, done);
        }}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAssignProject={onAssignProject}
        onSubtaskToggle={onSubtaskToggle}
        onSubtaskCreate={onSubtaskCreate}
        onSubtaskDelete={onSubtaskDelete}
        onSubtaskUpdate={onSubtaskUpdate}
      />
    </div>
  );
}

interface DraggableTaskListProps {
  tasks: Task[];
  projectColor?: string;
  projects?: Project[];
  subtasksByTask: Map<string, Subtask[]>;
  onToggle: (taskId: string, done: boolean) => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onReorder: (tasks: Task[]) => void;
  onAssignProject: (taskId: string, projectId: string | null) => void;
  onSubtaskToggle: (subtaskId: string, done: boolean) => void;
  onSubtaskCreate: (taskId: string, title: string) => void;
  onSubtaskDelete: (subtaskId: string) => void;
  onSubtaskUpdate: (subtaskId: string, title: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function DraggableTaskList({
  tasks,
  projectColor,
  projects = [],
  subtasksByTask,
  onToggle,
  onUpdate,
  onDelete,
  onReorder,
  onAssignProject,
  onSubtaskToggle,
  onSubtaskCreate,
  onSubtaskDelete,
  onSubtaskUpdate,
  onTaskClick,
}: DraggableTaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks);

  // Sync with external tasks
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalTasks((items) => {
        const oldIndex = items.findIndex((t) => t.id === active.id);
        const newIndex = items.findIndex((t) => t.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        
        // Update order indices
        const updated = reordered.map((task, index) => ({
          ...task,
          orderIndex: index,
        }));
        
        onReorder(updated);
        return updated;
      });
    }
  }, [onReorder]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={localTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {localTasks.map((task) => (
            <SortableTask
              key={task.id}
              task={task}
              projectColor={projectColor}
              projects={projects}
              subtasks={subtasksByTask.get(task.id) || []}
              onToggle={onToggle}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAssignProject={onAssignProject}
              onSubtaskToggle={onSubtaskToggle}
              onSubtaskCreate={onSubtaskCreate}
              onSubtaskDelete={onSubtaskDelete}
              onSubtaskUpdate={onSubtaskUpdate}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
