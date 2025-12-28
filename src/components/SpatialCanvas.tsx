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

type GestureEventType = Event & { scale: number };

// Grid configuration - 48px grid to match dot-grid background
const GRID_SIZE = 48;

// Module layout configuration - grid-aligned positioning
interface ModulePosition {
  id: string;
  gridX: number; // grid units from center
  gridY: number; // grid units from center
  widthUnits: number; // width in grid units
  heightUnits: number; // height in grid units
  zIndex: number;
}

// Define hierarchical layout - tighter spacing, aligned to grid
const moduleLayout: ModulePosition[] = [
  // Primary hub - center of gravity (largest)
  { id: "productivity", gridX: 0, gridY: 0, widthUnits: 6, heightUnits: 5, zIndex: 10 },
  
  // Inner ring - high priority (large) - moved closer
  { id: "finance", gridX: -5, gridY: -4, widthUnits: 5, heightUnits: 4, zIndex: 9 },
  { id: "creation", gridX: 5, gridY: -4, widthUnits: 5, heightUnits: 4, zIndex: 8 },
  { id: "notes", gridX: -5, gridY: 4, widthUnits: 5, heightUnits: 4, zIndex: 7 },
  { id: "health", gridX: 5, gridY: 4, widthUnits: 5, heightUnits: 4, zIndex: 6 },
  
  // Outer ring - secondary modules (medium) - tighter
  { id: "travel", gridX: -9, gridY: 0, widthUnits: 4, heightUnits: 4, zIndex: 5 },
  { id: "security", gridX: 9, gridY: 0, widthUnits: 4, heightUnits: 4, zIndex: 4 },
  { id: "knowledge", gridX: -7, gridY: 7, widthUnits: 4, heightUnits: 3, zIndex: 3 },
  { id: "files", gridX: 7, gridY: -7, widthUnits: 4, heightUnits: 3, zIndex: 3 },
  
  // Peripheral - utility modules (smaller) - closer
  { id: "automations", gridX: 0, gridY: -6, widthUnits: 4, heightUnits: 3, zIndex: 2 },
  { id: "insights", gridX: 0, gridY: 7, widthUnits: 4, heightUnits: 3, zIndex: 2 },
  { id: "habits", gridX: 7, gridY: 7, widthUnits: 4, heightUnits: 3, zIndex: 1 },
];

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

  // Snap position to grid with soft easing
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
        // Soft snap when momentum ends
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
        // Soft snap when drag ends without momentum
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

  // Snapped position for grid background alignment
  const snappedBgPosition = useMemo(() => {
    return {
      x: position.x % GRID_SIZE,
      y: position.y % GRID_SIZE
    };
  }, [position]);

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
      {/* Subtle radial gradient background emanating from center */}
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

      {/* Prominent dot grid - moves in sync with modules */}
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
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.25) 1.5px, transparent 1.5px)`,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        }}
      />

      {/* Main canvas with modules */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ x: position.x, y: position.y, scale: userScale }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="relative"
          style={{ width: GRID_SIZE * 32, height: GRID_SIZE * 20 }}
        >
          <AnimatePresence>
            {moduleLayout.map((layoutPos, index) => {
              const module = moduleMap[layoutPos.id];
              if (!module) return null;

              const Icon = module.icon;
              const isHovered = hoveredModule === module.id;
              const isPrimary = index === 0;
              const isInnerRing = index >= 1 && index <= 4;
              
              // Calculate pixel position from grid units
              const pixelX = layoutPos.gridX * GRID_SIZE;
              const pixelY = layoutPos.gridY * GRID_SIZE;
              
              // Calculate size from grid units
              const width = layoutPos.widthUnits * GRID_SIZE;
              const height = layoutPos.heightUnits * GRID_SIZE;

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{
                    opacity: 1,
                    scale: isHovered ? 1.02 : 1,
                    x: pixelX - width / 2,
                    y: pixelY - height / 2,
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    delay: index * 0.03,
                    type: "spring",
                    stiffness: 400,
                    damping: 30,
                  }}
                  className={cn(
                    "absolute cursor-pointer group",
                    isPrimary && "z-20",
                    isInnerRing && "z-10"
                  )}
                  style={{
                    width,
                    height,
                    zIndex: layoutPos.zIndex + (isHovered ? 50 : 0),
                  }}
                  onMouseEnter={() => setHoveredModule(module.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  onClick={() => !isDragging && handleModuleClick(module)}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Module card */}
                  <div
                    className={cn(
                      "w-full h-full rounded-2xl border backdrop-blur-sm",
                      "flex flex-col p-5 overflow-hidden",
                      "transition-all duration-200 ease-out",
                      isPrimary
                        ? "bg-card/95 border-primary/25 shadow-lg shadow-primary/5"
                        : isInnerRing
                        ? "bg-card/90 border-border/50 shadow-md"
                        : "bg-card/80 border-border/40 shadow-sm",
                      isHovered && "border-primary/50 shadow-lg shadow-primary/10"
                    )}
                  >
                    {/* Top accent line */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        background: `linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)`,
                        transformOrigin: "center"
                      }}
                    />

                    {/* Icon */}
                    <div className={cn(
                      "rounded-xl flex items-center justify-center mb-3",
                      "bg-primary/10 transition-colors duration-200",
                      isHovered && "bg-primary/15",
                      isPrimary ? "w-12 h-12" : isInnerRing ? "w-10 h-10" : "w-9 h-9"
                    )}>
                      <Icon 
                        className={cn(
                          "text-primary",
                          isPrimary ? "w-6 h-6" : isInnerRing ? "w-5 h-5" : "w-4 h-4"
                        )} 
                        strokeWidth={2} 
                      />
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      "font-semibold text-foreground tracking-tight mb-1.5",
                      isPrimary ? "text-lg" : isInnerRing ? "text-base" : "text-sm"
                    )}>
                      {module.title}
                    </h3>

                    {/* Summary - show on all modules for larger sizes */}
                    <p className={cn(
                      "text-muted-foreground leading-relaxed flex-1",
                      isPrimary ? "text-sm line-clamp-3" : isInnerRing ? "text-xs line-clamp-2" : "text-[11px] line-clamp-2"
                    )}>
                      {module.summary}
                    </p>

                    {/* Hover indicator */}
                    <motion.div
                      className="mt-auto pt-3 flex items-center gap-1.5"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span className={cn(
                        "font-medium text-primary/80",
                        isPrimary ? "text-sm" : "text-xs"
                      )}>
                        Open
                      </span>
                      <svg 
                        className={cn(
                          "text-primary/80",
                          isPrimary ? "w-4 h-4" : "w-3 h-3"
                        )}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>

                    {/* Subtle corner glow on hover */}
                    <motion.div
                      className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none rounded-br-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        background: `radial-gradient(circle at bottom right, hsl(var(--primary) / 0.08), transparent 70%)`
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
