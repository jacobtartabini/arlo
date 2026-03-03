"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TPointerEvent, TPointerEventInfo } from "fabric";
import {
  Canvas as FabricCanvas,
  PencilBrush,
  Circle,
  Rect,
  Triangle,
  Line,
  FabricObject,
  IText,
  ActiveSelection,
  Polyline,
  Point,
  util,
  type BaseBrush,
} from "fabric";
import { DrawingSettings, Note, DEFAULT_DRAWING_SETTINGS } from "@/types/notes";
import { DrawingToolbar } from "./DrawingToolbar";
import { EmbeddedModules, type ModuleType } from "./EmbeddedModules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NoteCanvasProps {
  note: Note;
  onSave: (canvasState: string, zoom: number, panX: number, panY: number) => void;
}

// Touch tracking for palm rejection
interface TouchInfo {
  identifier: number;
  startTime: number;
  startX: number;
  startY: number;
  isPalm: boolean;
}

const PEN_UP_SUPPRESSION_MS = 120;
const ERASER_PRECISION_RADIUS_MULTIPLIER = 2;
const ERASER_STROKE_RADIUS_MULTIPLIER = 5;
const ERASER_MIN_PRECISION_RADIUS = 4;
const ERASER_MIN_STROKE_RADIUS = 10;
const ERASER_SAMPLE_STEP_PX = 6;
const ERASER_CURVE_SAMPLE_SEGMENTS = 8;
const ERASER_FALLBACK_OFFSET_SAMPLES = 3;
const MIN_LASSO_POINTS = 3;
const PALM_THRESHOLD_SIZE = 40;
const PALM_THRESHOLD_TOUCHES = 3;
const TAP_THRESHOLD_MS = 300;
const TAP_MOVEMENT_THRESHOLD = 20;

const rectsIntersect = (
  a: { left: number; top: number; width: number; height: number },
  b: { left: number; top: number; width: number; height: number },
) => !(a.left + a.width < b.left || b.left + b.width < a.left || a.top + a.height < b.top || b.top + b.height < a.top);

const pointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const segmentsIntersect = (p1: { x: number; y: number }, p2: { x: number; y: number }, q1: { x: number; y: number }, q2: { x: number; y: number }) => {
  const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = cross(p1, p2, q1);
  const d2 = cross(p1, p2, q2);
  const d3 = cross(q1, q2, p1);
  const d4 = cross(q1, q2, p2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
};

const polygonIntersectsRect = (polygon: { x: number; y: number }[], rect: { left: number; top: number; width: number; height: number }) => {
  const rectPoints = [
    { x: rect.left, y: rect.top },
    { x: rect.left + rect.width, y: rect.top },
    { x: rect.left + rect.width, y: rect.top + rect.height },
    { x: rect.left, y: rect.top + rect.height },
  ];

  if (rectPoints.some(point => pointInPolygon(point, polygon))) return true;
  if (polygon.some(point => point.x >= rect.left && point.x <= rect.left + rect.width && point.y >= rect.top && point.y <= rect.top + rect.height)) return true;

  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    for (let j = 0; j < rectPoints.length; j++) {
      const nextRect = (j + 1) % rectPoints.length;
      if (segmentsIntersect(polygon[i], polygon[next], rectPoints[j], rectPoints[nextRect])) {
        return true;
      }
    }
  }
  return false;
};

const lineIntersectsRect = (start: { x: number; y: number }, end: { x: number; y: number }, rect: { left: number; top: number; width: number; height: number }) => {
  const rectPoints = [
    { x: rect.left, y: rect.top },
    { x: rect.left + rect.width, y: rect.top },
    { x: rect.left + rect.width, y: rect.top + rect.height },
    { x: rect.left, y: rect.top + rect.height },
  ];

  if (start.x >= rect.left && start.x <= rect.left + rect.width && start.y >= rect.top && start.y <= rect.top + rect.height) return true;
  if (end.x >= rect.left && end.x <= rect.left + rect.width && end.y >= rect.top && end.y <= rect.top + rect.height) return true;

  for (let i = 0; i < rectPoints.length; i++) {
    const next = (i + 1) % rectPoints.length;
    if (segmentsIntersect(start, end, rectPoints[i], rectPoints[next])) return true;
  }
  return false;
};

const distancePointToSegment = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    const distX = point.x - start.x;
    const distY = point.y - start.y;
    return Math.hypot(distX, distY);
  }
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  const projX = start.x + clamped * dx;
  const projY = start.y + clamped * dy;
  return Math.hypot(point.x - projX, point.y - projY);
};

const segmentToSegmentDistance = (
  startA: { x: number; y: number },
  endA: { x: number; y: number },
  startB: { x: number; y: number },
  endB: { x: number; y: number },
) => {
  if (segmentsIntersect(startA, endA, startB, endB)) return 0;
  return Math.min(
    distancePointToSegment(startA, startB, endB),
    distancePointToSegment(endA, startB, endB),
    distancePointToSegment(startB, startA, endA),
    distancePointToSegment(endB, startA, endA),
  );
};

