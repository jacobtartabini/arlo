import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from "react";
import { motion } from "framer-motion";
import { ModuleTile } from "./ModuleTile";
import {
  Heart,
  DollarSign,
  Apple,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  BookOpen,
  Activity,
  Brain,
  type LucideIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Module {
  id: string;
  title: string;
  icon: LucideIcon;
  route: string;
  color: string;
  size: "small" | "medium" | "large";
  summary?: string;
}

const modules: Module[] = [
  {
    id: "habits",
    title: "Habits",
    icon: Heart,
    route: "/habits",
    color: "primary",
    size: "medium",
    summary: "5 active habits • 3 day streak"
  },
  {
    id: "budget",
    title: "Budget",
    icon: DollarSign,
    route: "/budget",
    color: "accent",
    size: "large",
    summary: "$2,340 remaining this month"
  },
  {
    id: "nutrition",
    title: "Nutrition",
    icon: Apple,
    route: "/nutrition",
    color: "primary",
    size: "medium",
    summary: "1,800 / 2,200 calories today"
  },
  {
    id: "automation",
    title: "Automation",
    icon: Zap,
    route: "/automation",
    color: "accent",
    size: "small",
    summary: "12 active automations"
  },
  {
    id: "goals",
    title: "Goals",
    icon: Target,
    route: "/goals",
    color: "primary",
    size: "medium",
    summary: "3 goals in progress"
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: TrendingUp,
    route: "/analytics",
    color: "accent",
    size: "large",
    summary: "View your insights"
  },
  {
    id: "calendar",
    title: "Calendar",
    icon: Calendar,
    route: "/calendar",
    color: "primary",
    size: "small",
    summary: "3 events today"
  },
  {
    id: "journal",
    title: "Journal",
    icon: BookOpen,
    route: "/journal",
    color: "accent",
    size: "medium",
    summary: "Write your thoughts"
  },
  {
    id: "wellness",
    title: "Wellness",
    icon: Activity,
    route: "/wellness",
    color: "primary",
    size: "small",
    summary: "Heart rate: 72 bpm"
  },
  {
    id: "focus",
    title: "Focus",
    icon: Brain,
    route: "/focus",
    color: "accent",
    size: "medium",
    summary: "Deep work mode"
  }
];

interface BentoGridProps {
  onScaleChange?: (value: number) => void;
  scale?: number;
}

type LayoutConfig = {
  columns: number;
  gap: number;
  padding: number;
  baseTile: number;
};

const getLayoutConfig = (width: number): LayoutConfig => {
  if (width >= 1600) {
    return { columns: 5, gap: 36, padding: 56, baseTile: 300 };
  }
  if (width >= 1280) {
    return { columns: 4, gap: 32, padding: 48, baseTile: 280 };
  }
  if (width >= 1024) {
    return { columns: 3, gap: 28, padding: 40, baseTile: 260 };
  }
  if (width >= 768) {
    return { columns: 2, gap: 24, padding: 32, baseTile: 240 };
  }
  return { columns: 1, gap: 20, padding: 24, baseTile: 220 };
};

type ModuleSpan = {
  colSpan: number;
  rowSpan: number;
};

const getModuleSpan = (size: Module["size"], columns: number): ModuleSpan => {
  switch (columns) {
    case 1:
      return { colSpan: 1, rowSpan: 1 };
    case 2:
      return {
        colSpan: size === "small" ? 1 : 2,
        rowSpan: size === "large" ? 2 : 1
      };
    case 3:
      if (size === "large") {
        return { colSpan: 3, rowSpan: 2 };
      }
      if (size === "medium") {
        return { colSpan: 2, rowSpan: 1 };
      }
      return { colSpan: 1, rowSpan: 1 };
    default:
      return {
        colSpan: size === "small" ? 1 : 2,
        rowSpan: size === "large" ? 2 : 1
      };
  }
};

export function BentoGrid({ onScaleChange, scale: controlledScale }: BentoGridProps) {
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
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() =>
    typeof window !== "undefined" ? getLayoutConfig(window.innerWidth) : getLayoutConfig(1440)
  );

  const isControlled = controlledScale !== undefined;
  const scale = isControlled ? controlledScale : internalScale;

  const setScaleValue = (next: number) => {
    const clamped = Math.min(Math.max(next, 0.5), 2);
    if (!isControlled) {
      setInternalScale(clamped);
    }
    onScaleChange?.(clamped);
  };

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
  }, [layoutConfig.columns]);

  const handleModuleClick = (module: Module) => {
    navigate(module.route);
  };

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
      const delta = e.deltaY * -0.001;
      const newScale = scale + delta;
      setScaleValue(newScale);
      return;
    }

    e.preventDefault();
    const multiplier = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const deltaX = e.deltaX * multiplier * -1;
    const deltaY = e.deltaY * multiplier * -1;

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

    container.setPointerCapture?.(e.pointerId);
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
      pinchStartScale.current = scale;
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
        document.body.style.userSelect = "none";
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
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{
            x: position.x,
            y: position.y,
            scale: scale
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="grid"
          style={{
            width: "fit-content",
            gridTemplateColumns: `repeat(${layoutConfig.columns}, minmax(${layoutConfig.baseTile}px, 1fr))`,
            gap: layoutConfig.gap,
            padding: layoutConfig.padding,
            gridAutoRows: layoutConfig.baseTile
          }}
        >
          {modules.map((module, index) => {
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
                  minWidth: layoutConfig.baseTile * Math.min(span.colSpan, layoutConfig.columns),
                  minHeight: layoutConfig.baseTile * span.rowSpan
                }}
              >
                <ModuleTile module={module} onClick={() => handleModuleClick(module)} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>

    </div>
  );
}
