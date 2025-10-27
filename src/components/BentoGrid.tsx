import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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
  Brain
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface Module {
  id: string;
  title: string;
  icon: any;
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

export function BentoGrid() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(1);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const navigate = useNavigate();

  const handleModuleClick = (module: Module) => {
    navigate(module.route);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(0.5, scale + delta), 2);
      setScale(newScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      // Allow dragging from background or grid container
      if (target === containerRef.current || target.classList.contains('spatial-grid') || target.closest('.grid')) {
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        setVelocity({ x: 0, y: 0 });
        // Disable text selection while dragging
        document.body.style.userSelect = 'none';
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      const newX = position.x + deltaX;
      const newY = position.y + deltaY;
      setPosition({ x: newX, y: newY });
      
      // Track velocity for momentum
      setVelocity({ x: deltaX, y: deltaY });
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      
      // Micro-parallax effect
      setParallaxOffset({
        x: newX * 0.02,
        y: newY * 0.02
      });
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Re-enable text selection
      document.body.style.userSelect = '';
      
      // Apply momentum/inertia
      const friction = 0.95;
      let currentVelocity = { ...velocity };
      let currentPosition = { ...position };
      
      const animate = () => {
        if (Math.abs(currentVelocity.x) > 0.5 || Math.abs(currentVelocity.y) > 0.5) {
          currentVelocity.x *= friction;
          currentVelocity.y *= friction;
          currentPosition.x += currentVelocity.x;
          currentPosition.y += currentVelocity.y;
          
          setPosition({ ...currentPosition });
          setParallaxOffset({
            x: currentPosition.x * 0.02,
            y: currentPosition.y * 0.02
          });
          
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden relative spatial-grid"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
          className="grid grid-cols-4 gap-6 p-8"
          style={{ width: 'fit-content' }}
        >
          {modules.map((module, index) => (
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
              className={`
                ${module.size === "small" ? "col-span-1 row-span-1" : ""}
                ${module.size === "medium" ? "col-span-2 row-span-1" : ""}
                ${module.size === "large" ? "col-span-2 row-span-2" : ""}
              `}
            >
              <ModuleTile module={module} onClick={() => handleModuleClick(module)} />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Zoom indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-24 right-6 glass rounded-lg px-3 py-2 text-xs text-muted-foreground font-medium"
      >
        {Math.round(scale * 100)}%
      </motion.div>
    </div>
  );
}
