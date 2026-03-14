"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import DOMPurify from "dompurify";
import { Canvas as FabricCanvas, PencilBrush, IText, FabricObject, FabricImage, Path } from "fabric";
import { Note, PageMode, BackgroundStyle, DrawingSettings, DEFAULT_DRAWING_SETTINGS, LassoMode, NotePage } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { renderPdfPageToDataUrl, getPdfInfo } from "@/lib/pdf-renderer";
import { useEraserTrail } from "./EraserTrail";
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
  onSaveNote?: (note: Note) => void;
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
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const fabricRef = useRef<FabricCanvas | null>(null);
  
  // Use locked pageMode from note if available
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
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  
  // Multi-page support with per-page state
  const [currentPage, setCurrentPage] = useState(note.currentPage || 1);
  const [pages, setPages] = useState<NotePage[]>(() => {
    if (note.pages && note.pages.length > 0) {
      return note.pages;
    }
    return [{ id: `page-1-${Date.now()}`, pageNumber: 1, canvasState: '{}' }];
  });
  const [pdfBackgroundUrl, setPdfBackgroundUrl] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pagePreviews, setPagePreviews] = useState<Map<number, string>>(new Map());
  
  // Page zoom/pan state (Notability-style pinch-to-zoom)
  const [pageZoom, setPageZoom] = useState(1);
  const [pagePanOffset, setPagePanOffset] = useState({ x: 0, y: 0 });
  const pageZoomRef = useRef(1);
  pageZoomRef.current = pageZoom;
  const pinchRef = useRef({
    active: false,
    initialDistance: 0,
    initialZoom: 1,
    lastCenter: { x: 0, y: 0 },
  });

  // Per-page undo/redo history
  const [pageHistories, setPageHistories] = useState<Map<number, { undoStack: HistoryState[]; redoStack: HistoryState[] }>>(
    new Map()
  );
  const isUndoingRef = useRef(false);
  
  // Eraser state
  const eraserActiveRef = useRef(false);
  const eraserLastPointRef = useRef<{ x: number; y: number } | null>(null);
  
  // Modules
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [arloAiOpen, setArloAiOpen] = useState(false);

  // Eraser trail hook
  const { startTrail, continueTrail, endTrail, clearTrail } = useEraserTrail({
    isActive: settings.tool === "eraser" && mode === "write",
    containerRef: canvasContainerRef as React.RefObject<HTMLElement>,
    strokeWidth: settings.strokeWidth,
    backgroundColor: backgroundStyle === "blank" ? "#ffffff" : "#ffffff",
  });

  // Get current page's history
  const getCurrentHistory = useCallback(() => {
    return pageHistories.get(currentPage) || { undoStack: [], redoStack: [] };
  }, [pageHistories, currentPage]);

  // Update current page's history
  const setCurrentHistory = useCallback((updater: (prev: { undoStack: HistoryState[]; redoStack: HistoryState[] }) => { undoStack: HistoryState[]; redoStack: HistoryState[] }) => {
    setPageHistories(prev => {
      const current = prev.get(currentPage) || { undoStack: [], redoStack: [] };
      const updated = updater(current);
      const newMap = new Map(prev);
      newMap.set(currentPage, updated);
      return newMap;
    });
  }, [currentPage]);

  // Save current page's canvas state to pages array
  const saveCurrentPageState = useCallback(() => {
    if (!fabricRef.current || mode !== "write") return;
    
    const canvasJson = JSON.stringify(fabricRef.current.toJSON());
    
    // Capture preview image for inactive page display
    try {
      const previewUrl = fabricRef.current.toDataURL({ format: 'png', quality: 0.3, multiplier: 0.25 });
      setPagePreviews(prev => {
        const newMap = new Map(prev);
        newMap.set(currentPage, previewUrl);
        return newMap;
      });
    } catch {
      // Preview generation is optional
    }
    
    setPages(prev => {
      const updated = [...prev];
      const pageIndex = updated.findIndex(p => p.pageNumber === currentPage);
      if (pageIndex >= 0) {
        updated[pageIndex] = { ...updated[pageIndex], canvasState: canvasJson };
      }
      return updated;
    });
  }, [currentPage, mode]);

  // Load a specific page's canvas state
  const loadPageState = useCallback((pageNumber: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const page = pages.find(p => p.pageNumber === pageNumber);
    if (!page) return;

    isUndoingRef.current = true;
    
    try {
      const canvasState = page.canvasState || '{}';
      canvas.loadFromJSON(JSON.parse(canvasState)).then(() => {
        canvas.renderAll();
        
        // Initialize history for this page if needed
        if (!pageHistories.has(pageNumber)) {
          setPageHistories(prev => {
            const newMap = new Map(prev);
            newMap.set(pageNumber, {
              undoStack: [{ json: canvasState, timestamp: Date.now() }],
              redoStack: [],
            });
            return newMap;
          });
        }
        
        isUndoingRef.current = false;
      });
    } catch (e) {
      console.error("Failed to load page state:", e);
      canvas.clear();
      isUndoingRef.current = false;
    }
  }, [pages, pageHistories]);

  // Initialize pages from note
  useEffect(() => {
    if (note.pages && note.pages.length > 0) {
      setPages(note.pages);
    } else {
      setPages([{ id: `page-1-${Date.now()}`, pageNumber: 1, canvasState: '{}' }]);
    }
    setCurrentPage(note.currentPage || 1);
    
    if (note.canvasState && mode === "type") {
      try {
        const content = JSON.parse(note.canvasState);
        if (content.html && editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(content.html);
        }
        if (content.backgroundStyle) {
          setBackgroundStyle(content.backgroundStyle);
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

  // Initialize Fabric canvas for Write mode
  useEffect(() => {
    if (mode !== "write" || !canvasRef.current || !pageContainerRef.current) return;

    const container = pageContainerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: Math.max(container.clientHeight, 1056),
      backgroundColor: "transparent",
      isDrawingMode: settingsRef.current.tool === "pen" || settingsRef.current.tool === "highlighter",
      allowTouchScrolling: false, // We handle touch ourselves
    });

    // ========================================
    // CORE PALM REJECTION + STYLUS-ONLY DRAWING
    // Block ALL non-pen (finger, mouse) from Fabric.js
    // ========================================
    canvas.on("mouse:down:before", (opt: any) => {
      const e = opt.e as PointerEvent;
      if (!e || typeof e.pointerType !== "string") return;
      
      if (e.pointerType === "pen") {
        // Apple Pencil — ensure drawing mode is active for drawing tools
        const tool = settingsRef.current.tool;
        if (tool === "pen" || tool === "highlighter") {
          canvas.isDrawingMode = true;
        }
      } else {
        // Finger or mouse — completely block from Fabric
        canvas.isDrawingMode = false;
        canvas.selection = false;
        opt.e = null; // Nullify so Fabric ignores this event
      }
    });

    // Restore drawing mode after any pointer up so next pen stroke works
    canvas.on("mouse:up", () => {
      const tool = settingsRef.current.tool;
      if (tool === "pen" || tool === "highlighter") {
        canvas.isDrawingMode = true;
      }
      canvas.selection = tool === "select" || tool === "lasso";
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = settings.color;
    canvas.freeDrawingBrush.width = settings.strokeWidth;

    fabricRef.current = canvas;

    // Load the current page's state
    const currentPageData = pages.find(p => p.pageNumber === currentPage);
    if (currentPageData?.canvasState && currentPageData.canvasState !== '{}') {
      try {
        canvas.loadFromJSON(JSON.parse(currentPageData.canvasState)).then(() => {
          canvas.renderAll();
          setPageHistories(prev => {
            const newMap = new Map(prev);
            if (!newMap.has(currentPage)) {
              newMap.set(currentPage, {
                undoStack: [{ json: currentPageData.canvasState, timestamp: Date.now() }],
                redoStack: [],
              });
            }
            return newMap;
          });
        });
      } catch {
        const initialState = JSON.stringify(canvas.toJSON());
        setPageHistories(prev => {
          const newMap = new Map(prev);
          newMap.set(currentPage, {
            undoStack: [{ json: initialState, timestamp: Date.now() }],
            redoStack: [],
          });
          return newMap;
        });
      }
    } else {
      const initialState = JSON.stringify(canvas.toJSON());
      setPageHistories(prev => {
        const newMap = new Map(prev);
        if (!newMap.has(currentPage)) {
          newMap.set(currentPage, {
            undoStack: [{ json: initialState, timestamp: Date.now() }],
            redoStack: [],
          });
        }
        return newMap;
      });
    }

    // Auto-save on changes
    const handleChange = () => {
      if (isUndoingRef.current) return;
      
      saveCurrentPageState();
      saveContent();
      
      const json = JSON.stringify(canvas.toJSON());
      setCurrentHistory(prev => ({
        undoStack: [...prev.undoStack, { json, timestamp: Date.now() }].slice(-MAX_HISTORY),
        redoStack: [],
      }));
    };

    canvas.on("object:added", handleChange);
    canvas.on("object:modified", handleChange);
    canvas.on("object:removed", handleChange);

    // DOM-level pointer blocking on Fabric's upper canvas element
    // This prevents non-pen events from reaching Fabric's internal handlers
    const upperCanvas = (canvas as any).upperCanvasEl as HTMLCanvasElement | undefined;
    const blockNonPen = (e: PointerEvent) => {
      if (e.pointerType !== "pen") {
        // Stop propagation to Fabric, but don't preventDefault
        // so finger scrolling/pinch still works on the container
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    
    if (upperCanvas) {
      upperCanvas.style.touchAction = 'none';
      upperCanvas.addEventListener('pointerdown', blockNonPen, { capture: true });
      upperCanvas.addEventListener('pointermove', blockNonPen, { capture: true });
    }

    return () => {
      if (upperCanvas) {
        upperCanvas.removeEventListener('pointerdown', blockNonPen, { capture: true });
        upperCanvas.removeEventListener('pointermove', blockNonPen, { capture: true });
      }
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [mode, note.id, currentPage]);

  // Update brush settings and handle eraser
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

  // Eraser with visual trail — stylus only (using Fabric events)
  const handleEraserStartFabric = useCallback((opt: any) => {
    const e = opt.e as PointerEvent;
    if (!e || e.pointerType !== "pen") return;
    
    const canvas = fabricRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    eraserActiveRef.current = true;
    
    const rect = container.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    eraserLastPointRef.current = point;
    startTrail(point);
    
    // Perform initial erase
    eraseAtPoint(point);
  }, [startTrail, eraseAtPoint]);

  const handleEraserMoveFabric = useCallback((opt: any) => {
    if (!eraserActiveRef.current) return;
    const e = opt.e as PointerEvent;
    if (!e || e.pointerType !== "pen") return;
    
    const canvas = fabricRef.current;
    const container = canvasContainerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    continueTrail(point);
    
    // Erase along path
    if (eraserLastPointRef.current) {
      eraseAlongPath(eraserLastPointRef.current, point);
    }
    
    eraserLastPointRef.current = point;
  }, [continueTrail, eraseAlongPath]);

  const handleEraserEndFabric = useCallback(() => {
    if (!eraserActiveRef.current) return;
    
    eraserActiveRef.current = false;
    eraserLastPointRef.current = null;
    endTrail();
  }, [endTrail]);

  // Attach eraser handlers to Fabric canvas events
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || mode !== "write") return;

    if (settingsRef.current.tool === "eraser") {
      canvas.on("mouse:down", handleEraserStartFabric);
      canvas.on("mouse:move", handleEraserMoveFabric);
      canvas.on("mouse:up", handleEraserEndFabric);
    }

    return () => {
      canvas.off("mouse:down", handleEraserStartFabric);
      canvas.off("mouse:move", handleEraserMoveFabric);
      canvas.off("mouse:up", handleEraserEndFabric);
    };
  }, [mode, settings.tool, handleEraserStartFabric, handleEraserMoveFabric, handleEraserEndFabric]);

  const eraseAtPoint = useCallback((point: { x: number; y: number }) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const radius = settings.eraserType === "precision" 
      ? settings.strokeWidth * 2 
      : settings.strokeWidth * 5;

    const objects = canvas.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (obj.containsPoint({ x: point.x, y: point.y } as any)) {
        canvas.remove(obj);
        if (settings.eraserType === "stroke") break; // Only remove one for stroke mode
      }
    }
    canvas.renderAll();
  }, [settings.eraserType, settings.strokeWidth]);

  const eraseAlongPath = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const radius = settings.eraserType === "precision" 
      ? settings.strokeWidth * 2 
      : settings.strokeWidth * 5;

    // Sample points along the line
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / 6));
    
    const objectsToRemove: FabricObject[] = [];
    const objects = canvas.getObjects();

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;

      for (const obj of objects) {
        if (objectsToRemove.includes(obj)) continue;
        
        // Check if object is within eraser radius
        const bounds = obj.getBoundingRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        
        if (Math.hypot(x - centerX, y - centerY) < radius + Math.max(bounds.width, bounds.height) / 2) {
          if (obj.containsPoint({ x, y } as any)) {
            objectsToRemove.push(obj);
            if (settings.eraserType === "stroke") break;
          }
        }
      }
    }

    objectsToRemove.forEach(obj => canvas.remove(obj));
    if (objectsToRemove.length > 0) {
      canvas.renderAll();
    }
  }, [settings.eraserType, settings.strokeWidth]);

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

    // Include pages data for persistence
    content.pages = pages;
    content.currentPage = currentPage;

    onSave(JSON.stringify(content));
  }, [mode, backgroundStyle, onSave, pages, currentPage]);

  // Page navigation handlers
  const handlePageChange = useCallback((pageNumber: number) => {
    if (pageNumber === currentPage) return;
    
    // Save current page state before switching
    saveCurrentPageState();
    
    // Clear eraser trail
    clearTrail();
    
    setCurrentPage(pageNumber);
  }, [currentPage, saveCurrentPageState, clearTrail]);

  // Detect active page from scroll position in continuous scroll
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScrollDetection = useCallback(() => {
    if (mode !== "write") return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    
    scrollTimeoutRef.current = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const viewportCenter = containerRect.top + containerRect.height / 2;
      
      let closestPage = currentPage;
      let closestDistance = Infinity;
      
      pageRefsMap.current.forEach((element, pageNum) => {
        const rect = element.getBoundingClientRect();
        const pageCenter = rect.top + rect.height / 2;
        const distance = Math.abs(viewportCenter - pageCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPage = pageNum;
        }
      });
      
      if (closestPage !== currentPage) {
        handlePageChange(closestPage);
      }
    }, 100);
  }, [mode, currentPage, handlePageChange]);

  // Load new page's state when page changes
  useEffect(() => {
    if (mode === "write" && fabricRef.current) {
      loadPageState(currentPage);
    }
  }, [currentPage, mode]);

  const handleAddPage = useCallback(() => {
    const newPageNumber = pages.length + 1;
    const newPage: NotePage = {
      id: `page-${newPageNumber}-${Date.now()}`,
      pageNumber: newPageNumber,
      canvasState: '{}',
    };
    
    // Save current page state first
    saveCurrentPageState();
    
    setPages(prev => [...prev, newPage]);
    setCurrentPage(newPageNumber);
    
    // Scroll to new page after render
    requestAnimationFrame(() => {
      const el = pageRefsMap.current.get(newPageNumber);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    
    toast.success(`Page ${newPageNumber} added`);
  }, [pages.length, saveCurrentPageState]);

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

  // Canvas click handler for eraser and text
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    if (settings.tool === "text") {
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
  }, [settings]);

  // Enhanced Undo/Redo with per-page history
  const handleUndo = useCallback(() => {
    if (mode === "type") {
      document.execCommand("undo");
      saveContent();
      return;
    }

    const canvas = fabricRef.current;
    const history = getCurrentHistory();
    if (!canvas || history.undoStack.length <= 1) return;

    isUndoingRef.current = true;
    
    const currentState = history.undoStack[history.undoStack.length - 1];
    const previousState = history.undoStack[history.undoStack.length - 2];

    setCurrentHistory(prev => ({
      undoStack: prev.undoStack.slice(0, -1),
      redoStack: [...prev.redoStack, currentState],
    }));

    canvas.loadFromJSON(JSON.parse(previousState.json)).then(() => {
      canvas.renderAll();
      saveContent();
      isUndoingRef.current = false;
    });
  }, [mode, getCurrentHistory, setCurrentHistory, saveContent]);

  const handleRedo = useCallback(() => {
    if (mode === "type") {
      document.execCommand("redo");
      saveContent();
      return;
    }

    const canvas = fabricRef.current;
    const history = getCurrentHistory();
    if (!canvas || history.redoStack.length === 0) return;

    isUndoingRef.current = true;

    const nextState = history.redoStack[history.redoStack.length - 1];

    setCurrentHistory(prev => ({
      undoStack: [...prev.undoStack, nextState],
      redoStack: prev.redoStack.slice(0, -1),
    }));

    canvas.loadFromJSON(JSON.parse(nextState.json)).then(() => {
      canvas.renderAll();
      saveContent();
      isUndoingRef.current = false;
    });
  }, [mode, getCurrentHistory, setCurrentHistory, saveContent]);

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

  // Pinch-to-zoom on the write mode scroll container (Notability-style)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || mode !== "write") return;

    const pinch = pinchRef.current;

    const getDistance = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      // Only handle finger touches (not stylus)
      const allFingers = Array.from(e.touches).every(
        t => (t as any).touchType !== 'stylus'
      );
      if (!allFingers) return;

      e.preventDefault();
      pinch.active = true;
      pinch.initialDistance = getDistance(e.touches[0], e.touches[1]);
      pinch.initialZoom = pageZoomRef.current;
      pinch.lastCenter = getCenter(e.touches[0], e.touches[1]);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pinch.active || e.touches.length < 2) return;
      e.preventDefault();

      const dist = getDistance(e.touches[0], e.touches[1]);
      const scale = dist / pinch.initialDistance;
      const newZoom = Math.max(0.5, Math.min(5, pinch.initialZoom * scale));

      const center = getCenter(e.touches[0], e.touches[1]);
      const dx = center.x - pinch.lastCenter.x;
      const dy = center.y - pinch.lastCenter.y;

      setPageZoom(newZoom);
      setPagePanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      pinch.lastCenter = center;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinch.active = false;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [mode]);

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
  const history = getCurrentHistory();

  return (
    <div className="flex h-full bg-muted/30 relative print:bg-white print:m-0">

      <div className="flex flex-col flex-1 min-w-0">
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
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo} disabled={history.undoStack.length <= 1} title="Undo (Ctrl+Z)">
                <Undo className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo} disabled={history.redoStack.length === 0} title="Redo (Ctrl+Shift+Z)">
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

          {/* Zoom indicator/reset */}
          {mode === "write" && pageZoom !== 1 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-6" />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => { setPageZoom(1); setPagePanOffset({ x: 0, y: 0 }); }}
                title="Reset zoom"
              >
                {Math.round(pageZoom * 100)}% ✕
              </Button>
            </>
          )}

          {/* Spacer */}
          <div className="flex-1" />


          {/* Add Module Dropdown */}
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

        {/* Document Area */}
        {mode === "type" ? (
          <div className="flex-1 overflow-auto flex justify-center py-8 px-4 print:py-0 print:px-0">
            <div
              ref={pageContainerRef}
              data-note-content="true"
              className={cn(
                "relative rounded-sm shadow-xl print:shadow-none print:rounded-none",
                "w-full max-w-[816px] min-h-[1056px]",
                "border border-border/20 print:border-0"
              )}
              style={{
                background: getBackgroundCSS(),
                backgroundSize: getBackgroundSize(),
                backgroundColor: "hsl(var(--background))",
              }}
            >
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
            </div>
          </div>
        ) : (
          /* Write Mode - Continuous vertical scroll of all pages with pinch-to-zoom */
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-auto"
            style={{ 
              backgroundColor: 'hsl(var(--muted))',
            }}
            onScroll={handleScrollDetection}
          >
            <div
              className="flex flex-col items-center py-8 px-4 gap-8"
              data-note-content="true"
              style={{
                transform: pageZoom !== 1 ? `scale(${pageZoom}) translate(${pagePanOffset.x / pageZoom}px, ${pagePanOffset.y / pageZoom}px)` : undefined,
                transformOrigin: 'top center',
                transition: pinchRef.current.active ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              {pages.map((page) => (
                <div
                  key={page.id}
                  ref={(el) => {
                    if (el) {
                      pageRefsMap.current.set(page.pageNumber, el);
                      if (page.pageNumber === currentPage) {
                        pageContainerRef.current = el;
                      }
                    }
                  }}
                  className={cn(
                    "relative rounded-sm flex-shrink-0 transition-shadow duration-200",
                    "border border-border/20",
                    page.pageNumber === currentPage 
                      ? "shadow-xl ring-2 ring-primary/20" 
                      : "shadow-lg"
                  )}
                  style={{
                    width: 816,
                    height: 1056,
                    background: getBackgroundCSS(),
                    backgroundSize: getBackgroundSize(),
                    backgroundColor: "hsl(var(--background))",
                  }}
                  onClick={page.pageNumber === currentPage && settings.tool !== "eraser" ? handleCanvasClick : undefined}
                >
                  {/* Active page: Fabric.js canvas */}
                  {page.pageNumber === currentPage && (
                    <div
                      ref={canvasContainerRef}
                      className="absolute inset-0 w-full h-full"
                      onPointerDown={settings.tool === "eraser" ? handleEraserStart : undefined}
                      onPointerMove={settings.tool === "eraser" ? handleEraserMove : undefined}
                      onPointerUp={settings.tool === "eraser" ? handleEraserEnd : undefined}
                      onPointerLeave={settings.tool === "eraser" ? handleEraserEnd : undefined}
                    >
                      <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  )}
                  {/* Inactive page: static preview */}
                  {page.pageNumber !== currentPage && pagePreviews.get(page.pageNumber) && (
                    <img
                      src={pagePreviews.get(page.pageNumber)}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      alt={`Page ${page.pageNumber}`}
                    />
                  )}
                  
                  {/* Page number label */}
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground select-none">
                    Page {page.pageNumber}
                  </div>
                </div>
              ))}
              
              {/* Add page button */}
              {!note.importedPdfUrl && (
                <button
                  onClick={handleAddPage}
                  className={cn(
                    "flex items-center justify-center gap-2 px-6 py-3 mb-8",
                    "rounded-lg border-2 border-dashed border-border/60",
                    "hover:border-primary/50 hover:bg-card/50 transition-colors",
                    "text-sm text-muted-foreground"
                  )}
                >
                  <Plus className="h-4 w-4" />
                  Add Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