const transformObjectPoints = (obj: FabricObject, points: { x: number; y: number }[]) => {
  const matrix = obj.calcTransformMatrix();
  const offset = (obj as any).pathOffset ?? new Point(0, 0);
  return points.map(point =>
    util.transformPoint(new Point(point.x - offset.x, point.y - offset.y), matrix),
  );
};

const sampleQuadraticPoints = (start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }) => {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= ERASER_CURVE_SAMPLE_SEGMENTS; i += 1) {
    const t = i / ERASER_CURVE_SAMPLE_SEGMENTS;
    const oneMinus = 1 - t;
    points.push({
      x: oneMinus * oneMinus * start.x + 2 * oneMinus * t * control.x + t * t * end.x,
      y: oneMinus * oneMinus * start.y + 2 * oneMinus * t * control.y + t * t * end.y,
    });
  }
  return points;
};

const sampleCubicPoints = (
  start: { x: number; y: number },
  control1: { x: number; y: number },
  control2: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i <= ERASER_CURVE_SAMPLE_SEGMENTS; i += 1) {
    const t = i / ERASER_CURVE_SAMPLE_SEGMENTS;
    const oneMinus = 1 - t;
    const oneMinus2 = oneMinus * oneMinus;
    const oneMinus3 = oneMinus2 * oneMinus;
    const t2 = t * t;
    const t3 = t2 * t;
    points.push({
      x: oneMinus3 * start.x + 3 * oneMinus2 * t * control1.x + 3 * oneMinus * t2 * control2.x + t3 * end.x,
      y: oneMinus3 * start.y + 3 * oneMinus2 * t * control1.y + 3 * oneMinus * t2 * control2.y + t3 * end.y,
    });
  }
  return points;
};

const getNumberValue = (values: (string | number)[], index: number) => {
  const value = values[index];
  return typeof value === "number" ? value : null;
};

const getPathSubpaths = (path: (string | number)[][]) => {
  const subpaths: { x: number; y: number }[][] = [];
  let current = { x: 0, y: 0 };
  let start = { x: 0, y: 0 };
  let currentSubpath: { x: number; y: number }[] = [];
  let previousControl: { x: number; y: number } | null = null;
  let previousCommand = "";

  const resolvePoint = (x: number, y: number, relative: boolean) => ({
    x: relative ? current.x + x : x,
    y: relative ? current.y + y : y,
  });

  const pushSubpath = () => {
    if (currentSubpath.length > 0) {
      subpaths.push(currentSubpath);
      currentSubpath = [];
    }
  };

  path.forEach(segment => {
    const [rawCommand, ...values] = segment;
    if (typeof rawCommand !== "string") return;
    const relative = rawCommand === rawCommand.toLowerCase();
    const command = rawCommand.toUpperCase();

    switch (command) {
      case "M": {
        const x = getNumberValue(values, 0);
        const y = getNumberValue(values, 1);
        if (x === null || y === null) return;
        pushSubpath();
        current = resolvePoint(x, y, relative);
        start = { ...current };
        currentSubpath.push({ ...current });
        previousControl = null;
        break;
      }
      case "L": {
        const x = getNumberValue(values, 0);
        const y = getNumberValue(values, 1);
        if (x === null || y === null) return;
        current = resolvePoint(x, y, relative);
        currentSubpath.push({ ...current });
        previousControl = null;
        break;
      }
      case "H": {
        const x = getNumberValue(values, 0);
        if (x === null) return;
        current = {
          x: relative ? current.x + x : x,
          y: current.y,
        };
        currentSubpath.push({ ...current });
        previousControl = null;
        break;
      }
      case "V": {
        const y = getNumberValue(values, 0);
        if (y === null) return;
        current = {
          x: current.x,
          y: relative ? current.y + y : y,
        };
        currentSubpath.push({ ...current });
        previousControl = null;
        break;
      }
      case "C": {
        const c1x = getNumberValue(values, 0);
        const c1y = getNumberValue(values, 1);
        const c2x = getNumberValue(values, 2);
        const c2y = getNumberValue(values, 3);
        const ex = getNumberValue(values, 4);
        const ey = getNumberValue(values, 5);
        if ([c1x, c1y, c2x, c2y, ex, ey].some(val => val === null)) return;
        const control1 = resolvePoint(c1x as number, c1y as number, relative);
        const control2 = resolvePoint(c2x as number, c2y as number, relative);
        const end = resolvePoint(ex as number, ey as number, relative);
        currentSubpath.push(...sampleCubicPoints(current, control1, control2, end));
        current = end;
        previousControl = control2;
        break;
      }
      case "S": {
        const c2x = getNumberValue(values, 0);
        const c2y = getNumberValue(values, 1);
        const ex = getNumberValue(values, 2);
        const ey = getNumberValue(values, 3);
        if ([c2x, c2y, ex, ey].some(val => val === null)) return;
        const control1 = previousCommand === "C" || previousCommand === "S"
          ? { x: current.x * 2 - (previousControl?.x ?? current.x), y: current.y * 2 - (previousControl?.y ?? current.y) }
          : { ...current };
        const control2 = resolvePoint(c2x as number, c2y as number, relative);
        const end = resolvePoint(ex as number, ey as number, relative);
        currentSubpath.push(...sampleCubicPoints(current, control1, control2, end));
        current = end;
        previousControl = control2;
        break;
      }
      case "Q": {
        const cx = getNumberValue(values, 0);
        const cy = getNumberValue(values, 1);
        const ex = getNumberValue(values, 2);
        const ey = getNumberValue(values, 3);
        if ([cx, cy, ex, ey].some(val => val === null)) return;
        const control = resolvePoint(cx as number, cy as number, relative);
        const end = resolvePoint(ex as number, ey as number, relative);
        currentSubpath.push(...sampleQuadraticPoints(current, control, end));
        current = end;
        previousControl = control;
        break;
      }
      case "T": {
        const ex = getNumberValue(values, 0);
        const ey = getNumberValue(values, 1);
        if (ex === null || ey === null) return;
        const control = previousCommand === "Q" || previousCommand === "T"
          ? { x: current.x * 2 - (previousControl?.x ?? current.x), y: current.y * 2 - (previousControl?.y ?? current.y) }
          : { ...current };
        const end = resolvePoint(ex as number, ey as number, relative);
        currentSubpath.push(...sampleQuadraticPoints(current, control, end));
        current = end;
        previousControl = control;
        break;
      }
      case "Z": {
        current = { ...start };
        currentSubpath.push({ ...current });
        pushSubpath();
        previousControl = null;
        break;
      }
      default:
        break;
    }

    previousCommand = command;
  });

  pushSubpath();
  return subpaths;
};

