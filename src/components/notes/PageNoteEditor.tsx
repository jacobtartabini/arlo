"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { Canvas as FabricCanvas, PencilBrush, IText, FabricObject } from "fabric";
import { Note, PageMode, BackgroundStyle, DrawingSettings, DEFAULT_DRAWING_SETTINGS } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Pen,
  Grid3X3,
  StretchHorizontal,
  Circle,
  Square,
  Eraser,
  Globe,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ResearchPanel } from "./modules/ResearchPanel";

// Configure DOMPurify with strict allowlist for rich text editing
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 
  'blockquote', 'pre', 'code', 
  'hr', 'div', 'span'
];

const ALLOWED_ATTR = ['style', 'class'];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true,
  });
}

interface PageNoteEditorProps {
  note: Note;
  onSave: (content: string) => void;
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: string | null;
  list: string | null;
  align: string;
}

const BACKGROUND_STYLES: { id: BackgroundStyle; label: string; icon: React.ElementType }[] = [
  { id: "blank", label: "Blank", icon: Square },
  { id: "lined", label: "Lined", icon: StretchHorizontal },
  { id: "dotted", label: "Dotted", icon: Circle },
  { id: "grid", label: "Grid", icon: Grid3X3 },
];

export function PageNoteEditor({ note, onSave }: PageNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  
  const [mode, setMode] = useState<PageMode>(note.pageMode || "type");
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(note.backgroundStyle || "lined");
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    heading: null,
    list: null,
    align: "left",
  });
  const [settings, setSettings] = useState<DrawingSettings>(DEFAULT_DRAWING_SETTINGS);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [textBoxes, setTextBoxes] = useState<Array<{ id: string; x: number; y: number; content: string }>>([]);
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);

  // Parse stored content
  useEffect(() => {
    if (note.canvasState) {
      try {
        const content = JSON.parse(note.canvasState);
        if (content.html && editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(content.html);
        }
        if (content.mode) {
          setMode(content.mode);
        }
        if (content.backgroundStyle) {
          setBackgroundStyle(content.backgroundStyle);
        }
        if (content.textBoxes) {
          setTextBoxes(content.textBoxes);
        }
        if (content.canvasJson && fabricRef.current) {
          fabricRef.current.loadFromJSON(JSON.parse(content.canvasJson)).then(() => {
            fabricRef.current?.renderAll();
          });
        }
      } catch {
        if (editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(note.canvasState || "");
        }
      }
    }
  }, [note.id]);

  // Initialize Fabric canvas for Write mode
  useEffect(() => {
    if (mode !== "write" || !canvasRef.current || !pageContainerRef.current) return;

    const container = pageContainerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: Math.max(container.clientHeight, 1056), // Letter size height at 96dpi
      backgroundColor: "transparent",
      isDrawingMode: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = settings.color;
    canvas.freeDrawingBrush.width = settings.strokeWidth;

    fabricRef.current = canvas;

    // Load existing canvas data
    try {
      const content = JSON.parse(note.canvasState || "{}");
      if (content.canvasJson) {
        canvas.loadFromJSON(JSON.parse(content.canvasJson)).then(() => {
          canvas.renderAll();
        });
      }
    } catch {}

    // Auto-save on changes
    const handleChange = () => {
      saveContent();
    };

    canvas.on("object:added", handleChange);
    canvas.on("object:modified", handleChange);
    canvas.on("object:removed", handleChange);

    // Track history
    canvas.on("object:added", () => {
      const json = JSON.stringify(canvas.toJSON());
      setUndoStack(prev => [...prev, json]);
      setRedoStack([]);
    });

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [mode, note.id]);

  // Update brush settings
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || mode !== "write") return;

    if (settings.tool === "pen" || settings.tool === "highlighter") {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = settings.tool === "highlighter" 
          ? settings.color + "80" 
          : settings.color;
        canvas.freeDrawingBrush.width = settings.tool === "highlighter"
          ? settings.strokeWidth * 3
          : settings.strokeWidth;
      }
    } else if (settings.tool === "eraser") {
      canvas.isDrawingMode = false;
    } else if (settings.tool === "text") {
      canvas.isDrawingMode = false;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [settings, mode]);

  // Save content helper
  const saveContent = useCallback(() => {
    const content: Record<string, unknown> = {
      mode,
      backgroundStyle,
      textBoxes,
    };

    if (mode === "type" && editorRef.current) {
      content.html = sanitizeHtml(editorRef.current.innerHTML);
    }

    if (mode === "write" && fabricRef.current) {
      content.canvasJson = JSON.stringify(fabricRef.current.toJSON());
    }

    onSave(JSON.stringify(content));
  }, [mode, backgroundStyle, textBoxes, onSave]);

  // Auto-save when mode or background changes
  useEffect(() => {
    saveContent();
  }, [mode, backgroundStyle]);

  // Update format state based on current selection
  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      heading: null,
      list: document.queryCommandState("insertUnorderedList")
        ? "ul"
        : document.queryCommandState("insertOrderedList")
        ? "ol"
        : null,
      align: document.queryCommandState("justifyCenter")
        ? "center"
        : document.queryCommandState("justifyRight")
        ? "right"
        : "left",
    });
  }, []);

  // Auto-save on content change
  const handleInput = useCallback(() => {
    saveContent();
    updateFormatState();
  }, [saveContent, updateFormatState]);

  // Execute formatting command
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const formatHeading = (level: string) => {
    execCommand("formatBlock", level);
  };

  // Handle canvas click for eraser
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = fabricRef.current;
    if (!canvas || settings.tool !== "eraser") return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const objects = canvas.getObjects();
    for (const obj of objects) {
      if (obj.containsPoint({ x, y } as any)) {
        if (settings.eraserType === "stroke") {
          canvas.remove(obj);
        }
        break;
      }
    }
    canvas.renderAll();
  }, [settings]);

  // Handle adding text box in write mode
  const handleAddTextBox = useCallback((e: React.MouseEvent) => {
    if (settings.tool !== "text" || mode !== "write") return;

    const rect = pageContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const canvas = fabricRef.current;
    if (!canvas) return;

    const text = new IText("Click to edit", {
      left: x,
      top: y,
      fontSize: 16,
      fill: settings.color,
      fontFamily: "Inter, sans-serif",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
  }, [settings, mode]);

  // Undo/Redo for write mode
  const handleUndo = useCallback(() => {
    if (mode === "type") {
      execCommand("undo");
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas || undoStack.length <= 1) return;

    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(previousState)).then(() => {
      canvas.renderAll();
    });
  }, [mode, undoStack]);

  const handleRedo = useCallback(() => {
    if (mode === "type") {
      execCommand("redo");
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
      canvas.renderAll();
    });
  }, [mode, redoStack]);

  // Background pattern CSS
  const getBackgroundCSS = (): string => {
    switch (backgroundStyle) {
      case "lined":
        return "repeating-linear-gradient(to bottom, transparent, transparent 31px, hsl(var(--border) / 0.3) 31px, hsl(var(--border) / 0.3) 32px)";
      case "dotted":
        return "radial-gradient(circle, hsl(var(--border) / 0.4) 1px, transparent 1px)";
      case "grid":
        return `
          linear-gradient(to right, hsl(var(--border) / 0.2) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border) / 0.2) 1px, transparent 1px)
        `;
      default:
        return "none";
    }
  };

  const getBackgroundSize = (): string => {
    switch (backgroundStyle) {
      case "lined":
        return "100% 32px";
      case "dotted":
        return "24px 24px";
      case "grid":
        return "24px 24px";
      default:
        return "auto";
    }
  };

  const ToolbarButton = ({
    icon: Icon,
    label,
    isActive,
    onClick,
  }: {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  // Handler for inserting links from Research Panel
  const handleInsertLink = useCallback((url: string, title: string) => {
    if (mode === "type" && editorRef.current) {
      const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
      document.execCommand("insertHTML", false, link);
      saveContent();
    }
  }, [mode, saveContent]);

  return (
    <div className="flex h-full flex-col bg-muted/30 relative">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/60 bg-card/80 px-4 py-2 flex-wrap backdrop-blur-sm">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 pr-3 border-r border-border/40">
          <Button
            variant={mode === "type" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setMode("type")}
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">Type</span>
          </Button>
          <Button
            variant={mode === "write" ? "secondary" : "ghost"}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setMode("write")}
          >
            <Pen className="h-4 w-4" />
            <span className="text-xs">Write</span>
          </Button>
        </div>

        {/* Background Style */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 ml-1">
              {(() => {
                const bg = BACKGROUND_STYLES.find(b => b.id === backgroundStyle);
                const Icon = bg?.icon || Square;
                return <Icon className="h-4 w-4" />;
              })()}
              <span className="text-xs hidden sm:inline">Background</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {BACKGROUND_STYLES.map(bg => (
              <DropdownMenuItem
                key={bg.id}
                onClick={() => setBackgroundStyle(bg.id)}
                className={cn(backgroundStyle === bg.id && "bg-accent")}
              >
                <bg.icon className="h-4 w-4 mr-2" />
                {bg.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-2 h-6" />

        {/* Type mode tools */}
        {mode === "type" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton
              icon={Bold}
              label="Bold (Ctrl+B)"
              isActive={formatState.bold}
              onClick={() => execCommand("bold")}
            />
            <ToolbarButton
              icon={Italic}
              label="Italic (Ctrl+I)"
              isActive={formatState.italic}
              onClick={() => execCommand("italic")}
            />
            <ToolbarButton
              icon={Underline}
              label="Underline (Ctrl+U)"
              isActive={formatState.underline}
              onClick={() => execCommand("underline")}
            />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton
              icon={Heading1}
              label="Heading 1"
              onClick={() => formatHeading("h1")}
            />
            <ToolbarButton
              icon={Heading2}
              label="Heading 2"
              onClick={() => formatHeading("h2")}
            />
            <ToolbarButton
              icon={Heading3}
              label="Heading 3"
              onClick={() => formatHeading("h3")}
            />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton
              icon={List}
              label="Bullet List"
              isActive={formatState.list === "ul"}
              onClick={() => execCommand("insertUnorderedList")}
            />
            <ToolbarButton
              icon={ListOrdered}
              label="Numbered List"
              isActive={formatState.list === "ol"}
              onClick={() => execCommand("insertOrderedList")}
            />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton
              icon={Quote}
              label="Quote"
              onClick={() => formatHeading("blockquote")}
            />
            <ToolbarButton
              icon={Code}
              label="Code"
              onClick={() => formatHeading("pre")}
            />
            <ToolbarButton
              icon={Minus}
              label="Horizontal Rule"
              onClick={() => execCommand("insertHorizontalRule")}
            />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton
              icon={AlignLeft}
              label="Align Left"
              isActive={formatState.align === "left"}
              onClick={() => execCommand("justifyLeft")}
            />
            <ToolbarButton
              icon={AlignCenter}
              label="Align Center"
              isActive={formatState.align === "center"}
              onClick={() => execCommand("justifyCenter")}
            />
            <ToolbarButton
              icon={AlignRight}
              label="Align Right"
              isActive={formatState.align === "right"}
              onClick={() => execCommand("justifyRight")}
            />
          </>
        )}

        {/* Write mode tools in header */}
        {mode === "write" && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
              disabled={undoStack.length <= 1}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-2 h-6" />

            <Button
              variant={settings.tool === "pen" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "pen" })}
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.tool === "text" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "text" })}
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.tool === "eraser" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "eraser" })}
            >
              <Eraser className="h-4 w-4" />
            </Button>

            {/* Color picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <div
                    className="h-5 w-5 rounded-full border-2 border-border"
                    style={{ backgroundColor: settings.color }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="center" side="bottom">
                <div className="flex flex-wrap gap-2 max-w-[180px]">
                  {["#1a1a1a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"].map(color => (
                    <button
                      key={color}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                        settings.color === color ? "border-primary ring-2 ring-primary/30" : "border-border/60"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSettings({ ...settings, color })}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Stroke width */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: Math.min(14, settings.strokeWidth * 2), height: Math.min(14, settings.strokeWidth * 2) }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-4" align="center" side="bottom">
                <Slider
                  value={[settings.strokeWidth]}
                  onValueChange={([value]) => setSettings({ ...settings, strokeWidth: value })}
                  min={1}
                  max={12}
                  step={1}
                />
              </PopoverContent>
            </Popover>

            {/* Eraser type toggle */}
            {settings.tool === "eraser" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                    {settings.eraserType === "stroke" ? "Stroke" : "Precision"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSettings({ ...settings, eraserType: "stroke" })}>
                    Stroke (whole line)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSettings({ ...settings, eraserType: "precision" })}>
                    Precision (partial)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Research Panel Toggle */}
        <Button
          variant={researchPanelOpen ? "secondary" : "ghost"}
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setResearchPanelOpen(!researchPanelOpen)}
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Research</span>
        </Button>
      </div>

      {/* Document Page Area */}
      <div className="flex-1 overflow-auto flex justify-center py-8 px-4">
        <div
          ref={pageContainerRef}
          className={cn(
            "relative bg-white dark:bg-zinc-900 rounded-sm shadow-xl",
            "w-full max-w-[816px] min-h-[1056px]", // 8.5 x 11 inches at 96dpi
            "border border-border/20"
          )}
          style={{
            background: getBackgroundCSS(),
            backgroundSize: getBackgroundSize(),
            backgroundColor: "hsl(var(--background))",
          }}
          onClick={mode === "write" ? handleAddTextBox : undefined}
        >
          {/* Type Mode Editor */}
          {mode === "type" && (
            <div className="p-12 pt-16">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onMouseUp={updateFormatState}
                onKeyUp={updateFormatState}
                className={cn(
                  "min-h-[calc(1056px-8rem)] outline-none",
                  "prose prose-sm dark:prose-invert max-w-none",
                  "[&>*:first-child]:mt-0",
                  "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-8",
                  "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6",
                  "[&_h3]:text-xl [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:mt-4",
                  "[&_p]:text-base [&_p]:leading-relaxed [&_p]:mb-4",
                  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4",
                  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4",
                  "[&_li]:mb-1",
                  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_blockquote]:my-4",
                  "[&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-4",
                  "[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm",
                  "[&_hr]:border-border [&_hr]:my-6"
                )}
                data-placeholder="Start typing..."
              />
            </div>
          )}

          {/* Write Mode Canvas */}
          {mode === "write" && (
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              onClick={handleCanvasClick}
            />
          )}
        </div>
      </div>

      {/* Research Panel */}
      <ResearchPanel
        isOpen={researchPanelOpen}
        onClose={() => setResearchPanelOpen(false)}
        onInsertLink={handleInsertLink}
      />

      {/* Styles for placeholder */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
