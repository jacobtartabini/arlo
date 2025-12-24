import { useState } from 'react';
import { Eye, EyeOff, Copy, Trash2, Edit2, Check, X, Box, Circle, Cylinder, Triangle, Donut, FileBox, Lock, Unlock, Folder, Hexagon, Square, Layers, Ungroup } from 'lucide-react';
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
  torus: Donut,
  capsule: Hexagon,
  roundedBox: Box,
  pyramid: Triangle,
  plane: Square,
  tube: Cylinder,
  torusKnot: Donut,
  lathe: Layers
};

interface ObjectListItemProps {
  object: SceneObject;
  isSelected: boolean;
  onSelect: (addToSelection: boolean) => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onUngroup?: () => void;
}

function ObjectListItem({
  object,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRename,
  onUngroup
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

  const handleClick = (e: React.MouseEvent) => {
    if (object.locked) return;
    onSelect(e.shiftKey || e.metaKey || e.ctrlKey);
  };

  const Icon = object.type === 'imported' 
    ? FileBox 
    : object.type === 'group'
    ? Folder
    : primitiveIcons[object.primitiveType!] || Box;

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
        isSelected 
          ? "bg-primary/20 border border-primary/30" 
          : "hover:bg-muted/50",
        object.locked && "opacity-60"
      )}
      onClick={handleClick}
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
            {object.type === 'group' && onUngroup && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6"
                onClick={onUngroup}
              >
                <Ungroup className="h-3 w-3" />
              </Button>
            )}
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
              onClick={onToggleLock}
            >
              {object.locked ? (
                <Lock className="h-3 w-3 text-amber-500" />
              ) : (
                <Unlock className="h-3 w-3 text-muted-foreground" />
              )}
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
              disabled={object.locked}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={onDelete}
              disabled={object.locked}
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
  selectedObjectIds: string[];
  onSelectObject: (id: string, addToSelection: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onUngroup: (id: string) => void;
}

export function ObjectListPanel({
  objects,
  selectedObjectIds,
  onSelectObject,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRename,
  onUngroup
}: ObjectListPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium text-sm">Objects</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {objects.length} object{objects.length !== 1 ? 's' : ''}
          {selectedObjectIds.length > 0 && ` • ${selectedObjectIds.length} selected`}
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
                isSelected={selectedObjectIds.includes(obj.id)}
                onSelect={(addToSelection) => onSelectObject(obj.id, addToSelection)}
                onToggleVisibility={() => onToggleVisibility(obj.id)}
                onToggleLock={() => onToggleLock(obj.id)}
                onDuplicate={() => onDuplicate(obj.id)}
                onDelete={() => onDelete(obj.id)}
                onRename={(name) => onRename(obj.id, name)}
                onUngroup={obj.type === 'group' ? () => onUngroup(obj.id) : undefined}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
