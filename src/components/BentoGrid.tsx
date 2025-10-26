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
    color: "from-pink-500 to-rose-500",
    size: "medium",
    summary: "5 active habits • 3 day streak"
  },
  {
    id: "budget",
    title: "Budget",
    icon: DollarSign,
    route: "/budget",
    color: "from-green-500 to-emerald-500",
    size: "large",
    summary: "$2,340 remaining this month"
  },
  {
    id: "nutrition",
    title: "Nutrition",
    icon: Apple,
    route: "/nutrition",
    color: "from-orange-500 to-amber-500",
    size: "medium",
    summary: "1,800 / 2,200 calories today"
  },
  {
    id: "automation",
    title: "Automation",
    icon: Zap,
    route: "/automation",
    color: "from-yellow-500 to-orange-500",
    size: "small",
    summary: "12 active automations"
  },
  {
    id: "goals",
    title: "Goals",
    icon: Target,
    route: "/goals",
    color: "from-blue-500 to-cyan-500",
    size: "medium",
    summary: "3 goals in progress"
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: TrendingUp,
    route: "/analytics",
    color: "from-purple-500 to-pink-500",
    size: "large",
    summary: "View your insights"
  },
  {
    id: "calendar",
    title: "Calendar",
    icon: Calendar,
    route: "/calendar",
    color: "from-indigo-500 to-purple-500",
    size: "small",
    summary: "3 events today"
  },
  {
    id: "journal",
    title: "Journal",
    icon: BookOpen,
    route: "/journal",
    color: "from-teal-500 to-green-500",
    size: "medium",
    summary: "Write your thoughts"
  },
  {
    id: "wellness",
    title: "Wellness",
    icon: Activity,
    route: "/wellness",
    color: "from-red-500 to-pink-500",
    size: "small",
    summary: "Heart rate: 72 bpm"
  },
  {
    id: "focus",
    title: "Focus",
    icon: Brain,
    route: "/focus",
    color: "from-violet-500 to-purple-500",
    size: "medium",
    summary: "Deep work mode"
  }
];

export function BentoGrid() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [scale, setScale] = useState(1);
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
      setPosition({
        x: position.x + e.movementX,
        y: position.y + e.movementY
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
      <motion.div
        animate={{
          x: position.x,
          y: position.y,
          scale: scale
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="grid grid-cols-4 gap-4 p-8">
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`
                ${module.size === "small" ? "col-span-1 row-span-1" : ""}
                ${module.size === "medium" ? "col-span-2 row-span-1" : ""}
                ${module.size === "large" ? "col-span-2 row-span-2" : ""}
              `}
            >
              <ModuleTile module={module} onClick={() => handleModuleClick(module)} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Zoom indicator */}
      <div className="fixed bottom-24 right-6 glass rounded-lg px-4 py-2 text-sm text-muted-foreground">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
