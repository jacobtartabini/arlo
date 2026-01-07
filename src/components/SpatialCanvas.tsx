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
import { APP_MODULES, type Module, type ModulePriority } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/providers/UserSettingsProvider";
import { ModuleTile } from "@/components/ModuleTile";

type GestureEventType = Event & { scale: number };

// Grid configuration - 48px grid
const GRID_SIZE = 48;

// Size configurations for each tier
const SIZE_CONFIG = {
  primary: { widthUnits: 6, heightUnits: 5 },
  secondary: { widthUnits: 5, heightUnits: 4 },
  tertiary: { widthUnits: 4, heightUnits: 3 },
};

// Radial layout positions - center modules surrounded by inner and outer rings
interface RadialPosition {
  id: string;
  priority: ModulePriority;
  angle: number; // Position around the ring (in degrees)
  ring: number; // 0 = center, 1 = inner, 2 = outer
}

// Generate positions for visible modules based on priority
function generateRadialLayout(modules: Module[]): Map<string, { x: number; y: number; width: number; height: number }> {
  const layout = new Map<string, { x: number; y: number; width: number; height: number }>();
  
  const centerModules = modules.filter(m => m.priority === "center");
  const innerModules = modules.filter(m => m.priority === "inner");
  const outerModules = modules.filter(m => m.priority === "outer");
  
  // Center ring - positioned side by side in the middle
  const centerSpacing = GRID_SIZE * 1;
  let centerX = -(centerModules.length - 1) * (SIZE_CONFIG.primary.widthUnits * GRID_SIZE + centerSpacing) / 2;
  
  centerModules.forEach((module) => {
    const size = SIZE_CONFIG.primary;
    layout.set(module.id, {
      x: centerX,
      y: -(size.heightUnits * GRID_SIZE) / 2,
      width: size.widthUnits * GRID_SIZE,
      height: size.heightUnits * GRID_SIZE,
    });
    centerX += size.widthUnits * GRID_SIZE + centerSpacing;
  });
  
  // Inner ring - arranged in a semi-circle around center
  const innerRadius = GRID_SIZE * 8;
  const innerStartAngle = -60;
  const innerEndAngle = 60;
  const innerAngleStep = innerModules.length > 1 ? (innerEndAngle - innerStartAngle) / (innerModules.length - 1) : 0;
  
  innerModules.forEach((module, index) => {
    const size = SIZE_CONFIG.secondary;
    const angle = innerModules.length === 1 ? 0 : innerStartAngle + index * innerAngleStep;
    const radians = (angle * Math.PI) / 180;
    
    layout.set(module.id, {
      x: Math.sin(radians) * innerRadius - (size.widthUnits * GRID_SIZE) / 2,
      y: -Math.cos(radians) * innerRadius - (size.heightUnits * GRID_SIZE) / 2 + GRID_SIZE * 2,
      width: size.widthUnits * GRID_SIZE,
      height: size.heightUnits * GRID_SIZE,
    });
  });
  
  // Outer ring - spread around the edges
  const outerRadius = GRID_SIZE * 13;
  const outerStartAngle = -80;
  const outerEndAngle = 80;
  const outerAngleStep = outerModules.length > 1 ? (outerEndAngle - outerStartAngle) / (outerModules.length - 1) : 0;
  
  outerModules.forEach((module, index) => {
    const size = SIZE_CONFIG.tertiary;
    const angle = outerModules.length === 1 ? 0 : outerStartAngle + index * outerAngleStep;
    const radians = (angle * Math.PI) / 180;
    
    layout.set(module.id, {
      x: Math.sin(radians) * outerRadius - (size.widthUnits * GRID_SIZE) / 2,
      y: -Math.cos(radians) * outerRadius - (size.heightUnits * GRID_SIZE) / 2 + GRID_SIZE * 4,
      width: size.widthUnits * GRID_SIZE,
      height: size.heightUnits * GRID_SIZE,
    });
  });
  
  return layout;
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
  
  // Get user's module visibility settings
  const { settings } = useUserSettings();
  
  // Filter modules based on visibility settings
  const visibleModules = useMemo(() => {
    return APP_MODULES.filter(module => {
      const visibility = settings?.dashboard_module_visibility;
      return visibility?.[module.id] !== false;
    });
  }, [settings?.dashboard_module_visibility]);
  
  // Generate radial layout for visible modules
  const modulePositions = useMemo(() => {
    return generateRadialLayout(visibleModules);
  }, [visibleModules]);

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

  // Snap position to grid
  const snapToGrid = useCallback((pos: { x: number; y: number }) => {
    const snapThreshold = GRID_SIZE * 0.4;
    const nearestX = Math.round(pos.x / GRID_SIZE) * GRID_SIZE;
    const nearestY = Math.round(pos.y / GRID_SIZE) * GRID_SIZE;
    
    const distX = Math.abs(pos.x - nearestX);
    const distY = Math.abs(pos.y - nearestY);
    
    return {
      x: distX < snapThreshold ? nearestX : pos.x,
      y: distY < snapThreshold ? nearestY : pos.y
    };
  }, []);

  // Recenter handling
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

  // Gesture handling for Safari
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleGestureStart = (event: Event) => {
      const gestureEvent = event as GestureEventType;
      gestureEvent.preventDefault();
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
      const zoomIntensity = e.deltaMode === 0 ? 0.002 : 0.001;
      const delta = e.deltaY * -zoomIntensity;
      setScaleValue(userScale + delta);
      return;
    }

    const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    let deltaX = e.deltaX;
    let deltaY = e.deltaY;

    if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) > 0 && e.shiftKey) {
      deltaX = deltaY;
      deltaY = 0;
    }

    deltaX *= multiplier * -1;
    deltaY *= multiplier * -1;

    if (deltaX === 0 && deltaY === 0) return;

    e.preventDefault();
    velocityRef.current = { x: deltaX, y: deltaY };
    setPosition((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  }, [setScaleValue, userScale]);

  const handlePointerDown = useCallback((e: ReactPointerEvent) => {
    const container = containerRef.current;
    if (!container) return;

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      panPointerId.current = e.pointerId;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      pointerStartPos.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    } else if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartDistance.current = distance;
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
        const totalDeltaX = e.clientX - pointerStartPos.current.x;
        const totalDeltaY = e.clientY - pointerStartPos.current.y;
        if (Math.hypot(totalDeltaX, totalDeltaY) < 3) {
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
      setPosition((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
    }
  }, [setScaleValue]);

  const releasePointer = useCallback(
    (pointerId: number) => {
      activePointers.current.delete(pointerId);

      if (panPointerId.current === pointerId) {
        panPointerId.current = null;
        const shouldApplyMomentum = !isPinchingRef.current && isDraggingRef.current;
        endDrag(shouldApplyMomentum);
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
      {/* Subtle radial gradient background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, 
              hsl(var(--primary) / 0.04) 0%, 
              transparent 50%
            ),
            radial-gradient(circle at 50% 50%, 
              hsl(var(--background)) 0%, 
              hsl(var(--background)) 100%
            )
          `
        }}
      />

      {/* Dot grid background */}
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
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.2) 1.5px, transparent 1.5px)`,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      />

      {/* Main canvas with modules */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ x: position.x, y: position.y, scale: userScale }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="relative"
          style={{ width: GRID_SIZE * 32, height: GRID_SIZE * 24 }}
        >
          <AnimatePresence>
            {visibleModules.map((module, index) => {
              const pos = modulePositions.get(module.id);
              if (!pos) return null;

              const isHovered = hoveredModule === module.id;

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: isHovered ? 1.02 : 1,
                    x: pos.x,
                    y: pos.y,
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{
                    delay: index * 0.04,
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                  className={cn(
                    "absolute",
                    module.priority === "center" && "z-20",
                    module.priority === "inner" && "z-10"
                  )}
                  style={{
                    width: pos.width,
                    height: pos.height,
                    left: "50%",
                    top: "50%",
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
