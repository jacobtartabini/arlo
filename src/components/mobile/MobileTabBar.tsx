import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Mail, NotebookPen, CalendarCheck, MoreHorizontal, Map, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon: typeof Home;
  route: string;
}

const TABS: TabItem[] = [
  { id: "home", label: "Home", icon: Home, route: "/" },
  { id: "inbox", label: "Inbox", icon: Mail, route: "/inbox" },
  { id: "notes", label: "Notes", icon: NotebookPen, route: "/notes" },
  { id: "tasks", label: "Tasks", icon: CalendarCheck, route: "/productivity" },
  { id: "more", label: "More", icon: MoreHorizontal, route: "/settings" },
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
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-area-pb">
      {/* Blur background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/40" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.route)}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-full",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -top-0.5 w-8 h-1 bg-primary rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Icon 
                  className={cn(
                    "h-5 w-5 mb-0.5",
                    isActive && "drop-shadow-sm"
                  )} 
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </motion.div>
              
              <span className={cn(
                "text-[10px] font-medium tracking-tight",
                isActive && "font-semibold"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