const segmentHitsObject = (obj: FabricObject, start: { x: number; y: number }, end: { x: number; y: number }, radius: number) => {
  if (obj.type === "polyline") {
    const polyline = obj as Polyline;
    const points = transformObjectPoints(polyline, polyline.points ?? []);
    for (let i = 0; i < points.length - 1; i += 1) {
      if (segmentToSegmentDistance(start, end, points[i], points[i + 1]) <= radius) {
        return true;
      }
    }
    return false;
  }

  if (obj.type === "line") {
    const line = obj as Line;
    const linePoints = transformObjectPoints(line, [
      { x: line.x1 ?? 0, y: line.y1 ?? 0 },
      { x: line.x2 ?? 0, y: line.y2 ?? 0 },
    ]);
    return segmentToSegmentDistance(start, end, linePoints[0], linePoints[1]) <= radius;
  }

  if (obj.type === "path") {
    const pathObj = obj as FabricObject & { path?: (string | number)[][] };
    if (!pathObj.path) return false;
    const subpaths = getPathSubpaths(pathObj.path);
    return subpaths.some(subpath => {
      const pathPoints = transformObjectPoints(pathObj, subpath);
      for (let i = 0; i < pathPoints.length - 1; i += 1) {
        if (segmentToSegmentDistance(start, end, pathPoints[i], pathPoints[i + 1]) <= radius) {
          return true;
        }
      }
      return false;
    });
  }

  const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
  const steps = Math.max(1, Math.ceil(segmentLength / ERASER_SAMPLE_STEP_PX));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(Math.hypot(dx, dy), 1);
  const normal = { x: -dy / length, y: dx / length };
  const offsets = Array.from({ length: ERASER_FALLBACK_OFFSET_SAMPLES }, (_, index) => {
    if (index === 0) return 0;
    const sign = index % 2 === 0 ? 1 : -1;
    return sign * radius;
  });

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const centerX = start.x + dx * t;
    const centerY = start.y + dy * t;
    for (const offset of offsets) {
      const samplePoint = new Point(
        centerX + normal.x * offset,
        centerY + normal.y * offset,
      );
      if (obj.containsPoint(samplePoint)) {
        return true;
      }
    }
  }
  return false;
};

