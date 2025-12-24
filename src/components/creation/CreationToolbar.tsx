import { useRef } from 'react';
import { 
  Box, 
  Circle, 
  Cylinder, 
  Triangle, 
  Donut,
  Move,
  RotateCcw,
  Maximize2,
  Eye,
  Grid3X3,
  Download,
  Upload,
  Save,
  FilePlus,
  Loader2,
  Undo2,
  Redo2,
  Grid,
  Axis3D,
  Magnet,
  AlignCenter,
  ArrowDownToLine,
  Target,
  Group,
  Hexagon,
  Square,
  Layers,
  Merge,
  Minus,
  Scissors,
  Ruler,
  Focus,
  Fullscreen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PrimitiveType, TransformMode, ViewMode, SnapSettings, BooleanOperation, MeasureTool } from '@/types/creation';

interface CreationToolbarProps {
  transformMode: TransformMode;
  viewMode: ViewMode;
  isSaving: boolean;
  hasSelection: boolean;
  hasTwoSelected: boolean;
  canUndo: boolean;
  canRedo: boolean;
  showGrid: boolean;
  showAxes: boolean;
  snapSettings: SnapSettings;
  measureTool: MeasureTool;
  onAddPrimitive: (type: PrimitiveType) => void;
  onImportSTL: (file: File) => void;
  onTransformModeChange: (mode: TransformMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onNewProject: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleAxes: () => void;
  onSnapSettingsChange: (settings: SnapSettings) => void;
  onAlignToOrigin: () => void;
  onDropToGround: () => void;
  onCenterInScene: () => void;
  onGroup: () => void;
  onBooleanOperation: (op: BooleanOperation) => void;
  onToggleMeasure: () => void;
  onClearMeasure: () => void;
  onFitToSelection: () => void;
  onFitToScene: () => void;
}

export function CreationToolbar({
  transformMode,
  viewMode,
  isSaving,
  hasSelection,
  hasTwoSelected,
  canUndo,
  canRedo,
  showGrid,
  showAxes,
  snapSettings,
  measureTool,
  onAddPrimitive,
  onImportSTL,
  onTransformModeChange,
  onViewModeChange,
  onSave,
  onNewProject,
  onExport,
  onUndo,
  onRedo,
  onToggleGrid,
  onToggleAxes,
  onSnapSettingsChange,
  onAlignToOrigin,
  onDropToGround,
  onCenterInScene,
  onGroup,
  onBooleanOperation,
  onToggleMeasure,
  onClearMeasure,
  onFitToSelection,
  onFitToScene
}: CreationToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      onImportSTL(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const basicPrimitives: { type: PrimitiveType; icon: React.ElementType; label: string }[] = [
    { type: 'box', icon: Box, label: 'Box' },
    { type: 'sphere', icon: Circle, label: 'Sphere' },
    { type: 'cylinder', icon: Cylinder, label: 'Cylinder' },
    { type: 'cone', icon: Triangle, label: 'Cone' },
    { type: 'torus', icon: Donut, label: 'Torus' }
  ];

  const advancedPrimitives: { type: PrimitiveType; icon: React.ElementType; label: string }[] = [
    { type: 'capsule', icon: Hexagon, label: 'Capsule' },
    { type: 'roundedBox', icon: Box, label: 'Rounded Box' },
    { type: 'pyramid', icon: Triangle, label: 'Pyramid' },
    { type: 'plane', icon: Square, label: 'Plane' },
    { type: 'tube', icon: Cylinder, label: 'Tube' },
    { type: 'torusKnot', icon: Donut, label: 'Torus Knot' },
    { type: 'lathe', icon: Layers, label: 'Lathe' }
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-2 p-2 bg-background/80 backdrop-blur-sm border-b border-border">
        {/* File Operations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onNewProject}>
              <FilePlus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Project</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save (Ctrl+S)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onUndo}
              disabled={!canUndo}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onRedo}
              disabled={!canRedo}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Add Primitives */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <Box className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Basic Shapes</DropdownMenuLabel>
            {basicPrimitives.map(({ type, icon: Icon, label }) => (
              <DropdownMenuItem key={type} onClick={() => onAddPrimitive(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Advanced Shapes</DropdownMenuLabel>
            {advancedPrimitives.map(({ type, icon: Icon, label }) => (
              <DropdownMenuItem key={type} onClick={() => onAddPrimitive(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileChange}
          className="hidden"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import .stl file</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Transform Mode */}
        <div className="flex items-center bg-muted/50 rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'translate' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7"
                onClick={() => onTransformModeChange('translate')}
              >
                <Move className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Move (G)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'rotate' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7"
                onClick={() => onTransformModeChange('rotate')}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rotate (R)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={transformMode === 'scale' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7"
                onClick={() => onTransformModeChange('scale')}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Scale (S)</TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Snapping */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={snapSettings.enabled ? 'secondary' : 'ghost'} 
              size="sm"
              className="h-7"
            >
              <Magnet className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuCheckboxItem
              checked={snapSettings.enabled}
              onCheckedChange={(checked) => 
                onSnapSettingsChange({ ...snapSettings, enabled: checked })
              }
            >
              Enable Snapping
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Move Snap</DropdownMenuLabel>
            {[1, 5, 10].map(val => (
              <DropdownMenuCheckboxItem
                key={val}
                checked={snapSettings.translateSnap === val}
                onCheckedChange={() => 
                  onSnapSettingsChange({ ...snapSettings, translateSnap: val })
                }
              >
                {val}mm
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Rotate Snap</DropdownMenuLabel>
            {[15, 30, 45].map(val => (
              <DropdownMenuCheckboxItem
                key={val}
                checked={snapSettings.rotateSnap === val}
                onCheckedChange={() => 
                  onSnapSettingsChange({ ...snapSettings, rotateSnap: val })
                }
              >
                {val}°
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Alignment */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7" disabled={!hasSelection}>
              <AlignCenter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={onAlignToOrigin}>
              <Target className="h-4 w-4 mr-2" />
              Align to Origin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDropToGround}>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Drop to Ground
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCenterInScene}>
              <AlignCenter className="h-4 w-4 mr-2" />
              Center in Scene
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7"
              onClick={onGroup}
              disabled={!hasTwoSelected}
            >
              <Group className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Group Selected</TooltipContent>
        </Tooltip>

        {/* Boolean Operations */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7"
              disabled={!hasTwoSelected}
            >
              <Merge className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Boolean Operations</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onBooleanOperation('union')}>
              <Merge className="h-4 w-4 mr-2" />
              Union (Combine)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBooleanOperation('subtract')}>
              <Minus className="h-4 w-4 mr-2" />
              Subtract (Cut)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onBooleanOperation('intersect')}>
              <Scissors className="h-4 w-4 mr-2" />
              Intersect (Keep Overlap)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6" />

        {/* Measure Tool */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={measureTool.active ? 'secondary' : 'ghost'} 
              size="sm" 
              className="h-7"
              onClick={onToggleMeasure}
            >
              <Ruler className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {measureTool.active ? 'Measuring Mode (Click to disable)' : 'Measure Tool'}
          </TooltipContent>
        </Tooltip>

        {measureTool.distance !== null && (
          <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded">
            <span className="font-medium">{measureTool.distance.toFixed(2)}mm</span>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onClearMeasure}>
              ×
            </Button>
          </div>
        )}

        {/* Camera/Fit Controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7"
              onClick={onFitToSelection}
              disabled={!hasSelection}
            >
              <Focus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Selection</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7"
              onClick={onFitToScene}
            >
              <Fullscreen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to Scene</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* View Mode */}
        <div className="flex items-center bg-muted/50 rounded-md p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'solid' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7"
                onClick={() => onViewModeChange('solid')}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Solid View</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === 'wireframe' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7"
                onClick={() => onViewModeChange('wireframe')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Wireframe View</TooltipContent>
          </Tooltip>
        </div>

        {/* Grid/Axes toggles */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showGrid ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7"
              onClick={onToggleGrid}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Grid</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Export */}
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>
    </TooltipProvider>
  );
}
