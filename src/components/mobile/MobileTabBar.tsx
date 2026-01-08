import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Mail, StickyNote, CheckCircle2, Menu } from "lucide-react";
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
  { id: "notes", label: "Notes", icon: StickyNote, route: "/notes" },
  { id: "tasks", label: "Tasks", icon: CheckCircle2, route: "/productivity" },
  { id: "more", label: "More", icon: Menu, route: "/settings" },
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
    <nav className="fixed bottom-0 inset-x-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-2xl border-t border-white/[0.08]" />
      
      <div className="relative flex items-stretch justify-around px-2 pb-safe-bottom pt-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.route)}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-2 min-w-0",
                "transition-all duration-200 active:scale-95"
              )}
            >
              {/* Active background pill */}
              {isActive && (
                <motion.div
                  layoutId="mobile-tab-bg"
                  className="absolute inset-x-2 top-1 bottom-1 bg-primary/10 rounded-xl"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              
              <Icon 
                className={cn(
                  "relative h-[22px] w-[22px] transition-colors duration-200",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground/60"
                )} 
                strokeWidth={isActive ? 2.25 : 1.75}
              />
              
              <span className={cn(
                "relative text-[10px] mt-1 transition-colors duration-200",
                isActive 
                  ? "text-primary font-semibold" 
                  : "text-muted-foreground/60 font-medium"
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
