"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { Canvas as FabricCanvas, PencilBrush, IText, FabricObject, FabricImage } from "fabric";
import { Note, PageMode, BackgroundStyle, DrawingSettings, DEFAULT_DRAWING_SETTINGS, LassoMode, NotePage } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageNavigation } from "./PageNavigation";
import { renderPdfPageToDataUrl, getPdfInfo } from "@/lib/pdf-renderer";
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
  Calculator,
  FileText,
  Bot,
  Plus,
  MousePointer2,
  Lasso,
  Move,
  Lock,
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { ResearchPanel } from "./modules/ResearchPanel";
import { CalculatorModule } from "./modules/CalculatorModule";
import { ArloAIModule } from "./modules/ArloAIModule";
import { toast } from "sonner";

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
  onSaveNote?: (note: Note) => void; // Full note update for pages
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  heading: string | null;
  list: string | null;
  align: string;
}

interface HistoryState {
  json: string;
  timestamp: number;
}

const BACKGROUND_STYLES: { id: BackgroundStyle; label: string; icon: React.ElementType }[] = [
  { id: "blank", label: "Blank", icon: Square },
  { id: "lined", label: "Lined", icon: StretchHorizontal },
  { id: "dotted", label: "Dotted", icon: Circle },
  { id: "grid", label: "Grid", icon: Grid3X3 },
];

const MAX_HISTORY = 50;

