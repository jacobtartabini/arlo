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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PrimitiveType, TransformMode, ViewMode } from '@/types/creation';

interface CreationToolbarProps {
  transformMode: TransformMode;
  viewMode: ViewMode;
  isSaving: boolean;
  hasSelection: boolean;
  onAddPrimitive: (type: PrimitiveType) => void;
  onImportSTL: (file: File) => void;
  onTransformModeChange: (mode: TransformMode) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onSave: () => void;
  onNewProject: () => void;
  onExportSelected: () => void;
  onExportAll: () => void;
}

export function CreationToolbar({
  transformMode,
  viewMode,
  isSaving,
  hasSelection,
  onAddPrimitive,
  onImportSTL,
  onTransformModeChange,
  onViewModeChange,
  onSave,
  onNewProject,
  onExportSelected,
  onExportAll
}: CreationToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      onImportSTL(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const primitives: { type: PrimitiveType; icon: React.ElementType; label: string }[] = [
    { type: 'box', icon: Box, label: 'Box' },
    { type: 'sphere', icon: Circle, label: 'Sphere' },
    { type: 'cylinder', icon: Cylinder, label: 'Cylinder' },
    { type: 'cone', icon: Triangle, label: 'Cone' },
    { type: 'torus', icon: Donut, label: 'Torus' }
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
          <TooltipContent>Save Project</TooltipContent>
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
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Primitives</DropdownMenuLabel>
            {primitives.map(({ type, icon: Icon, label }) => (
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
              Import STL
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

        <div className="flex-1" />

        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Export STL
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={onExportSelected}
              disabled={!hasSelection}
            >
              Export Selected
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportAll}>
              Export All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
