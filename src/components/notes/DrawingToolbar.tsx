import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Circle,
  Eraser,
  Hand,
  Highlighter,
  ImagePlus,
  Lasso,
  Minus,
  MousePointer2,
  Pen,
  Plus,
  Redo2,
  Square,
  Triangle,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  DrawingSettings,
  DrawingTool,
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
  ShapeType,
  STROKE_WIDTHS,
} from "@/types/notes";

interface DrawingToolbarProps {
  settings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

const TOOLS: { id: DrawingTool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
  { id: "lasso", icon: Lasso, label: "Lasso Select" },
  { id: "text", icon: Type, label: "Text" },
  { id: "shape", icon: Square, label: "Shape" },
  { id: "image", icon: ImagePlus, label: "Image" },
];

const SHAPES: { id: ShapeType; icon: React.ElementType; label: string }[] = [
  { id: "line", icon: Minus, label: "Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
];

export function DrawingToolbar({
  settings,
  onSettingsChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  zoom,
  onZoomChange,
}: DrawingToolbarProps) {
  const [showShapes, setShowShapes] = useState(false);

  const updateSettings = (partial: Partial<DrawingSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const colors = settings.tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 rounded-2xl border border-border/60 bg-card/95 px-2 py-2 shadow-xl backdrop-blur-xl">
        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border/40">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-0.5 px-2 border-r border-border/40">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = settings.tool === tool.id;
            
            if (tool.id === "shape") {
              return (
                <Popover key={tool.id} open={showShapes} onOpenChange={setShowShapes}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        isActive && "bg-primary/10 text-primary ring-1 ring-primary/20"
                      )}
                      title={tool.label}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" align="center" side="top">
                    <div className="flex items-center gap-1">
                      {SHAPES.map((shape) => {
                        const ShapeIcon = shape.icon;
                        return (
                          <Button
                            key={shape.id}
                            variant={settings.shape === shape.id ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8 rounded-lg"
                            onClick={() => {
                              updateSettings({ tool: "shape", shape: shape.id });
                              setShowShapes(false);
                            }}
                            title={shape.label}
                          >
                            <ShapeIcon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              );
            }
            
            return (
              <Button
                key={tool.id}
                variant={isActive ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-xl transition-all",
                  isActive && "bg-primary/10 text-primary ring-1 ring-primary/20"
                )}
                onClick={() => updateSettings({ tool: tool.id })}
                title={tool.label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>

        {/* Color Picker */}
        {(settings.tool === "pen" || settings.tool === "highlighter" || settings.tool === "shape") && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <div
                  className="h-5 w-5 rounded-full border-2 border-border shadow-inner"
                  style={{ backgroundColor: settings.color }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="center" side="top">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2 max-w-[180px]">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                        settings.color === color
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border/60"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => updateSettings({ color })}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Stroke Width */}
        {(settings.tool === "pen" || settings.tool === "highlighter" || settings.tool === "shape") && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <div className="flex items-center justify-center">
                  <div
                    className="rounded-full bg-foreground"
                    style={{
                      width: Math.min(16, settings.strokeWidth * 2),
                      height: Math.min(16, settings.strokeWidth * 2),
                    }}
                  />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-4" align="center" side="top">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Stroke Width</p>
                <Slider
                  value={[settings.strokeWidth]}
                  onValueChange={([value]) => updateSettings({ strokeWidth: value })}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between">
                  {STROKE_WIDTHS.map((width) => (
                    <button
                      key={width}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted",
                        settings.strokeWidth === width && "bg-primary/10"
                      )}
                      onClick={() => updateSettings({ strokeWidth: width })}
                    >
                      <div
                        className="rounded-full bg-foreground"
                        style={{
                          width: Math.min(20, width * 1.5),
                          height: Math.min(20, width * 1.5),
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 pl-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => onZoomChange(Math.max(0.25, zoom - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[3.5rem] text-center text-xs font-medium text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={() => onZoomChange(Math.min(4, zoom + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
