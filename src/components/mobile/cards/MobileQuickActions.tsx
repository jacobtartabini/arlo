import { motion } from "framer-motion";
import { Map, Plane, FolderOpen, HeartPulse, ShieldCheck, MessageCircle, PenTool } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Map;
  route: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "maps", label: "Maps", icon: Map, route: "/maps", color: "text-blue-500" },
  { id: "chat", label: "Chat", icon: MessageCircle, route: "/chat", color: "text-primary" },
  { id: "travel", label: "Travel", icon: Plane, route: "/travel", color: "text-violet-500" },
  { id: "files", label: "Files", icon: FolderOpen, route: "/files", color: "text-amber-500" },
  { id: "health", label: "Health", icon: HeartPulse, route: "/health", color: "text-rose-500" },
  { id: "create", label: "Create", icon: PenTool, route: "/creation", color: "text-emerald-500" },
];

export function MobileQuickActions() {
  const navigate = useNavigate();

  return (
    <div className="px-5">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Quick Access
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {QUICK_ACTIONS.slice(0, 4).map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(action.route)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 p-3",
                "rounded-xl bg-card/60 backdrop-blur-xl border border-border/50",
                "transition-colors hover:bg-card/80 active:bg-muted"
              )}
            >
              <Icon className={cn("h-5 w-5", action.color)} />
              <span className="text-[10px] font-medium text-muted-foreground">
                {action.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