export function NoteCanvas({ note, onSave }: NoteCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  
  const [settings, setSettings] = useState<DrawingSettings>(DEFAULT_DRAWING_SETTINGS);
  const [zoom, setZoom] = useState(note.zoom || 1);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const [isPanning, setIsPanning] = useState(false);
  const [clipboard, setClipboard] = useState<FabricObject[] | null>(null);
  const [palmRejectionEnabled, setPalmRejectionEnabled] = useState(true);
  const settingsRef = useRef<DrawingSettings>(settings);
  settingsRef.current = settings;
  const isRestoringRef = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const touchTracking = useRef<Map<number, TouchInfo>>(new Map());
  const primaryTouchId = useRef<number | null>(null);
  const addModuleRef = useRef<((type: ModuleType) => void) | null>(null);
  const stylusOnlyTools = useRef(new Set(["pen", "highlighter", "eraser", "lasso"]));
  const penActiveRef = useRef(false);
  const nonPenSuppressionTimeout = useRef<number | null>(null);
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([]);
  const lassoPreviewRef = useRef<FabricObject | null>(null);
  const lassoActiveRef = useRef(false);
  const eraserActiveRef = useRef(false);
  const eraserLastPointRef = useRef<{ x: number; y: number } | null>(null);

  const isPenEvent = (event?: Event | PointerEvent | TouchEvent | TPointerEvent | null) => {
    if (!event) return false;
    const pointerEvent = event as PointerEvent;
    if (typeof pointerEvent.pointerType === "string") {
      return pointerEvent.pointerType === "pen";
    }

    const touchEvent = event as TouchEvent;
    if ("touches" in touchEvent && touchEvent.touches) {
      return Array.from(touchEvent.touches).some(
        touch => (touch as any).touchType === "stylus" || (touch as any).force > 0,
      );
    }

    return false;
  };

  const scheduleNonPenRelease = () => {
    if (nonPenSuppressionTimeout.current) {
      window.clearTimeout(nonPenSuppressionTimeout.current);
    }
    nonPenSuppressionTimeout.current = window.setTimeout(() => {
      penActiveRef.current = false;
    }, PEN_UP_SUPPRESSION_MS);
  };

  const clearNonPenSuppression = () => {
    if (nonPenSuppressionTimeout.current) {
      window.clearTimeout(nonPenSuppressionTimeout.current);
      nonPenSuppressionTimeout.current = null;
    }
    penActiveRef.current = false;
  };


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
      allowTouchScrolling: true,
    });

    // Initialize brush
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = settings.color;
    canvas.freeDrawingBrush.width = settings.strokeWidth;

    fabricRef.current = canvas;

    const setInitialHistory = () => {
      const json = JSON.stringify(canvas.toJSON());
      setUndoStack([json]);
      setRedoStack([]);
    };

    // Load existing canvas state
    if (note.canvasState) {
      try {
        isRestoringRef.current = true;
        canvas.loadFromJSON(JSON.parse(note.canvasState)).then(() => {
          canvas.renderAll();
          setInitialHistory();
          isRestoringRef.current = false;
        });
      } catch (e) {
        console.error("Failed to load canvas state:", e);
        setInitialHistory();
        isRestoringRef.current = false;
      }
    } else {
      setInitialHistory();
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

    const commitState = () => {
      if (isRestoringRef.current) return;
      const json = JSON.stringify(canvas.toJSON());
      onSave(json, zoom, canvas.viewportTransform?.[4] || 0, canvas.viewportTransform?.[5] || 0);
      setUndoStack(prev => {
        if (prev[prev.length - 1] === json) return prev;
        return [...prev, json];
      });
      setRedoStack([]);
    };

    // Block non-pen input from triggering Fabric.js drawing/erasing
    // This is the critical fix: intercept at the Fabric.js event level
    // so finger/palm touches never start a drawing stroke
    canvas.on("mouse:down:before", (opt: any) => {
      const e = opt.e as PointerEvent;
      if (!e || typeof e.pointerType !== "string") return;
      
      const tool = settingsRef.current.tool;
      const requiresStylus = tool === "pen" || tool === "highlighter" || tool === "eraser" || tool === "lasso";
      
      if (requiresStylus && e.pointerType !== "pen" && e.pointerType !== "mouse") {
        // Cancel Fabric.js processing for this event
        // This prevents finger/palm from drawing
        if (canvas.isDrawingMode) {
          canvas.isDrawingMode = false;
          // Re-enable after a tick so pen input still works
          requestAnimationFrame(() => {
            if (settingsRef.current.tool === "pen" || settingsRef.current.tool === "highlighter") {
              canvas.isDrawingMode = true;
            }
          });
        }
        opt.e.stopPropagation?.();
        return;
      }
    });

    // Auto-save + track history on changes
    canvas.on("object:added", commitState);
    canvas.on("object:modified", commitState);
    canvas.on("object:removed", commitState);
    canvas.on("text:changed", commitState);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [note.id]);

  const eraseAlongSegment = useCallback((start: { x: number; y: number }, end: { x: number; y: number }) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const isPrecision = settings.eraserType === "precision";
    const radius = isPrecision
      ? Math.max(ERASER_MIN_PRECISION_RADIUS, settings.strokeWidth * ERASER_PRECISION_RADIUS_MULTIPLIER)
      : Math.max(ERASER_MIN_STROKE_RADIUS, settings.strokeWidth * ERASER_STROKE_RADIUS_MULTIPLIER);
    const candidates = canvas.getObjects().filter(obj => obj !== lassoPreviewRef.current);

    for (const obj of candidates) {
      const bounds = obj.getBoundingRect();
      const expandedBounds = {
        left: bounds.left - radius,
        top: bounds.top - radius,
        width: bounds.width + radius * 2,
        height: bounds.height + radius * 2,
      };

      if (!lineIntersectsRect(start, end, expandedBounds)) continue;
      if (!segmentHitsObject(obj, start, end, radius)) continue;

      canvas.remove(obj);
    }

    canvas.requestRenderAll();
  }, [settings.strokeWidth, settings.eraserType]);

  // Update drawing mode based on tool
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const isDrawing = settings.tool === "pen" || settings.tool === "highlighter";
    canvas.isDrawingMode = isDrawing;
    canvas.selection = settings.tool === "select";
    canvas.skipTargetFind = settings.tool === "eraser";

    if (settings.tool === "eraser") {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }

    if (isDrawing) {
      if (!canvas.freeDrawingBrush || !(canvas.freeDrawingBrush instanceof PencilBrush)) {
        canvas.freeDrawingBrush = new PencilBrush(canvas);
      }
      canvas.freeDrawingBrush.color = settings.tool === "highlighter"
        ? settings.color + "80"
        : settings.color;
      canvas.freeDrawingBrush.width = settings.tool === "highlighter"
        ? settings.strokeWidth * 3
        : settings.strokeWidth;
      (canvas.freeDrawingBrush as any).opacity = settings.opacity;
    }

    if (settings.tool === "eraser") {
      canvas.on("mouse:down", handleEraserStart as any);
      canvas.on("mouse:move", handleEraserMove as any);
      canvas.on("mouse:up", handleEraserEnd);
    } else {
      canvas.off("mouse:down", handleEraserStart as any);
      canvas.off("mouse:move", handleEraserMove as any);
      canvas.off("mouse:up", handleEraserEnd);
    }
  }, [settings]);

  // Handle zoom
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, [zoom]);

  // Eraser handlers - stroke eraser uses a continuous path
  const handleEraserStart = useCallback((opt: TPointerEventInfo<TPointerEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas || !isPenEvent(opt.e)) return;

    eraserActiveRef.current = true;
    const pointer = canvas.getScenePoint(opt.e);
    eraserLastPointRef.current = pointer;
    eraseAlongSegment(pointer, pointer);
  }, [eraseAlongSegment]);

  const handleEraserMove = useCallback((opt: TPointerEventInfo<TPointerEvent>) => {
    const canvas = fabricRef.current;
    if (!canvas || !eraserActiveRef.current || !isPenEvent(opt.e)) return;

    const pointer = canvas.getScenePoint(opt.e);
    if (eraserLastPointRef.current) {
      eraseAlongSegment(eraserLastPointRef.current, pointer);
    }
    eraserLastPointRef.current = pointer;
  }, [eraseAlongSegment]);

  const handleEraserEnd = useCallback(() => {
    eraserActiveRef.current = false;
    eraserLastPointRef.current = null;
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

  // Add text
  const addText = useCallback((x: number, y: number) => {
    const canvas = fabricRef.current;
    if (!canvas || settings.tool !== "text") return;

    const text = new IText("Click to edit", {
      left: x,
      top: y,
      fontSize: 20,
      fill: settings.color,
      fontFamily: "Inter, sans-serif",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    canvas.renderAll();
  }, [settings]);

  const finalizeLassoSelection = useCallback((mode: "freeform" | "rectangle", points: { x: number; y: number }[]) => {
    const canvas = fabricRef.current;
    if (!canvas || points.length === 0) return;

    const objects = canvas.getObjects().filter(obj => obj !== lassoPreviewRef.current);
    const selected: FabricObject[] = [];

    if (mode === "rectangle") {
      const start = points[0];
      const end = points[points.length - 1];
      const rect = {
        left: Math.min(start.x, end.x),
        top: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      };
      const rectPolygon = [
        { x: rect.left, y: rect.top },
        { x: rect.left + rect.width, y: rect.top },
        { x: rect.left + rect.width, y: rect.top + rect.height },
        { x: rect.left, y: rect.top + rect.height },
      ];

      objects.forEach(obj => {
        const bounds = obj.getBoundingRect();
        if (polygonIntersectsRect(rectPolygon, bounds)) {
          selected.push(obj);
        }
      });
    } else {
      const minX = Math.min(...points.map(point => point.x));
      const maxX = Math.max(...points.map(point => point.x));
      const minY = Math.min(...points.map(point => point.y));
      const maxY = Math.max(...points.map(point => point.y));
      const polygonBounds = { left: minX, top: minY, width: maxX - minX, height: maxY - minY };

      objects.forEach(obj => {
        const bounds = obj.getBoundingRect();
        if (!rectsIntersect(bounds, polygonBounds)) return;
        if (polygonIntersectsRect(points, bounds)) {
          selected.push(obj);
        }
      });
    }

    if (selected.length > 0) {
      const activeSelection = new ActiveSelection(selected, { canvas });
      canvas.setActiveObject(activeSelection);
    } else {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
  }, [polygonIntersectsRect, rectsIntersect]);

  // Handle image upload
  const handleImageUpload = useCallback((file: File) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imgUrl = e.target?.result as string;
      const imgElement = new Image();
      imgElement.onload = () => {
        const fabricImage = new (require("fabric").FabricImage)(imgElement, {
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
        });
        canvas.add(fabricImage);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
        toast.success("Image added to canvas");
      };
      imgElement.src = imgUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Canvas click handler
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleClick = (opt: any) => {
      const pointer = canvas.getScenePoint(opt.e);
      
      if (settings.tool === "shape") {
        addShape(pointer.x, pointer.y);
      } else if (settings.tool === "text") {
        addText(pointer.x, pointer.y);
      }
    };

    canvas.on("mouse:down", handleClick);
    return () => {
      canvas.off("mouse:down", handleClick);
    };
  }, [settings.tool, addShape, addText]);

  // Lasso selection handlers
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleLassoStart = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (!isPenEvent(opt.e)) return;
      if (opt.target) return;
      const pointer = canvas.getScenePoint(opt.e);
      lassoActiveRef.current = true;
      lassoPointsRef.current = [pointer];

      if (lassoPreviewRef.current) {
        canvas.remove(lassoPreviewRef.current);
        lassoPreviewRef.current = null;
      }

      if (settings.lassoMode === "rectangle") {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: "rgba(59,130,246,0.1)",
          stroke: "#3b82f6",
          strokeWidth: 1,
          strokeDashArray: [4, 4],
          selectable: false,
          evented: false,
        });
        lassoPreviewRef.current = rect;
        canvas.add(rect);
      } else {
        const polyline = new Polyline([pointer], {
          stroke: "#3b82f6",
          strokeWidth: 1.5,
          fill: "rgba(59,130,246,0.1)",
          selectable: false,
          evented: false,
        });
        lassoPreviewRef.current = polyline;
        canvas.add(polyline);
      }
    };

    const handleLassoMove = (opt: TPointerEventInfo<TPointerEvent>) => {
      if (!lassoActiveRef.current || !isPenEvent(opt.e)) return;
      const pointer = canvas.getScenePoint(opt.e);
      const points = lassoPointsRef.current;
      points.push(pointer);

      if (!lassoPreviewRef.current) return;
      if (settings.lassoMode === "rectangle") {
        const start = points[0];
        const rect = lassoPreviewRef.current as Rect;
        rect.set({
          left: Math.min(start.x, pointer.x),
          top: Math.min(start.y, pointer.y),
          width: Math.abs(pointer.x - start.x),
          height: Math.abs(pointer.y - start.y),
        });
        rect.setCoords();
      } else {
        const polyline = lassoPreviewRef.current as Polyline;
        polyline.set({ points: [...points] });
      }
      canvas.requestRenderAll();
    };

    const handleLassoEnd = () => {
      if (!lassoActiveRef.current) return;
      lassoActiveRef.current = false;

      const points = lassoPointsRef.current;
      if (lassoPreviewRef.current) {
        canvas.remove(lassoPreviewRef.current);
        lassoPreviewRef.current = null;
      }

      if (settings.lassoMode === "freeform" && points.length < MIN_LASSO_POINTS) {
        lassoPointsRef.current = [];
        return;
      }

      if (points.length > 1) {
        finalizeLassoSelection(settings.lassoMode || "freeform", points);
      }

      lassoPointsRef.current = [];
    };

    if (settings.tool === "lasso") {
      canvas.on("mouse:down", handleLassoStart as any);
      canvas.on("mouse:move", handleLassoMove as any);
      canvas.on("mouse:up", handleLassoEnd);
    } else {
      canvas.off("mouse:down", handleLassoStart as any);
      canvas.off("mouse:move", handleLassoMove as any);
      canvas.off("mouse:up", handleLassoEnd);
      if (lassoPreviewRef.current) {
        canvas.remove(lassoPreviewRef.current);
        lassoPreviewRef.current = null;
      }
      lassoPointsRef.current = [];
      lassoActiveRef.current = false;
    }

    return () => {
      canvas.off("mouse:down", handleLassoStart as any);
      canvas.off("mouse:move", handleLassoMove as any);
      canvas.off("mouse:up", handleLassoEnd);
    };
  }, [finalizeLassoSelection, settings.lassoMode, settings.tool]);

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

  // Touch event handlers with palm rejection
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !palmRejectionEnabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const touchInfo: TouchInfo = {
          identifier: touch.identifier,
          startTime: Date.now(),
          startX: touch.clientX,
          startY: touch.clientY,
          // Heuristics for palm detection
          isPalm: (touch.radiusX && touch.radiusX > PALM_THRESHOLD_SIZE) ||
                  (touch.radiusY && touch.radiusY > PALM_THRESHOLD_SIZE) ||
                  e.touches.length >= PALM_THRESHOLD_TOUCHES,
        };
        touchTracking.current.set(touch.identifier, touchInfo);

        // First non-palm touch becomes primary
        if (primaryTouchId.current === null && !touchInfo.isPalm) {
          primaryTouchId.current = touch.identifier;
        }
      }

      // If using stylus (force > 0), always allow
      const stylusTouch = Array.from(e.touches).find(t => (t as any).force > 0);
      if (stylusTouch) {
        primaryTouchId.current = stylusTouch.identifier;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!palmRejectionEnabled) return;

      // Only allow primary touch through
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const info = touchTracking.current.get(touch.identifier);
        
        if (info?.isPalm || (primaryTouchId.current !== null && touch.identifier !== primaryTouchId.current)) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        touchTracking.current.delete(touch.identifier);
        
        if (touch.identifier === primaryTouchId.current) {
          primaryTouchId.current = null;
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [palmRejectionEnabled]);

  // Block non-stylus input for drawing tools (Apple Pencil / stylus only)
  useEffect(() => {
    const container = containerRef.current;
    const canvasEl = canvasRef.current;
    if (!container) return;

    const requiresStylus = stylusOnlyTools.current.has(settings.tool);

    const shouldBlock = (event: PointerEvent) => {
      if (!requiresStylus) return false;
      // Always allow pen (stylus)
      if (event.pointerType === "pen") return false;
      // Block touch and mouse when stylus-only tools are active
      // Allow mouse on desktop (non-touch devices) for testing
      if (event.pointerType === "touch") return true;
      // If pen was recently active, block mouse too (palm can register as mouse)
      if (penActiveRef.current && event.pointerType !== "pen") return true;
      return false;
    };

    const shouldBlockTouch = (event: TouchEvent) => {
      if (!requiresStylus) return false;
      // Allow multi-touch gestures (2-finger undo, 3-finger redo, pinch zoom)
      if (event.touches.length >= 2) return false;
      // Block single-finger touch unless it's a stylus
      const isStylus = Array.from(event.touches).some(
        touch => (touch as any).touchType === "stylus",
      );
      return !isStylus;
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === "pen") {
        penActiveRef.current = true;
        if (nonPenSuppressionTimeout.current) {
          window.clearTimeout(nonPenSuppressionTimeout.current);
          nonPenSuppressionTimeout.current = null;
        }
      }

      if (shouldBlock(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (shouldBlock(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === "pen") {
        scheduleNonPenRelease();
      }
      if (shouldBlock(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerType === "pen") {
        clearNonPenSuppression();
      }
      if (shouldBlock(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (shouldBlockTouch(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (shouldBlockTouch(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      // Don't block touchend to allow gesture detection
    };

    // Attach to BOTH container and canvas element to ensure Fabric.js events are blocked
    const targets = canvasEl ? [container, canvasEl] : [container];
    targets.forEach(target => {
      target.addEventListener("pointerdown", handlePointerDown, { capture: true });
      target.addEventListener("pointermove", handlePointerMove, { capture: true });
      target.addEventListener("pointerup", handlePointerUp, { capture: true });
      target.addEventListener("pointercancel", handlePointerCancel, { capture: true });
      target.addEventListener("touchstart", handleTouchStart, { capture: true, passive: false });
      target.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
      target.addEventListener("touchend", handleTouchEnd, { capture: true, passive: false });
    });

    return () => {
      targets.forEach(target => {
        target.removeEventListener("pointerdown", handlePointerDown, { capture: true });
        target.removeEventListener("pointermove", handlePointerMove, { capture: true });
        target.removeEventListener("pointerup", handlePointerUp, { capture: true });
        target.removeEventListener("pointercancel", handlePointerCancel, { capture: true });
        target.removeEventListener("touchstart", handleTouchStart, { capture: true });
        target.removeEventListener("touchmove", handleTouchMove, { capture: true });
        target.removeEventListener("touchend", handleTouchEnd, { capture: true });
      });
    };
  }, [settings.tool]);

  // Undo/Redo
  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || undoStack.length <= 1) return;

    const currentState = undoStack[undoStack.length - 1];
    const previousState = undoStack[undoStack.length - 2];

    isRestoringRef.current = true;
    setRedoStack(prev => [...prev, currentState]);
    setUndoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(previousState)).then(() => {
      canvas.renderAll();
      onSave(previousState, zoom, canvas.viewportTransform?.[4] || 0, canvas.viewportTransform?.[5] || 0);
      isRestoringRef.current = false;
    });
  }, [undoStack, onSave, zoom]);

  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || redoStack.length === 0) return;

    const nextState = redoStack[redoStack.length - 1];

    isRestoringRef.current = true;
    setUndoStack(prev => [...prev, nextState]);
    setRedoStack(prev => prev.slice(0, -1));

    canvas.loadFromJSON(JSON.parse(nextState)).then(() => {
      canvas.renderAll();
      onSave(nextState, zoom, canvas.viewportTransform?.[4] || 0, canvas.viewportTransform?.[5] || 0);
      isRestoringRef.current = false;
    });
  }, [redoStack, onSave, zoom]);

  // Touch gesture shortcuts: 2-finger tap = undo, 3-finger tap = redo
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let touchStartTime = 0;
    let touchStartCount = 0;
    let touchStartPositions: { x: number; y: number }[] = [];

    const handleGestureTouchStart = (e: TouchEvent) => {
      touchStartTime = Date.now();
      touchStartCount = e.touches.length;
      touchStartPositions = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
    };

    const handleGestureTouchEnd = (e: TouchEvent) => {
      const touchDuration = Date.now() - touchStartTime;
      const endTouchCount = e.changedTouches.length;
      
      // Check if it was a quick tap (not a drag)
      if (touchDuration < TAP_THRESHOLD_MS) {
        // Verify touches didn't move much (it's a tap, not a swipe)
        let isTap = true;
        for (let i = 0; i < e.changedTouches.length && i < touchStartPositions.length; i++) {
          const touch = e.changedTouches[i];
          const startPos = touchStartPositions.find((_, idx) => idx === i);
          if (startPos) {
            const dx = Math.abs(touch.clientX - startPos.x);
            const dy = Math.abs(touch.clientY - startPos.y);
            if (dx > TAP_MOVEMENT_THRESHOLD || dy > TAP_MOVEMENT_THRESHOLD) {
              isTap = false;
              break;
            }
          }
        }

        if (isTap) {
          // 2-finger tap = undo
          if (touchStartCount === 2 && endTouchCount === 2) {
            e.preventDefault();
            handleUndo();
            toast.info("Undo", { duration: 1000 });
          }
          // 3-finger tap = redo
          else if (touchStartCount === 3 && endTouchCount === 3) {
            e.preventDefault();
            handleRedo();
            toast.info("Redo", { duration: 1000 });
          }
        }
      }

      touchStartPositions = [];
    };

    container.addEventListener("touchstart", handleGestureTouchStart, { passive: true });
    container.addEventListener("touchend", handleGestureTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleGestureTouchStart);
      container.removeEventListener("touchend", handleGestureTouchEnd);
    };
  }, [handleUndo, handleRedo]);

  // Copy/Paste for lasso selection
  const handleCopy = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.error("Nothing selected to copy");
      return;
    }

    // Clone objects
    const clones: FabricObject[] = [];
    activeObjects.forEach(obj => {
      obj.clone().then((cloned: FabricObject) => {
        clones.push(cloned);
        if (clones.length === activeObjects.length) {
          setClipboard(clones);
          toast.success(`Copied ${clones.length} object${clones.length > 1 ? "s" : ""}`);
        }
      });
    });
  }, []);

  const handlePaste = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || !clipboard || clipboard.length === 0) {
      toast.error("Nothing to paste");
      return;
    }

    // Paste with offset
    clipboard.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
        });
        canvas.add(cloned);
      });
    });

    canvas.renderAll();
    toast.success(`Pasted ${clipboard.length} object${clipboard.length > 1 ? "s" : ""}`);
  }, [clipboard]);

  const handleCut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.error("Nothing selected to cut");
      return;
    }

    handleCopy();
    
    // Remove selected objects
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, [handleCopy]);

  // Handwriting to text conversion
  const handleConvertToText = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) {
      toast.error("Select handwritten content to convert");
      return;
    }

    toast.info("Converting handwriting to text...");

    // Simulate OCR processing (in production, this would call a real OCR API)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get bounding box of selection
    const activeSelection = canvas.getActiveObject();
    if (!activeSelection) return;

    const bounds = activeSelection.getBoundingRect();

    // Remove selected objects
    activeObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();

    // Add text in place of handwriting
    const text = new IText("Converted text placeholder", {
      left: bounds.left,
      top: bounds.top,
      fontSize: 18,
      fill: "#1a1a1a",
      fontFamily: "Inter, sans-serif",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();

    toast.success("Handwriting converted to text!");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      
      if (isMod && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (isMod && e.key === "c") {
        e.preventDefault();
        handleCopy();
      } else if (isMod && e.key === "v") {
        e.preventDefault();
        handlePaste();
      } else if (isMod && e.key === "x") {
        e.preventDefault();
        handleCut();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const canvas = fabricRef.current;
        const activeObj = canvas?.getActiveObject();
        const isEditing = activeObj && "isEditing" in activeObj && (activeObj as any).isEditing;
        if (canvas && !isEditing) {
          const activeObjects = canvas.getActiveObjects();
          activeObjects.forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleCut]);

  // Handle text insertion from modules
  const handleInsertText = useCallback((text: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const textObj = new IText(text, {
      left: 100 + Math.random() * 200,
      top: 100 + Math.random() * 200,
      fontSize: 16,
      fill: "#1a1a1a",
      fontFamily: "Inter, sans-serif",
    });

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();
    toast.success("Text inserted");
  }, []);

  useEffect(() => {
    return () => {
      clearNonPenSuppression();
    };
  }, []);

  return (
    <div className="relative flex-1 h-full overflow-hidden">
      {/* Canvas background with grid */}
      <div
        ref={containerRef}
        className={cn(
          "absolute inset-0 bg-background touch-none",
          "[background-image:radial-gradient(circle,hsl(var(--muted-foreground)/0.15)_1px,transparent_1px)]",
          "[background-size:24px_24px]"
        )}
        style={{
          backgroundPositionX: `${(fabricRef.current?.viewportTransform?.[4] || 0) % 24}px`,
          backgroundPositionY: `${(fabricRef.current?.viewportTransform?.[5] || 0) % 24}px`,
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
      </div>

      {/* Embedded modules layer */}
      <EmbeddedModules 
        noteContent={note.canvasState}
        onInsertText={handleInsertText}
        onModuleAdd={(callback) => { addModuleRef.current = callback; }}
      />

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
        onCopy={handleCopy}
        onPaste={handlePaste}
        onCut={handleCut}
        hasClipboard={!!clipboard && clipboard.length > 0}
        onConvertToText={handleConvertToText}
        palmRejectionEnabled={palmRejectionEnabled}
        onPalmRejectionChange={setPalmRejectionEnabled}
        onImageUpload={handleImageUpload}
        onAddModule={(type) => addModuleRef.current?.(type)}
      />
    </div>
  );
}
