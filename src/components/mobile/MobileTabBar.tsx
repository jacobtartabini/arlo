import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Mail, StickyNote, CheckCircle2, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  icon: typeof Home;
  route: string;
}

const TABS: TabItem[] = [
  { id: "home", icon: Home, route: "/" },
  { id: "inbox", icon: Mail, route: "/inbox" },
  { id: "notes", icon: StickyNote, route: "/notes" },
  { id: "tasks", icon: CheckCircle2, route: "/productivity" },
  { id: "more", icon: Menu, route: "/settings" },
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
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      {/* Floating pill container */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 30, delay: 0.1 }}
        className={cn(
          "flex items-center gap-1 px-2 py-2",
          "rounded-full",
          "bg-card/90 backdrop-blur-2xl",
          "border border-border/50",
          "shadow-lg shadow-black/10 dark:shadow-black/30"
        )}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.route)}
              className={cn(
                "relative flex items-center justify-center",
                "w-12 h-12 rounded-full",
                "transition-all duration-200 active:scale-90",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon 
                className="h-5 w-5" 
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              
              {/* Active dot indicator */}
              {isActive && (
                <motion.div
                  layoutId="tab-dot"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary-foreground"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </motion.div>
    </nav>
  );
}
