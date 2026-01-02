"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Circle,
  Eraser,
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
  Copy,
  Clipboard,
  Scissors,
  MoreHorizontal,
  Hand,
  FileType,
} from "lucide-react";
import {
  DrawingSettings,
  DrawingTool,
  EraserType,
  HIGHLIGHTER_COLORS,
  PEN_COLORS,
  PenStyle,
  ShapeType,
  STROKE_WIDTHS,
} from "@/types/notes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface DrawingToolbarProps {
  settings: DrawingSettings;
  onSettingsChange: (settings: DrawingSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  hasClipboard?: boolean;
  onConvertToText?: () => void;
  palmRejectionEnabled?: boolean;
  onPalmRejectionChange?: (enabled: boolean) => void;
  onImageUpload?: (file: File) => void;
}

const TOOLS: { id: DrawingTool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "pen", icon: Pen, label: "Pen (P)" },
  { id: "highlighter", icon: Highlighter, label: "Highlighter (H)" },
  { id: "eraser", icon: Eraser, label: "Eraser (E)" },
  { id: "lasso", icon: Lasso, label: "Lasso Select (L)" },
  { id: "text", icon: Type, label: "Text (T)" },
  { id: "shape", icon: Square, label: "Shape (S)" },
  { id: "image", icon: ImagePlus, label: "Image (I)" },
];

const SHAPES: { id: ShapeType; icon: React.ElementType; label: string }[] = [
  { id: "line", icon: Minus, label: "Line" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "triangle", icon: Triangle, label: "Triangle" },
];

const PEN_STYLES: { id: PenStyle; label: string; width: number }[] = [
  { id: "fine", label: "Fine", width: 1 },
  { id: "medium", label: "Medium", width: 2 },
  { id: "thick", label: "Thick", width: 4 },
  { id: "brush", label: "Brush", width: 8 },
  { id: "calligraphy", label: "Calligraphy", width: 3 },
];

const ERASER_TYPES: { id: EraserType; label: string; description: string }[] = [
  { id: "stroke", label: "Stroke Eraser", description: "Remove entire strokes at once" },
  { id: "precision", label: "Precision Eraser", description: "Erase portions of strokes" },
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
  onCopy,
  onPaste,
  onCut,
  hasClipboard,
  onConvertToText,
  palmRejectionEnabled = true,
  onPalmRejectionChange,
  onImageUpload,
}: DrawingToolbarProps) {
  const [showShapes, setShowShapes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSettings = (partial: Partial<DrawingSettings>) => {
    onSettingsChange({ ...settings, ...partial });
  };

  const colors = settings.tool === "highlighter" ? HIGHLIGHTER_COLORS : PEN_COLORS;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      onImageUpload(file);
    }
    e.target.value = "";
  };

  // Keyboard shortcuts for tools
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    switch (e.key.toLowerCase()) {
      case "v": updateSettings({ tool: "select" }); break;
      case "p": updateSettings({ tool: "pen" }); break;
      case "h": updateSettings({ tool: "highlighter" }); break;
      case "e": updateSettings({ tool: "eraser" }); break;
      case "l": updateSettings({ tool: "lasso" }); break;
      case "t": updateSettings({ tool: "text" }); break;
      case "s": updateSettings({ tool: "shape" }); break;
      case "i": 
        updateSettings({ tool: "image" });
        fileInputRef.current?.click();
        break;
    }
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

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
              title="Undo (⌘Z)"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (⌘⇧Z)"
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

              if (tool.id === "image") {
                return (
                  <Button
                    key={tool.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl transition-all",
                      isActive && "bg-primary/10 text-primary ring-1 ring-primary/20"
                    )}
                    onClick={() => {
                      updateSettings({ tool: tool.id });
                      fileInputRef.current?.click();
                    }}
                    title={tool.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
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
          {(settings.tool === "pen" || settings.tool === "highlighter" || settings.tool === "shape" || settings.tool === "text") && (
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

          {/* Pen Style - for pen and highlighter */}
          {(settings.tool === "pen" || settings.tool === "highlighter") && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 rounded-xl px-2 gap-1">
                  <Pen className="h-3.5 w-3.5" />
                  <span className="text-xs capitalize">{settings.penStyle || "medium"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="center" side="top">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Pen Style</p>
                {PEN_STYLES.map((style) => (
                  <button
                    key={style.id}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                      settings.penStyle === style.id && "bg-primary/10 text-primary"
                    )}
                    onClick={() => updateSettings({ penStyle: style.id, strokeWidth: style.width })}
                  >
                    <span>{style.label}</span>
                    <div
                      className="rounded-full bg-foreground"
                      style={{ width: style.width * 2, height: style.width * 2 }}
                    />
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {/* Eraser Type - for eraser tool */}
          {settings.tool === "eraser" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 rounded-xl px-2 gap-1">
                  <Eraser className="h-3.5 w-3.5" />
                  <span className="text-xs capitalize">{settings.eraserType || "stroke"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="center" side="top">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Eraser Type</p>
                {ERASER_TYPES.map((eraser) => (
                  <button
                    key={eraser.id}
                    className={cn(
                      "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",
                      settings.eraserType === eraser.id && "bg-primary/10"
                    )}
                    onClick={() => updateSettings({ eraserType: eraser.id })}
                  >
                    <span className={cn(
                      "text-sm font-medium",
                      settings.eraserType === eraser.id && "text-primary"
                    )}>
                      {eraser.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{eraser.description}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}

          {/* Copy/Paste/Cut for lasso */}
          {(settings.tool === "lasso" || settings.tool === "select") && (
            <div className="flex items-center gap-0.5 px-2 border-l border-border/40">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={onCopy}
                title="Copy (⌘C)"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={onCut}
                title="Cut (⌘X)"
              >
                <Scissors className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-xl",
                  hasClipboard && "text-primary"
                )}
                onClick={onPaste}
                disabled={!hasClipboard}
                title="Paste (⌘V)"
              >
                <Clipboard className="h-4 w-4" />
              </Button>
              {onConvertToText && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl"
                  onClick={onConvertToText}
                  title="Convert to text"
                >
                  <FileType className="h-4 w-4" />
                </Button>
              )}
            </div>
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

          {/* More options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl ml-1">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <div className="flex items-center justify-between px-2 py-2">
                <Label htmlFor="palm-rejection" className="text-sm flex items-center gap-2">
                  <Hand className="h-4 w-4" />
                  Palm Rejection
                </Label>
                <Switch
                  id="palm-rejection"
                  checked={palmRejectionEnabled}
                  onCheckedChange={onPalmRejectionChange}
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onZoomChange(1)}>
                Reset Zoom (100%)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onZoomChange(0.5)}>
                Fit to View (50%)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
