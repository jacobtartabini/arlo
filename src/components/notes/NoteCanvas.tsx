import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, PencilBrush, Circle, Rect, Triangle, Line, FabricObject } from "fabric";
import { DrawingSettings, Note, DEFAULT_DRAWING_SETTINGS } from "@/types/notes";
import { DrawingToolbar } from "./DrawingToolbar";
import { cn } from "@/lib/utils";

interface NoteCanvasProps {
  note: Note;
  onSave: (canvasState: string, zoom: number, panX: number, panY: number) => void;
}

export function NoteCanvas({ note, onSave }: NoteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  
  const [settings, setSettings] = useState<DrawingSettings>(DEFAULT_DRAWING_SETTINGS);
  const [zoom, setZoom] = useState(note.zoom || 1);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "transparent",
      selection: settings.tool === "select",
      isDrawingMode: settings.tool === "pen" || settings.tool === "highlighter",
    });

    // Initialize brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = settings.color;
    canvas.freeDrawingBrush.width = settings.strokeWidth;

    fabricRef.current = canvas;

    // Load existing canvas state
    if (note.canvasState) {
      try {
        canvas.loadFromJSON(JSON.parse(note.canvasState)).then(() => {
          canvas.renderAll();
          // Save initial state to undo stack
          setUndoStack([note.canvasState]);
        });
      } catch (e) {
        console.error("Failed to load canvas state:", e);
      }
    }

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      canvas.renderAll();
    });
    resizeObserver.observe(container);

    // Auto-save on changes
    const handleChange = () => {
      const json = JSON.stringify(canvas.toJSON());
      onSave(json, zoom, canvas.viewportTransform?.[4] || 0, canvas.viewportTransform?.[5] || 0);
    };

    canvas.on("object:added", handleChange);
    canvas.on("object:modified", handleChange);
    canvas.on("object:removed", handleChange);

    // Track history for undo/redo
    canvas.on("object:added", () => {
      const json = JSON.stringify(canvas.toJSON());
      setUndoStack(prev => [...prev, json]);
      setRedoStack([]);
    });

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [note.id]);

  // Update drawing mode based on tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const isDrawing = settings.tool === "pen" || settings.tool === "highlighter";
    canvas.isDrawingMode = isDrawing;
    canvas.selection = settings.tool === "select" || settings.tool === "lasso";

    if (isDrawing && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = settings.tool === "highlighter" 
        ? settings.color + "80" // Add transparency for highlighter
        : settings.color;
      canvas.freeDrawingBrush.width = settings.tool === "highlighter" 
        ? settings.strokeWidth * 3 
        : settings.strokeWidth;
    }

    // Handle eraser
    if (settings.tool === "eraser") {
      canvas.on("mouse:down", handleEraserStart);
      canvas.on("mouse:move", handleEraserMove);
    } else {
      canvas.off("mouse:down", handleEraserStart);
      canvas.off("mouse:move", handleEraserMove);
    }
  }, [settings]);

  // Handle zoom
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom]);

  // Eraser handlers
  const handleEraserStart = useCallback(() => {
    // Eraser logic handled in move
  }, []);

  const handleEraserMove = useCallback((opt: any) => {
    const canvas = fabricRef.current;
    if (!canvas || !opt.e.buttons) return;

    const pointer = canvas.getScenePoint(opt.e);
    const objects = canvas.getObjects();
    
    for (const obj of objects) {
      if (obj.containsPoint(pointer)) {
        canvas.remove(obj);
      }
    }
  }, []);

  // Add shape
  const addShape = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current;
    if (!canvas || settings.tool !== "shape") return;

    let shape: FabricObject | null = null;
    const shapeOptions = {
      left: x,
      top: y,
      fill: "transparent",
      stroke: settings.color,
      strokeWidth: settings.strokeWidth,
    };

    switch (settings.shape) {
      case "rectangle":
        shape = new Rect({ ...shapeOptions, width: 100, height: 80 });
        break;
      case "circle":
        shape = new Circle({ ...shapeOptions, radius: 50 });
        break;
      case "triangle":
        shape = new Triangle({ ...shapeOptions, width: 100, height: 86 });
        break;
      case "line":
        shape = new Line([x, y, x + 100, y], {
          stroke: settings.color,
          strokeWidth: settings.strokeWidth,
        });
        break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, [settings]);

  // Canvas click handler for shapes
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleClick = (opt: any) => {
      if (settings.tool === "shape") {
        const pointer = canvas.getScenePoint(opt.e);
        addShape(pointer.x, pointer.y);
      }
    };

    canvas.on("mouse:down", handleClick);
    return () => {
      canvas.off("mouse:down", handleClick);
    };
  }, [settings.tool, addShape]);

  // Panning with space + drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isPanning) {
        setIsPanning(true);
        if (fabricRef.current) {
          fabricRef.current.defaultCursor = "grab";
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPanning(false);
        if (fabricRef.current) {
          fabricRef.current.defaultCursor = "default";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPanning]);

  // Pan handlers
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleMouseDown = (opt: any) => {
      if (isPanning) {
        canvas.defaultCursor = "grabbing";
        lastPanPosition.current = { x: opt.e.clientX, y: opt.e.clientY };
      }
    };

    const handleMouseMove = (opt: any) => {
      if (isPanning && opt.e.buttons === 1) {
        const vpt = canvas.viewportTransform;
        if (vpt) {
          vpt[4] += opt.e.clientX - lastPanPosition.current.x;
          vpt[5] += opt.e.clientY - lastPanPosition.current.y;
          canvas.requestRenderAll();
          lastPanPosition.current = { x: opt.e.clientX, y: opt.e.clientY };
        }
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        canvas.defaultCursor = "grab";
      }
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    return () => {
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
    };
  }, [isPanning]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || undoStack.length <= 1) return;

    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];

    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(previousState)).then(() => {
      canvas.renderAll();
    });
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
      canvas.renderAll();
    });
  }, [redoStack]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* Canvas background with grid */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 bg-background",
          "[background-image:radial-gradient(circle,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)]",
          "[background-size:24px_24px]"
        )}
        style={{
          backgroundPositionX: `${(fabricRef.current?.viewportTransform?.[4] || 0) % 24}px`,
          backgroundPositionY: `${(fabricRef.current?.viewportTransform?.[5] || 0) % 24}px`,
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>

      {/* Toolbar */}
      <DrawingToolbar
        settings={settings}
        onSettingsChange={setSettings}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 1}
        canRedo={redoStack.length > 0}
        zoom={zoom}
        onZoomChange={setZoom}
      />
    </div>
  );
}
