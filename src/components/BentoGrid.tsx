import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import { motion } from "framer-motion";
import { ModuleTile } from "./ModuleTile";
import { useNavigate } from "react-router-dom";
import { APP_MODULES, type Module } from "@/lib/app-navigation";
import { useDashboardData } from "@/hooks/useDashboardData";

type GestureEventType = Event & {
  scale: number;
};

const moduleMap = APP_MODULES.reduce<Record<string, Module>>((acc, module) => {
  acc[module.id] = module;
  return acc;
}, {});

const moduleOrderPresets: Record<number, string[]> = {
  3: [
    "finance",
    "productivity",
    "creation",
    "travel",
    "security",
    "files",
    "health",
    "knowledge",
    "automations",
    "insights",
    "notifications"
  ],
  4: [
    "finance",
    "productivity",
    "creation",
    "travel",
    "security",
    "files",
    "health",
    "knowledge",
    "automations",
    "insights",
    "notifications"
  ],
  5: [
    "finance",
    "productivity",
    "creation",
    "travel",
    "security",
    "files",
    "health",
    "knowledge",
    "automations",
    "insights",
    "notifications"
  ]
};

interface BentoGridProps {
  onScaleChange?: (value: number) => void;
  scale?: number;
  recenterSignal?: number;
}

type LayoutConfig = {
  columns: number;
  gap: number;
  padding: number;
  baseTile: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getLayoutConfig = (width: number): LayoutConfig => {
  if (width >= 1600) {
    const gap = clamp(width * 0.018, 24, 40);
    const padding = clamp(width * 0.035, 48, 96);
    const rawTile = (width - padding * 2 - gap * 4) / 5;
    const baseTile = clamp(rawTile, 250, 320);
    return { columns: 5, gap, padding, baseTile };
  }
  if (width >= 1280) {
    const gap = clamp(width * 0.016, 22, 32);
    const padding = clamp(width * 0.03, 40, 80);
    const rawTile = (width - padding * 2 - gap * 3) / 4;
    const baseTile = clamp(rawTile, 230, 300);
    return { columns: 4, gap, padding, baseTile };
  }
  if (width >= 1024) {
    const gap = clamp(width * 0.016, 20, 28);
    const padding = clamp(width * 0.028, 32, 64);
    const rawTile = (width - padding * 2 - gap * 2) / 3;
    const baseTile = clamp(rawTile, 210, 280);
    return { columns: 3, gap, padding, baseTile };
  }
  if (width >= 768) {
    const gap = clamp(width * 0.02, 16, 24);
    const padding = clamp(width * 0.035, 28, 48);
    const rawTile = (width - padding * 2 - gap) / 2;
    const baseTile = clamp(rawTile, 190, 260);
    return { columns: 2, gap, padding, baseTile };
  }
  const gap = clamp(width * 0.035, 10, 16);
  const padding = clamp(width * 0.055, 14, 28);
  const rawTile = width - padding * 2;
  const baseTile = clamp(rawTile, 180, 240);
  return { columns: 1, gap, padding, baseTile };
};

type ModuleSpan = {
  colSpan: number;
  rowSpan: number;
};

const getModuleSpan = (size: Module["size"], columns: number): ModuleSpan => {
  // Map new size system: primary = large, secondary = medium, tertiary = small
  const isPrimary = size === "primary";
  const isSecondary = size === "secondary";
  
  switch (columns) {
    case 1:
      return { colSpan: 1, rowSpan: 1 };
    case 2:
      return {
        colSpan: isPrimary || isSecondary ? 2 : 1,
        rowSpan: isPrimary ? 2 : 1
      };
    case 3:
      if (isPrimary) {
        return { colSpan: 3, rowSpan: 2 };
      }
      if (isSecondary) {
        return { colSpan: 2, rowSpan: 1 };
      }
      return { colSpan: 1, rowSpan: 1 };
    case 4:
      if (isPrimary) {
        return { colSpan: 3, rowSpan: 2 };
      }
      if (isSecondary) {
        return { colSpan: 2, rowSpan: 1 };
      }
      return { colSpan: 1, rowSpan: 1 };
    default:
      if (isPrimary) {
        return { colSpan: 3, rowSpan: 2 };
      }
      if (isSecondary) {
        return { colSpan: 2, rowSpan: 1 };
      }
      return { colSpan: 1, rowSpan: 1 };
  }
};

export function BentoGrid({ onScaleChange, scale: controlledScale, recenterSignal }: BentoGridProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [internalScale, setInternalScale] = useState(controlledScale ?? 1);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
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
  const dashboardData = useDashboardData();
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() =>
    typeof window !== "undefined" ? getLayoutConfig(window.innerWidth) : getLayoutConfig(1440)
  );

  const isControlled = controlledScale !== undefined;
  const userScale = isControlled ? controlledScale : internalScale;

  const hasInitializedRecenter = useRef(false);

  const setScaleValue = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 0.5), 2);
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

  useEffect(() => {
    const updateLayout = () => {
      if (typeof window === "undefined") return;
      setLayoutConfig((prev) => {
        const next = getLayoutConfig(window.innerWidth);
        if (
          prev.columns === next.columns &&
          prev.gap === next.gap &&
          prev.padding === next.padding &&
          prev.baseTile === next.baseTile
        ) {
          return prev;
        }
        return next;
      });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setLayoutConfig((prev) => {
          const next = getLayoutConfig(entry.contentRect.width);
          if (
            prev.columns === next.columns &&
            prev.gap === next.gap &&
            prev.padding === next.padding &&
            prev.baseTile === next.baseTile
          ) {
            return prev;
          }
          return next;
        });
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    setParallaxOffset({ x: 0, y: 0 });
  }, [layoutConfig.baseTile, layoutConfig.columns, layoutConfig.gap, layoutConfig.padding]);

  useEffect(() => {
    if (recenterSignal === undefined) {
      return;
    }

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
    setParallaxOffset({ x: 0, y: 0 });
    setScaleValue(1);
  }, [recenterSignal, setScaleValue]);

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
      if (typeof gestureEvent.scale !== "number") {
        return;
      }
      gestureEvent.preventDefault();
      setScaleValue(pinchStartScale.current * gestureEvent.scale);
    };

    const handleGestureEnd = (event: Event) => {
      const gestureEvent = event as GestureEventType;
      gestureEvent.preventDefault();
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

  const handleModuleClick = (module: Module) => {
    navigate(module.route);
  };

  const columns = layoutConfig.columns;

  const orderedModules = useMemo(() => {
    const preset = moduleOrderPresets[columns];
    if (!preset) {
      return APP_MODULES;
    }

    const seen = new Set<string>();
    const arranged: Module[] = [];

    for (const id of preset) {
      const module = moduleMap[id];
      if (module && !seen.has(id)) {
        arranged.push(module);
        seen.add(id);
      }
    }

    for (const module of APP_MODULES) {
      if (!seen.has(module.id)) {
        arranged.push(module);
      }
    }

    return arranged;
  }, [columns]);

  const { baseTile, gap, padding } = layoutConfig;

  const gridWidth = useMemo(() => {
    return columns * baseTile + gap * (columns - 1) + padding * 2;
  }, [baseTile, columns, gap, padding]);

  const applyMomentum = useCallback(() => {
    const friction = 0.95;
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
        setParallaxOffset({
          x: currentPosition.x * 0.02,
          y: currentPosition.y * 0.02
        });

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

  const handleWheel = (e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomIntensity = e.deltaMode === 0 ? 0.002 : 0.001;
      const delta = e.deltaY * -zoomIntensity;
      const newScale = userScale + delta;
      setScaleValue(newScale);
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

    if (deltaX === 0 && deltaY === 0) {
      return;
    }

    e.preventDefault();

    velocityRef.current = { x: deltaX, y: deltaY };
    setPosition((prev) => {
      const newX = prev.x + deltaX;
      const newY = prev.y + deltaY;
      setParallaxOffset({ x: newX * 0.02, y: newY * 0.02 });
      return { x: newX, y: newY };
    });
  };

  const handlePointerDown = (e: ReactPointerEvent) => {
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
  };

  const handlePointerMove = (e: ReactPointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) {
      return;
    }

    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (isPinchingRef.current && activePointers.current.size >= 2 && pinchStartDistance.current) {
      const points = Array.from(activePointers.current.values()).slice(0, 2);
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      if (pinchStartDistance.current > 0) {
        const scaleFactor = distance / pinchStartDistance.current;
        setScaleValue(pinchStartScale.current * scaleFactor);
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
        const selection = window.getSelection?.();
        selection?.removeAllRanges?.();
        document.body.style.userSelect = "none";
        containerRef.current?.setPointerCapture?.(e.pointerId);
      }

      e.preventDefault();
      velocityRef.current = { x: deltaX, y: deltaY };
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      setPosition((prev) => {
        const newX = prev.x + deltaX;
        const newY = prev.y + deltaY;
        setParallaxOffset({ x: newX * 0.02, y: newY * 0.02 });
        return { x: newX, y: newY };
      });
    }
  };

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

  const handlePointerUp = (e: ReactPointerEvent) => {
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    releasePointer(e.pointerId);
  };

  const handlePointerCancel = (e: ReactPointerEvent) => {
    containerRef.current?.releasePointerCapture?.(e.pointerId);
    releasePointer(e.pointerId);
  };

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
      className="w-full h-full overflow-hidden relative spatial-grid"
      data-dragging={isDragging ? "true" : undefined}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      {/* Animated dot grid background with micro-parallax */}
      <motion.div
        animate={{
          x: parallaxOffset.x * 0.5,
          y: parallaxOffset.y * 0.5
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute inset-0 pointer-events-none dot-grid-pattern"
      />

      {/* Main grid - centered */}
      <div className="absolute inset-0 flex items-start justify-center">
        <motion.div
          animate={{
            x: position.x,
            y: position.y,
            scale: userScale
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="grid"
          style={{
            width: "100%",
            maxWidth: `${gridWidth}px`,
            gridTemplateColumns: `repeat(${layoutConfig.columns}, minmax(${Math.round(
              layoutConfig.baseTile * 0.9
            )}px, 1fr))`,
            gap: layoutConfig.gap,
            padding: layoutConfig.padding,
            gridAutoRows: layoutConfig.baseTile,
            gridAutoFlow: "dense",
            boxSizing: "border-box"
          }}
        >
          {orderedModules.map((module, index) => {
            const span = getModuleSpan(module.size, layoutConfig.columns);
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 200,
                  damping: 20
                }}
                style={{
                  gridColumn: `span ${span.colSpan} / span ${span.colSpan}`,
                  gridRow: `span ${span.rowSpan} / span ${span.rowSpan}`,
                  minWidth:
                    layoutConfig.baseTile * Math.min(span.colSpan, layoutConfig.columns),
                  minHeight: layoutConfig.baseTile * span.rowSpan,
                  width: "100%",
                  height: "100%",
                  maxWidth: "100%"
                }}
              >
                <ModuleTile 
                  module={module} 
                  onClick={() => handleModuleClick(module)} 
                  dashboardData={dashboardData}
                  onTaskToggle={dashboardData.onTaskToggle}
                  onTaskCreate={dashboardData.onTaskCreate}
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

    </div>
  );
}
