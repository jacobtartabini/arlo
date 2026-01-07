import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { APP_MODULES, type Module } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import { ModuleTile } from "@/components/ModuleTile";
import type { ModuleLayout } from "@/types/settings";

type GestureEventType = Event & { scale: number };

const GRID_SIZE = 48;

// Layout position includes pixel values for rendering
interface LayoutPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Size dimensions in grid units
const SIZE_DIMENSIONS: Record<'small' | 'medium' | 'large', { width: number; height: number }> = {
  small: { width: 3.5, height: 3 },
  medium: { width: 5, height: 4 },
  large: { width: 7, height: 6 },
};

// Default layouts matching the user's preferred configuration
const DEFAULT_MODULE_LAYOUTS: Record<string, ModuleLayout> = {
  productivity: { x: -4, y: -4, size: 'large' },
  habits: { x: 4, y: -1, size: 'medium' },
  notes: { x: -12, y: 0, size: 'large' },
  finance: { x: -10, y: -5, size: 'medium' },
  maps: { x: 0, y: 4, size: 'large' },
  travel: { x: -14, y: -4, size: 'small' },
  files: { x: 4, y: -6, size: 'medium' },
  creation: { x: 10, y: 0, size: 'small' },
  health: { x: -4, y: 3, size: 'small' },
  security: { x: 10, y: -4, size: 'small' },
};

// Get default layout for a module
function getDefaultModuleLayout(module: Module): ModuleLayout {
  return DEFAULT_MODULE_LAYOUTS[module.id] || { x: 0, y: 0, size: 'medium' };
}

// Convert grid-based layout to pixel positions
function layoutToPixels(layout: ModuleLayout): LayoutPosition {
  const dims = SIZE_DIMENSIONS[layout.size];
  return {
    x: layout.x * GRID_SIZE,
    y: layout.y * GRID_SIZE,
    width: dims.width * GRID_SIZE,
    height: dims.height * GRID_SIZE,
  };
}

interface SpatialCanvasProps {
  onScaleChange?: (value: number) => void;
  scale?: number;
  recenterSignal?: number;
}

const moduleMap = APP_MODULES.reduce<Record<string, Module>>((acc, module) => {
  acc[module.id] = module;
  return acc;
}, {});

