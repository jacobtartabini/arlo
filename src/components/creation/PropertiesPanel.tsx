import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { SceneObject, Vector3 } from '@/types/creation';

interface Vector3InputProps {
  label: string;
  value: Vector3;
  onChange: (value: Vector3) => void;
  onBlur?: () => void;
  step?: number;
  min?: number;
  max?: number;
}

function Vector3Input({ label, value, onChange, onBlur, step = 0.1, min = -100, max = 100 }: Vector3InputProps) {
  const handleChange = (axis: 'x' | 'y' | 'z', val: string) => {
    const num = parseFloat(val) || 0;
    onChange({ ...value, [axis]: num });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">X</Label>
          <Input
            type="number"
            value={value.x.toFixed(2)}
            onChange={(e) => handleChange('x', e.target.value)}
            onBlur={onBlur}
            step={step}
            min={min}
            max={max}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Y</Label>
          <Input
            type="number"
            value={value.y.toFixed(2)}
            onChange={(e) => handleChange('y', e.target.value)}
            onBlur={onBlur}
            step={step}
            min={min}
            max={max}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Z</Label>
          <Input
            type="number"
            value={value.z.toFixed(2)}
            onChange={(e) => handleChange('z', e.target.value)}
            onBlur={onBlur}
            step={step}
            min={min}
            max={max}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

interface PropertiesPanelProps {
  selectedObject: SceneObject | null;
  selectedCount: number;
  onUpdatePosition: (value: Vector3) => void;
  onUpdateRotation: (value: Vector3) => void;
  onUpdateScale: (value: Vector3) => void;
  onUpdateColor: (color: string) => void;
  onCommitTransform: () => void;
}

export function PropertiesPanel({
  selectedObject,
  selectedCount,
  onUpdatePosition,
  onUpdateRotation,
  onUpdateScale,
  onUpdateColor,
  onCommitTransform
}: PropertiesPanelProps) {
  if (!selectedObject) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-border">
          <h3 className="font-medium text-sm">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4 text-center">
          {selectedCount > 1 
            ? `${selectedCount} objects selected`
            : 'Select an object to view and edit its properties'
          }
        </div>
      </div>
    );
  }

  // Convert radians to degrees for display
  const rotationDegrees = {
    x: (selectedObject.rotation.x * 180) / Math.PI,
    y: (selectedObject.rotation.y * 180) / Math.PI,
    z: (selectedObject.rotation.z * 180) / Math.PI
  };

  const handleRotationChange = (degrees: Vector3) => {
    onUpdateRotation({
      x: (degrees.x * Math.PI) / 180,
      y: (degrees.y * Math.PI) / 180,
      z: (degrees.z * Math.PI) / 180
    });
  };

  // Calculate bounding box dimensions (approximate based on scale)
  const dimensions = {
    width: (selectedObject.scale.x * 1000).toFixed(1),
    height: (selectedObject.scale.y * 1000).toFixed(1),
    depth: (selectedObject.scale.z * 1000).toFixed(1)
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border">
        <h3 className="font-medium text-sm">Properties</h3>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {selectedObject.name}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">Type</Label>
          <div className="text-sm capitalize bg-muted/50 px-2 py-1 rounded">
            {selectedObject.type === 'imported' 
              ? 'Imported STL' 
              : selectedObject.type === 'group'
              ? 'Group'
              : selectedObject.primitiveType}
          </div>
        </div>

        {/* Dimensions display */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Dimensions (mm)</Label>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted/50 px-2 py-1 rounded text-center">
              <span className="text-muted-foreground">W:</span> {dimensions.width}
            </div>
            <div className="bg-muted/50 px-2 py-1 rounded text-center">
              <span className="text-muted-foreground">H:</span> {dimensions.height}
            </div>
            <div className="bg-muted/50 px-2 py-1 rounded text-center">
              <span className="text-muted-foreground">D:</span> {dimensions.depth}
            </div>
          </div>
        </div>

        <Separator />

        <Vector3Input
          label="Position"
          value={selectedObject.position}
          onChange={onUpdatePosition}
          onBlur={onCommitTransform}
          step={0.1}
        />

        <Vector3Input
          label="Rotation (°)"
          value={rotationDegrees}
          onChange={handleRotationChange}
          onBlur={onCommitTransform}
          step={5}
          min={-360}
          max={360}
        />

        <Vector3Input
          label="Scale"
          value={selectedObject.scale}
          onChange={onUpdateScale}
          onBlur={onCommitTransform}
          step={0.1}
          min={0.01}
          max={100}
        />

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs font-medium">Color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedObject.color}
              onChange={(e) => onUpdateColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer border border-border"
            />
            <Input
              value={selectedObject.color}
              onChange={(e) => onUpdateColor(e.target.value)}
              className="h-8 text-sm flex-1"
            />
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex flex-wrap gap-2 text-xs">
          {selectedObject.locked && (
            <span className="bg-amber-500/20 text-amber-600 px-2 py-0.5 rounded">
              Locked
            </span>
          )}
          {!selectedObject.visible && (
            <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded">
              Hidden
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
