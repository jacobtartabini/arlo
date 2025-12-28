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

// Module layout configuration - organic positioning with center of gravity
interface ModulePosition {
  id: string;
  x: number; // percentage from center
  y: number; // percentage from center
  scale: number; // relative size multiplier
  rotation: number; // subtle rotation for organic feel
  zIndex: number;
}

// Define hierarchical layout - primary modules at center, secondary radiating outward
const moduleLayout: ModulePosition[] = [
  // Primary hub - center of gravity
  { id: "productivity", x: 0, y: 0, scale: 1.15, rotation: 0, zIndex: 10 },
  
  // Inner ring - high priority
  { id: "finance", x: -18, y: -12, scale: 1.1, rotation: -1, zIndex: 9 },
  { id: "creation", x: 18, y: -10, scale: 1.05, rotation: 1.5, zIndex: 8 },
  { id: "notes", x: -16, y: 14, scale: 1.0, rotation: 0.5, zIndex: 7 },
  { id: "health", x: 16, y: 12, scale: 0.95, rotation: -0.5, zIndex: 6 },
  
  // Outer ring - secondary modules
  { id: "travel", x: -32, y: -2, scale: 0.88, rotation: 2, zIndex: 5 },
  { id: "security", x: 32, y: 0, scale: 0.88, rotation: -1.5, zIndex: 4 },
  { id: "knowledge", x: -28, y: 22, scale: 0.85, rotation: 1, zIndex: 3 },
  { id: "files", x: 28, y: -20, scale: 0.85, rotation: -2, zIndex: 3 },
  
  // Peripheral - utility modules
  { id: "automations", x: 0, y: -26, scale: 0.8, rotation: 0, zIndex: 2 },
  { id: "insights", x: -8, y: 26, scale: 0.82, rotation: 0.5, zIndex: 2 },
  { id: "habits", x: 30, y: 20, scale: 0.8, rotation: -1, zIndex: 1 },
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
    const friction = 0.94;
    const currentVelocity = { ...velocityRef.current };
    const currentPosition = { ...positionRef.current };

    const animate = () => {
      if (Math.abs(currentVelocity.x) > 0.3 || Math.abs(currentVelocity.y) > 0.3) {
        currentVelocity.x *= friction;
        currentVelocity.y *= friction;
        currentPosition.x += currentVelocity.x;
        currentPosition.y += currentVelocity.y;
        setPosition({ ...currentPosition });
        positionRef.current = { ...currentPosition };
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  const endDrag = useCallback(
    (withMomentum: boolean) => {
      if (withMomentum) {
        applyMomentum();
      }
      setIsDragging(false);
      document.body.style.userSelect = "";
    },
    [applyMomentum]
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

  // Calculate base unit for responsive sizing
  const baseUnit = useMemo(() => {
    if (typeof window === "undefined") return 280;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return Math.min(vw, vh) * 0.22;
  }, []);

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
              hsl(var(--primary) / 0.03) 0%, 
              transparent 50%
            ),
            radial-gradient(circle at 50% 50%, 
              hsl(var(--background)) 0%, 
              hsl(var(--background)) 100%
            )
          `
        }}
      />

      {/* Soft dot grid */}
      <motion.div
        animate={{ x: position.x * 0.1, y: position.y * 0.1 }}
        transition={{ type: "spring", stiffness: 100, damping: 30 }}
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }}
      />

      {/* Main canvas with modules */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ x: position.x, y: position.y, scale: userScale }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="relative"
          style={{ width: baseUnit * 8, height: baseUnit * 6 }}
        >
          <AnimatePresence>
            {moduleLayout.map((layoutPos, index) => {
              const module = moduleMap[layoutPos.id];
              if (!module) return null;

              const Icon = module.icon;
              const isHovered = hoveredModule === module.id;
              const isPrimary = index === 0;
              const isInnerRing = index >= 1 && index <= 4;
              
              // Calculate pixel position from percentage
              const pixelX = (layoutPos.x / 100) * baseUnit * 8;
              const pixelY = (layoutPos.y / 100) * baseUnit * 6;
              
              // Dynamic sizing based on hierarchy
              const width = baseUnit * layoutPos.scale * (isPrimary ? 1.3 : isInnerRing ? 1.15 : 1);
              const height = baseUnit * layoutPos.scale * (isPrimary ? 1.1 : isInnerRing ? 0.95 : 0.85);

              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: isHovered ? 1.05 : 1,
                    x: pixelX - width / 2,
                    y: pixelY - height / 2,
                    rotate: layoutPos.rotation,
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    delay: index * 0.04,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
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
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Module card */}
                  <div
                    className={cn(
                      "w-full h-full rounded-2xl border backdrop-blur-md",
                      "flex flex-col p-4 overflow-hidden",
                      "transition-all duration-300 ease-out",
                      isPrimary
                        ? "bg-card/90 border-primary/20 shadow-lg shadow-primary/5"
                        : isInnerRing
                        ? "bg-card/80 border-border/40 shadow-md"
                        : "bg-card/60 border-border/30 shadow-sm",
                      isHovered && "border-primary/40 shadow-xl shadow-primary/10"
                    )}
                  >
                    {/* Top accent line */}
                    <motion.div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isHovered ? 1 : 0 }}
                      style={{
                        background: `linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)`,
                        transformOrigin: "center"
                      }}
                    />

                    {/* Icon */}
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center mb-2",
                      "bg-primary/10 group-hover:bg-primary/15 transition-colors"
                    )}>
                      <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      "font-semibold text-foreground tracking-tight mb-1",
                      isPrimary ? "text-base" : isInnerRing ? "text-sm" : "text-xs"
                    )}>
                      {module.title}
                    </h3>

                    {/* Summary - only show on larger modules */}
                    {(isPrimary || isInnerRing) && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                        {module.summary}
                      </p>
                    )}

                    {/* Hover arrow indicator */}
                    <motion.div
                      className="mt-auto pt-2 flex items-center gap-1 text-[10px] text-muted-foreground/60"
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -4 }}
                    >
                      <span className="font-medium text-primary/80">Open</span>
                      <svg 
                        className="w-3 h-3 text-primary/80"
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </motion.div>

                    {/* Corner glow on hover */}
                    <motion.div
                      className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isHovered ? 1 : 0 }}
                      style={{
                        background: `radial-gradient(circle at bottom right, hsl(var(--primary) / 0.1), transparent 70%)`
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