export function SpatialCanvas({ onScaleChange, scale: controlledScale, recenterSignal }: SpatialCanvasProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [internalScale, setInternalScale] = useState(controlledScale ?? 1);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const pointerStartPos = useRef({ x: 0, y: 0 });
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const panPointerId = useRef<number | null>(null);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartScale = useRef(1);
  const isPinchingRef = useRef(false);
  const navigate = useNavigate();
  const hasInitializedRecenter = useRef(false);
  
  const { settings } = useUserSettings();
  
  const visibleModules = useMemo(() => {
    return APP_MODULES.filter(module => {
      const visibility = settings?.dashboard_module_visibility;
      return visibility?.[module.id] !== false;
    });
  }, [settings?.dashboard_module_visibility]);
  
  // Calculate module positions using saved layouts or defaults
  const modulePositions = useMemo(() => {
    const positions = new Map<string, LayoutPosition>();
    const savedLayouts = settings?.dashboard_module_layouts || {};
    
    // Group modules by priority to calculate default indices
    const byPriority: Record<string, Module[]> = { center: [], inner: [], outer: [] };
    visibleModules.forEach(m => byPriority[m.priority].push(m));
    
    visibleModules.forEach((module) => {
      // Get saved layout or default
      const saved = savedLayouts[module.id] as ModuleLayout | undefined;
      if (saved) {
        positions.set(module.id, layoutToPixels(saved));
      } else {
        const defaultLayout = getDefaultModuleLayout(module);
        positions.set(module.id, layoutToPixels(defaultLayout));
      }
    });
    
    return positions;
  }, [visibleModules, settings?.dashboard_module_layouts]);

  const isControlled = controlledScale !== undefined;
  const userScale = isControlled ? controlledScale : internalScale;

  const setScaleValue = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0.4), 2.5);
      if (!isControlled) {
        setInternalScale(clamped);
      }
      onScaleChange?.(clamped);
    },
    [isControlled, onScaleChange]
  );

  useEffect(() => {
    if (!isControlled && controlledScale !== undefined) {
      setInternalScale(controlledScale);
    }
  }, [controlledScale, isControlled]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const snapToGrid = useCallback((pos: { x: number; y: number }) => {
    const snapThreshold = GRID_SIZE * 0.4;
    const nearestX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const nearestY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    
    return {
      x: Math.abs(pos.x - nearestX) < snapThreshold ? nearestX : pos.x,
      y: Math.abs(pos.y - nearestY) < snapThreshold ? nearestY : pos.y
    };
  }, []);

  useEffect(() => {
    if (recenterSignal === undefined) return;
    if (!hasInitializedRecenter.current) {
      hasInitializedRecenter.current = true;
      return;
    }

    activePointers.current.clear();
    panPointerId.current = null;
    pinchStartDistance.current = null;
    isPinchingRef.current = false;
    setIsDragging(false);
    document.body.style.userSelect = "";
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    velocityRef.current = { x: 0, y: 0 };
    setScaleValue(1);
  }, [recenterSignal, setScaleValue]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGestureStart = (event: Event) => {
      (event as GestureEventType).preventDefault();
      pinchStartScale.current = userScale;
      isPinchingRef.current = true;
    };

    const handleGestureChange = (event: Event) => {
      const gestureEvent = event as GestureEventType;
      if (typeof gestureEvent.scale !== "number") return;
      gestureEvent.preventDefault();
      setScaleValue(pinchStartScale.current * gestureEvent.scale);
    };

    const handleGestureEnd = (event: Event) => {
      (event as GestureEventType).preventDefault();
      isPinchingRef.current = false;
    };

    const options: AddEventListenerOptions = { passive: false };
    container.addEventListener("gesturestart", handleGestureStart as EventListener, options);
    container.addEventListener("gesturechange", handleGestureChange as EventListener, options);
    container.addEventListener("gestureend", handleGestureEnd as EventListener, options);

    return () => {
      container.removeEventListener("gesturestart", handleGestureStart as EventListener, options);
      container.removeEventListener("gesturechange", handleGestureChange as EventListener, options);
      container.removeEventListener("gestureend", handleGestureEnd as EventListener, options);
    };
  }, [userScale, setScaleValue]);

  const handleModuleClick = useCallback((module: Module) => {
    navigate(module.route);
  }, [navigate]);

  const applyMomentum = useCallback(() => {
    const friction = 0.92;
    const currentVelocity = { ...velocityRef.current };
    const currentPosition = { ...positionRef.current };

    const animate = () => {
      if (Math.abs(currentVelocity.x) > 0.5 || Math.abs(currentVelocity.y) > 0.5) {
        currentVelocity.x *= friction;
        currentVelocity.y *= friction;
        currentPosition.x += currentVelocity.x;
        currentPosition.y += currentVelocity.y;
        setPosition({ ...currentPosition });
        positionRef.current = { ...currentPosition };
        requestAnimationFrame(animate);
      } else {
        const snapped = snapToGrid(currentPosition);
        setPosition(snapped);
        positionRef.current = snapped;
      }
    };

    requestAnimationFrame(animate);
  }, [snapToGrid]);

  const endDrag = useCallback(
    (withMomentum: boolean) => {
      if (withMomentum) {
        applyMomentum();
      } else {
        const snapped = snapToGrid(positionRef.current);
        setPosition(snapped);
        positionRef.current = snapped;
      }
      setIsDragging(false);
      document.body.style.userSelect = "";
    },
    [applyMomentum, snapToGrid]
  );

  const handleWheel = useCallback((e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 0 ? -0.002 : -0.001);
      setScaleValue(userScale + delta);
      return;
    }

    const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    let deltaX = e.deltaX * multiplier * -1;
    let deltaY = e.deltaY * multiplier * -1;

    if (Math.abs(e.deltaX) < 0.01 && Math.abs(e.deltaY) > 0 && e.shiftKey) {
      deltaX = deltaY;
      deltaY = 0;
    }

    if (deltaX === 0 && deltaY === 0) return;

    e.preventDefault();
    velocityRef.current = { x: deltaX, y: deltaY };
    setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  }, [setScaleValue, userScale]);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    if (!containerRef.current) return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      panPointerId.current = e.pointerId;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    } else if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      pinchStartDistance.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartScale.current = userScale;
      isPinchingRef.current = true;
      setIsDragging(false);
    }
  }, [userScale]);

  const handlePointerMove = useCallback((e: ReactPointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (isPinchingRef.current && activePointers.current.size >= 2 && pinchStartDistance.current) {
      const points = Array.from(activePointers.current.values()).slice(0, 2);
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (pinchStartDistance.current > 0) {
        setScaleValue(pinchStartScale.current * (distance / pinchStartDistance.current));
      }
      return;
    }

    if (panPointerId.current === e.pointerId) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;

      if (!isDraggingRef.current) {
        const totalDelta = Math.hypot(e.clientX - pointerStartPos.current.x, e.clientY - pointerStartPos.current.y);
        if (totalDelta < 3) {
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          return;
        }
        setIsDragging(true);
        window.getSelection?.()?.removeAllRanges?.();
        document.body.style.userSelect = "none";
        containerRef.current?.setPointerCapture?.(e.pointerId);
      }

      e.preventDefault();
      velocityRef.current = { x: deltaX, y: deltaY };
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  }, [setScaleValue]);

  const releasePointer = useCallback(
    (pointerId: number) => {
      activePointers.current.delete(pointerId);

      if (panPointerId.current === pointerId) {
        panPointerId.current = null;
        endDrag(!isPinchingRef.current && isDraggingRef.current);
      }

      if (activePointers.current.size < 2) {
        isPinchingRef.current = false;
        pinchStartDistance.current = null;
      }

      if (activePointers.current.size === 0) {
        document.body.style.userSelect = "";
      }
    },
    [endDrag]
  );

  const handlePointerUp = useCallback((e: ReactPointerEvent) => {
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    releasePointer(e.pointerId);
  }, [releasePointer]);

  const handlePointerCancel = useCallback((e: ReactPointerEvent) => {
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    releasePointer(e.pointerId);
  }, [releasePointer]);

  useEffect(() => {
    const handleWindowPointerUp = (event: PointerEvent) => {
      if (activePointers.current.has(event.pointerId)) {
        releasePointer(event.pointerId);
      }
    };

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [releasePointer]);

  // Sort modules by priority for z-index stacking
  const sortedModules = useMemo(() => {
    const priorityOrder = { center: 0, inner: 1, outer: 2 };
    return [...visibleModules].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [visibleModules]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative"
      data-dragging={isDragging ? "true" : undefined}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* Subtle gradient - draws eye toward center-left */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 45% 45%, 
              hsl(var(--primary) / 0.03) 0%, 
              transparent 60%
            ),
            hsl(var(--background))
          `
        }}
      />

      {/* Dot grid */}
      <motion.div
        className="absolute pointer-events-none"
        animate={{ x: position.x, y: position.y, scale: userScale }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        style={{
          width: GRID_SIZE * 80,
          height: GRID_SIZE * 80,
          left: '50%',
          top: '50%',
          marginLeft: -GRID_SIZE * 40,
          marginTop: -GRID_SIZE * 40,
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)`,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      />

      {/* Modules */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ x: position.x, y: position.y, scale: userScale }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="relative"
          style={{ width: GRID_SIZE * 32, height: GRID_SIZE * 24 }}
        >
          <AnimatePresence>
            {sortedModules.map((module, index) => {
              const pos = modulePositions.get(module.id);
              if (!pos) return null;

              const isHovered = hoveredModule === module.id;
              const isPrimary = module.priority === "center";

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: isHovered ? 1.015 : 1,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    delay: isPrimary ? 0 : 0.05 + index * 0.03,
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                  className={cn(
                    "absolute",
                    isPrimary ? "z-30" : module.priority === "inner" ? "z-20" : "z-10"
                  )}
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    width: pos.width,
                    height: pos.height,
                  }}
                  onMouseEnter={() => setHoveredModule(module.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                >
                  <ModuleTile
                    module={module}
                    onClick={() => handleModuleClick(module)}
                    sizeClass={module.size}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
