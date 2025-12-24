import { useState } from 'react';
import { Eye, EyeOff, Copy, Trash2, Edit2, Check, X, Box, Circle, Cylinder, Triangle, Donut, FileBox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { SceneObject, PrimitiveType } from '@/types/creation';

const primitiveIcons: Record<PrimitiveType, React.ElementType> = {
  box: Box,
  sphere: Circle,
  cylinder: Cylinder,
  cone: Triangle,
  torus: Donut
};

interface ObjectListItemProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

function ObjectListItem({
  object,
  isSelected,
  onSelect,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onRename
}: ObjectListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(object.name);

  const handleSave = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(object.name);
    setIsEditing(false);
  };

  const Icon = object.type === 'imported' 
    ? FileBox 
    : primitiveIcons[object.primitiveType!] || Box;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isSelected 
          ? "bg-primary/20 border border-primary/30" 
          : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <div 
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ backgroundColor: object.color }}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-7 text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
            <Check className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <>
          <span className={cn(
            "flex-1 text-sm truncate",
            !object.visible && "text-muted-foreground line-through"
          )}>
            {object.name}
          </span>

          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={onToggleVisibility}
            >
              {object.visible ? (
                <Eye className="h-3 w-3" />
              ) : (
                <EyeOff className="h-3 w-3 text-muted-foreground" />
              )}
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={onDuplicate}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

interface ObjectListPanelProps {
  objects: SceneObject[];
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export function ObjectListPanel({
  objects,
  selectedObjectId,
  onSelectObject,
  onToggleVisibility,
  onDuplicate,
  onDelete,
  onRename
}: ObjectListPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium text-sm">Objects</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {objects.length} object{objects.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <ScrollArea className="flex-1 p-2">
        {objects.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No objects yet.<br />Add a primitive or import an STL.
          </div>
        ) : (
          <div className="space-y-1">
            {objects.map(obj => (
              <ObjectListItem
                key={obj.id}
                object={obj}
                isSelected={obj.id === selectedObjectId}
                onSelect={() => onSelectObject(obj.id)}
                onToggleVisibility={() => onToggleVisibility(obj.id)}
                onDuplicate={() => onDuplicate(obj.id)}
                onDelete={() => onDelete(obj.id)}
                onRename={(name) => onRename(obj.id, name)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
