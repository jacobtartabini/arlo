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
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (e.button === 0 && e.target === containerRef.current) {
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = position.x + e.movementX;
      const newY = position.y + e.movementY;
      setPosition({ x: newX, y: newY });
      
      // Micro-parallax effect
      setParallaxOffset({
        x: newX * 0.02,
        y: newY * 0.02
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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
      {/* Parallax background layer */}
      <motion.div
        animate={{
          x: parallaxOffset.x,
          y: parallaxOffset.y
        }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${50 + parallaxOffset.x * 0.1}% ${50 + parallaxOffset.y * 0.1}%, hsl(var(--primary) / 0.03) 0%, transparent 50%)`
        }}
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