export function PageNoteEditor({ note, onSave, onSaveNote }: PageNoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  
  // Use locked pageMode from note if available, otherwise default
  const lockedMode = note.pageMode;
  const [mode, setMode] = useState<PageMode>(lockedMode || note.pageMode || "type");
  const [backgroundStyle, setBackgroundStyle] = useState<BackgroundStyle>(note.backgroundStyle || "lined");
  const [formatState, setFormatState] = useState<FormatState>({
    bold: false,
    italic: false,
    underline: false,
    heading: null,
    list: null,
    align: "left",
  });
  const [settings, setSettings] = useState<DrawingSettings>({
    ...DEFAULT_DRAWING_SETTINGS,
    lassoMode: "freeform" as LassoMode,
  });
  
  // Multi-page support
  const [currentPage, setCurrentPage] = useState(note.currentPage || 1);
  const [pages, setPages] = useState<NotePage[]>(note.pages || [
    { id: `page-1-${Date.now()}`, pageNumber: 1, canvasState: '{}' }
  ]);
  const [pdfBackgroundUrl, setPdfBackgroundUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  
  // Enhanced undo/redo history
  const [undoStack, setUndoStack] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const isUndoingRef = useRef(false);
  
  // Modules
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [arloAiOpen, setArloAiOpen] = useState(false);
  
  // Apple Pencil detection
  const [isPencilOnly, setIsPencilOnly] = useState(true);

  // Parse stored content and initialize pages
  useEffect(() => {
    // Initialize pages from note
    if (note.pages && note.pages.length > 0) {
      setPages(note.pages);
    } else {
      // Create a default page
      setPages([{ id: `page-1-${Date.now()}`, pageNumber: 1, canvasState: '{}' }]);
    }
    setCurrentPage(note.currentPage || 1);
    
    if (note.canvasState) {
      try {
        const content = JSON.parse(note.canvasState);
        if (content.html && editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(content.html);
        }
        if (content.backgroundStyle) {
          setBackgroundStyle(content.backgroundStyle);
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

  // Load PDF background when on a page with PDF
  useEffect(() => {
    const loadPdfBackground = async () => {
      if (!note.importedPdfUrl || mode !== "write") {
        setPdfBackgroundUrl(null);
        return;
      }

      setIsLoadingPdf(true);
      try {
        const dataUrl = await renderPdfPageToDataUrl(note.importedPdfUrl, currentPage, 2);
        setPdfBackgroundUrl(dataUrl);
      } catch (error) {
        console.error('Failed to load PDF page:', error);
        toast.error('Failed to load PDF page');
      } finally {
        setIsLoadingPdf(false);
      }
    };

    loadPdfBackground();
  }, [note.importedPdfUrl, currentPage, mode]);

  // Set PDF as Fabric.js background when loaded
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !pdfBackgroundUrl || mode !== "write") return;

    FabricImage.fromURL(pdfBackgroundUrl).then((img) => {
      // Scale image to fit the canvas
      const container = pageContainerRef.current;
      if (!container) return;
      
      const canvasWidth = container.clientWidth;
      const canvasHeight = Math.max(container.clientHeight, 1056);
      
      const scale = Math.min(
        canvasWidth / (img.width || canvasWidth),
        canvasHeight / (img.height || canvasHeight)
      );
      
      img.scale(scale);
      canvas.backgroundImage = img;
      canvas.renderAll();
    }).catch((err) => {
      console.error('Failed to set PDF background:', err);
    });
  }, [pdfBackgroundUrl, mode]);

  // Initialize Fabric canvas for Write mode with Apple Pencil support
  useEffect(() => {
    if (mode !== "write" || !canvasRef.current || !pageContainerRef.current) return;

    const container = pageContainerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: Math.max(container.clientHeight, 1056),
      backgroundColor: "transparent",
      isDrawingMode: true,
      allowTouchScrolling: false,
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
          // Initialize history with current state
          const initialState = JSON.stringify(canvas.toJSON());
          setUndoStack([{ json: initialState, timestamp: Date.now() }]);
        });
      } else {
        // Initialize empty history
        const initialState = JSON.stringify(canvas.toJSON());
        setUndoStack([{ json: initialState, timestamp: Date.now() }]);
      }
    } catch {
      const initialState = JSON.stringify(canvas.toJSON());
      setUndoStack([{ json: initialState, timestamp: Date.now() }]);
    }

    // Auto-save on changes
    const handleChange = () => {
      if (!isUndoingRef.current) {
        saveContent();
        // Add to history
        const json = JSON.stringify(canvas.toJSON());
        setUndoStack(prev => {
          const newStack = [...prev, { json, timestamp: Date.now() }];
          return newStack.slice(-MAX_HISTORY);
        });
        setRedoStack([]);
      }
    };

    canvas.on("object:added", handleChange);
    canvas.on("object:modified", handleChange);
    canvas.on("object:removed", handleChange);

    // Apple Pencil detection - only allow pencil input
    const handleTouchStart = (e: TouchEvent) => {
      if (!isPencilOnly) return;
      
      const touch = e.touches[0];
      // Check if it's Apple Pencil (touchType === 'stylus')
      if (touch && (touch as any).touchType !== 'stylus') {
        // It's a finger touch, disable drawing
        canvas.isDrawingMode = false;
        e.preventDefault();
      } else {
        // It's Apple Pencil
        if (settings.tool === "pen" || settings.tool === "highlighter") {
          canvas.isDrawingMode = true;
        }
      }
    };

    const handleTouchEnd = () => {
      // Restore drawing mode based on current tool
      if (settings.tool === "pen" || settings.tool === "highlighter") {
        canvas.isDrawingMode = true;
      }
    };

    canvasRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasRef.current.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvasRef.current?.removeEventListener('touchstart', handleTouchStart);
      canvasRef.current?.removeEventListener('touchend', handleTouchEnd);
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [mode, note.id, isPencilOnly]);

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
      canvas.selection = false;
    } else if (settings.tool === "select" || settings.tool === "lasso") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
    } else if (settings.tool === "text") {
      canvas.isDrawingMode = false;
      canvas.selection = true;
    } else {
      canvas.isDrawingMode = false;
    }
  }, [settings, mode]);

  // Save content helper
  const saveContent = useCallback(() => {
    const content: Record<string, unknown> = {
      mode,
      backgroundStyle,
    };

    if (mode === "type" && editorRef.current) {
      content.html = sanitizeHtml(editorRef.current.innerHTML);
    }

    if (mode === "write" && fabricRef.current) {
      content.canvasJson = JSON.stringify(fabricRef.current.toJSON());
    }

    onSave(JSON.stringify(content));
  }, [mode, backgroundStyle, onSave]);

  // Page navigation handlers
  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      // Save current page state first
      if (fabricRef.current) {
        const updatedPages = [...pages];
        const pageIndex = updatedPages.findIndex(p => p.pageNumber === currentPage);
        if (pageIndex >= 0) {
          updatedPages[pageIndex].canvasState = JSON.stringify(fabricRef.current.toJSON());
        }
        setPages(updatedPages);
      }
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, pages]);

  const handleNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      // Save current page state first
      if (fabricRef.current) {
        const updatedPages = [...pages];
        const pageIndex = updatedPages.findIndex(p => p.pageNumber === currentPage);
        if (pageIndex >= 0) {
          updatedPages[pageIndex].canvasState = JSON.stringify(fabricRef.current.toJSON());
        }
        setPages(updatedPages);
      }
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, pages]);

  const handleAddPage = useCallback(() => {
    const newPageNumber = pages.length + 1;
    const newPage: NotePage = {
      id: `page-${newPageNumber}-${Date.now()}`,
      pageNumber: newPageNumber,
      canvasState: '{}',
    };
    
    // Save current page state first
    if (fabricRef.current) {
      const updatedPages = [...pages];
      const pageIndex = updatedPages.findIndex(p => p.pageNumber === currentPage);
      if (pageIndex >= 0) {
        updatedPages[pageIndex].canvasState = JSON.stringify(fabricRef.current.toJSON());
      }
      setPages([...updatedPages, newPage]);
    } else {
      setPages([...pages, newPage]);
    }
    
    setCurrentPage(newPageNumber);
    toast.success(`Page ${newPageNumber} added`);
  }, [pages, currentPage]);

  // Auto-save when background changes
  useEffect(() => {
    saveContent();
  }, [backgroundStyle]);

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

  // Enhanced eraser - click to remove objects
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (settings.tool === "eraser") {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const objects = canvas.getObjects();
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj.containsPoint({ x, y } as any)) {
          if (settings.eraserType === "stroke") {
            canvas.remove(obj);
            saveContent();
          }
          break;
        }
      }
      canvas.renderAll();
    } else if (settings.tool === "text") {
      // Add text box
      const rect = pageContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

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
    }
  }, [settings, saveContent]);

  // Enhanced Undo/Redo
  const handleUndo = useCallback(() => {
    if (mode === "type") {
      document.execCommand("undo");
      saveContent();
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas || undoStack.length <= 1) return;

    isUndoingRef.current = true;
    
    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(previousState.json)).then(() => {
      canvas.renderAll();
      saveContent();
      isUndoingRef.current = false;
    });
  }, [mode, undoStack, saveContent]);

  const handleRedo = useCallback(() => {
    if (mode === "type") {
      document.execCommand("redo");
      saveContent();
      return;
    }

    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;

    isUndoingRef.current = true;

    const nextState = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(nextState.json)).then(() => {
      canvas.renderAll();
      saveContent();
      isUndoingRef.current = false;
    });
  }, [mode, redoStack, saveContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Touch gestures: 2-finger tap = undo, 3-finger tap = redo
  useEffect(() => {
    const container = pageContainerRef.current;
    if (!container) return;

    let touchStartTime = 0;
    let touchStartCount = 0;
    let touchStartPositions: { x: number; y: number }[] = [];

    const TAP_THRESHOLD_MS = 300;
    const TAP_MOVEMENT_THRESHOLD = 20;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now();
      touchStartCount = e.touches.length;
      touchStartPositions = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const elapsed = Date.now() - touchStartTime;
      if (elapsed > TAP_THRESHOLD_MS) return;

      // Check movement
      const endPositions = Array.from(e.changedTouches).map(t => ({ x: t.clientX, y: t.clientY }));
      let moved = false;
      for (const end of endPositions) {
        const start = touchStartPositions.find(s => 
          Math.abs(s.x - end.x) < TAP_MOVEMENT_THRESHOLD * 2 && 
          Math.abs(s.y - end.y) < TAP_MOVEMENT_THRESHOLD * 2
        );
        if (start && (Math.abs(start.x - end.x) > TAP_MOVEMENT_THRESHOLD || Math.abs(start.y - end.y) > TAP_MOVEMENT_THRESHOLD)) {
          moved = true;
          break;
        }
      }

      if (moved) return;

      if (touchStartCount === 2 && e.touches.length === 0) {
        handleUndo();
        toast.info("Undo", { duration: 1000 });
      } else if (touchStartCount === 3 && e.touches.length === 0) {
        handleRedo();
        toast.info("Redo", { duration: 1000 });
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleUndo, handleRedo]);

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
      case "lined": return "100% 32px";
      case "dotted": return "24px 24px";
      case "grid": return "24px 24px";
      default: return "auto";
    }
  };

  const ToolbarButton = ({
    icon: Icon,
    label,
    isActive,
    onClick,
    disabled,
  }: {
    icon: React.ElementType;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            className="h-8 w-8 p-0"
            disabled={disabled}
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

  // Mode is locked after creation
  const canChangeMode = !lockedMode;

  return (
    <div className="flex h-full flex-col bg-muted/30 relative print:bg-white print:m-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b border-border/60 bg-card/80 px-4 py-2 flex-wrap backdrop-blur-sm print:hidden">
        {/* Mode Toggle - LOCKED if pageMode is set */}
        <div className="flex items-center gap-1 pr-3 border-r border-border/40">
          {canChangeMode ? (
            <>
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
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-md">
              <Lock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium capitalize">{lockedMode} Mode</span>
            </div>
          )}
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
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" isActive={formatState.bold} onClick={() => execCommand("bold")} />
            <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" isActive={formatState.italic} onClick={() => execCommand("italic")} />
            <ToolbarButton icon={Underline} label="Underline (Ctrl+U)" isActive={formatState.underline} onClick={() => execCommand("underline")} />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton icon={Heading1} label="Heading 1" onClick={() => formatHeading("h1")} />
            <ToolbarButton icon={Heading2} label="Heading 2" onClick={() => formatHeading("h2")} />
            <ToolbarButton icon={Heading3} label="Heading 3" onClick={() => formatHeading("h3")} />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton icon={List} label="Bullet List" isActive={formatState.list === "ul"} onClick={() => execCommand("insertUnorderedList")} />
            <ToolbarButton icon={ListOrdered} label="Numbered List" isActive={formatState.list === "ol"} onClick={() => execCommand("insertOrderedList")} />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton icon={Quote} label="Quote" onClick={() => formatHeading("blockquote")} />
            <ToolbarButton icon={Code} label="Code" onClick={() => formatHeading("pre")} />
            <ToolbarButton icon={Minus} label="Horizontal Rule" onClick={() => execCommand("insertHorizontalRule")} />

            <Separator orientation="vertical" className="mx-2 h-6" />

            <ToolbarButton icon={AlignLeft} label="Align Left" isActive={formatState.align === "left"} onClick={() => execCommand("justifyLeft")} />
            <ToolbarButton icon={AlignCenter} label="Align Center" isActive={formatState.align === "center"} onClick={() => execCommand("justifyCenter")} />
            <ToolbarButton icon={AlignRight} label="Align Right" isActive={formatState.align === "right"} onClick={() => execCommand("justifyRight")} />
          </>
        )}

        {/* Write mode tools */}
        {mode === "write" && (
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={undoStack.length <= 1} title="Undo (Ctrl+Z)">
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
              <Redo className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="mx-2 h-6" />

            {/* Selection tools */}
            <Button
              variant={settings.tool === "select" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "select" })}
              title="Select (V)"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
            
            {/* Lasso with mode toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={settings.tool === "lasso" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  title="Lasso Select (L)"
                >
                  <Lasso className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSettings({ ...settings, tool: "lasso", lassoMode: "freeform" })}>
                  Freeform Lasso
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSettings({ ...settings, tool: "lasso", lassoMode: "rectangle" })}>
                  Rectangle Select
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="mx-2 h-6" />

            <Button
              variant={settings.tool === "pen" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "pen" })}
              title="Pen (P)"
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.tool === "text" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "text" })}
              title="Text Box (T)"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button
              variant={settings.tool === "eraser" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={() => setSettings({ ...settings, tool: "eraser" })}
              title="Eraser (E)"
            >
              <Eraser className="h-4 w-4" />
            </Button>

            {/* Color picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <div className="h-5 w-5 rounded-full border-2 border-border" style={{ backgroundColor: settings.color }} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="center" side="bottom">
                <div className="flex flex-wrap gap-2 max-w-[180px]">
                  {["#1a1a1a", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"].map(color => (
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

        {/* Add Module Dropdown - Available in ALL modes */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5">
              <Plus className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">Add Module</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setResearchPanelOpen(true)}>
              <Globe className="h-4 w-4 mr-2" />
              Web Search
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setCalculatorOpen(true)}>
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setArloAiOpen(true)}>
              <Bot className="h-4 w-4 mr-2" />
              Arlo AI
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("PDF viewer coming soon")}>
              <FileText className="h-4 w-4 mr-2" />
              PDF Viewer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Document Page Area */}
      <div className="flex-1 overflow-auto flex justify-center py-8 px-4 print:py-0 print:px-0">
        <div
          ref={pageContainerRef}
          data-note-content="true"
          className={cn(
            "relative bg-white dark:bg-zinc-900 rounded-sm shadow-xl print:shadow-none print:rounded-none",
            "w-full max-w-[816px] min-h-[1056px]",
            "border border-border/20 print:border-0"
          )}
          style={{
            background: getBackgroundCSS(),
            backgroundSize: getBackgroundSize(),
            backgroundColor: "hsl(var(--background))",
          }}
          onClick={mode === "write" ? handleCanvasClick : undefined}
        >
          {/* Type Mode Editor */}
          {mode === "type" && (
            <div className="p-12 pt-16 print:p-8">
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleInput}
                onMouseUp={updateFormatState}
                onKeyUp={updateFormatState}
                className={cn(
                  "min-h-[calc(1056px-8rem)] outline-none print:min-h-0",
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
              className="absolute inset-0 w-full h-full touch-none"
              style={{ touchAction: 'none' }}
            />
          )}
        </div>
      </div>

      {/* Page Navigation - always visible for page notes */}
      <PageNavigation
        currentPage={currentPage}
        totalPages={pages.length}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
        onAddPage={handleAddPage}
        showAddButton={!note.importedPdfUrl} // Don't allow adding pages to imported PDFs
        className="print:hidden"
      />

      {/* Modules */}
      <ResearchPanel
        isOpen={researchPanelOpen}
        onClose={() => setResearchPanelOpen(false)}
        onInsertLink={handleInsertLink}
      />

      {calculatorOpen && (
        <div className="fixed bottom-20 right-4 z-50">
          <CalculatorModule 
            id="page-calculator"
            onClose={() => setCalculatorOpen(false)} 
            onDragResult={(result) => {
              if (mode === "type" && editorRef.current) {
                document.execCommand("insertText", false, result);
                saveContent();
              }
            }}
          />
        </div>
      )}

      {arloAiOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-80">
          <ArloAIModule 
            id="page-arlo-ai"
            onClose={() => setArloAiOpen(false)} 
            noteContent={editorRef.current?.innerText || ""}
            onInsertText={(text) => {
              if (mode === "type" && editorRef.current) {
                document.execCommand("insertText", false, text);
                saveContent();
              }
            }}
          />
        </div>
      )}

      {/* Styles for placeholder */}
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
          pointer-events: none;
        }
        @media print {
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
