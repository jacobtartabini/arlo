import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Mail, StickyNote, CheckCircle2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  icon: typeof Home;
  route: string;
  label: string;
}

const TABS: TabItem[] = [
  { id: "home", icon: Home, route: "/", label: "Home" },
  { id: "inbox", icon: Mail, route: "/inbox", label: "Inbox" },
  { id: "notes", icon: StickyNote, route: "/Notes", label: "Notes" },
  { id: "tasks", icon: CheckCircle2, route: "/productivity", label: "Tasks" },
  { id: "more", icon: Menu, route: "/settings", label: "More" },
];

export function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "home";
    if (path.startsWith("/inbox")) return "inbox";
    if (path.startsWith("/notes")) return "notes";
    if (path.startsWith("/productivity") || path.startsWith("/habits")) return "tasks";
    return "more";
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe-bottom">
      {/* Gradient fade for content behind */}
      <div className="absolute inset-x-0 -top-8 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      {/* Floating pill container */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
        className="mx-4 mb-2"
      >
        <div
          className={cn(
            "flex items-center justify-around px-2 py-1.5",
            "rounded-2xl",
            "bg-card/95 backdrop-blur-xl",
            "border border-border/40",
            "shadow-xl shadow-foreground/5"
          )}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <motion.button
                key={tab.id}
                onClick={() => navigate(tab.route)}
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5",
                  "w-14 h-14 rounded-xl",
                  "transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground"
                )}
              >
                {/* Active background glow */}
                {isActive && (
                  <motion.div
                    layoutId="tab-glow"
                    className="absolute inset-1 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                
                <Icon 
                  className={cn(
                    "h-5 w-5 relative z-10 transition-transform duration-200",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.75}
                />
                
                <span className={cn(
                  "text-[10px] font-medium relative z-10 transition-all duration-200",
                  isActive ? "opacity-100" : "opacity-70"
                )}>
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </nav>
  );
}
