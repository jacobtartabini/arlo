import { motion } from "framer-motion";
import { Map, MessageCircle, Plane, FolderOpen, HeartPulse, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Map;
  route: string;
  gradient: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { 
    id: "chat", 
    label: "Chat", 
    icon: MessageCircle, 
    route: "/chat", 
    gradient: "from-primary/20 to-primary/5" 
  },
  { 
    id: "calendar", 
    label: "Calendar", 
    icon: Calendar, 
    route: "/calendar", 
    gradient: "from-blue-500/20 to-blue-500/5" 
  },
  { 
    id: "maps", 
    label: "Maps", 
    icon: Map, 
    route: "/maps", 
    gradient: "from-emerald-500/20 to-emerald-500/5" 
  },
  { 
    id: "travel", 
    label: "Travel", 
    icon: Plane, 
    route: "/travel", 
    gradient: "from-violet-500/20 to-violet-500/5" 
  },
  { 
    id: "files", 
    label: "Files", 
    icon: FolderOpen, 
    route: "/files", 
    gradient: "from-amber-500/20 to-amber-500/5" 
  },
  { 
    id: "health", 
    label: "Health", 
    icon: HeartPulse, 
    route: "/health", 
    gradient: "from-rose-500/20 to-rose-500/5" 
  },
];

export function MobileQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="px-6">
      <h3 className="text-[13px] font-semibold text-muted-foreground/70 uppercase tracking-wider mb-3">
        Quick Access
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(action.route)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 py-4 px-2",
                "rounded-2xl bg-gradient-to-b border border-border/30",
                action.gradient,
                "transition-all active:opacity-80"
              )}
            >
              <Icon className="h-5 w-5 text-foreground/80" strokeWidth={1.75} />
              <span className="text-[11px] font-medium text-foreground/70">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
