import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, MessageCircle, Calendar as CalendarIcon, Settings as SettingsIcon, LucideIcon } from "lucide-react";
import { ExpandableTabs, TabItem } from "@/components/ui/expandable-tabs";

interface NavTabWithPath {
  title: string;
  icon: LucideIcon;
  path: string;
}

interface NavSeparator {
  type: "separator";
}

type NavTab = NavTabWithPath | NavSeparator;

function isNavSeparator(item: NavTab): item is NavSeparator {
  return "type" in item && item.type === "separator";
}

const navTabs: NavTab[] = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Chat", icon: MessageCircle, path: "/chat" },
  { title: "Calendar", icon: CalendarIcon, path: "/calendar" },
  { type: "separator" },
  { title: "Settings", icon: SettingsIcon, path: "/settings" },
];

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Find active index based on current path
  const activeIndex = React.useMemo(() => {
    for (let i = 0; i < navTabs.length; i++) {
      const tab = navTabs[i];
      if (isNavSeparator(tab)) continue;
      if (tab.path === location.pathname || 
          (location.pathname === "/" && tab.path === "/dashboard")) {
        return i;
      }
    }
    return null;
  }, [location.pathname]);

  const handleTabChange = (index: number | null) => {
    if (index === null) return;
    const tab = navTabs[index];
    if (tab && !isNavSeparator(tab)) {
      navigate(tab.path);
    }
  };

  const expandableTabs: TabItem[] = navTabs.map(tab => 
    isNavSeparator(tab) 
      ? { type: "separator" as const }
      : { title: tab.title, icon: tab.icon }
  );

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-40">
      <ExpandableTabs
        tabs={expandableTabs}
        activeIndex={activeIndex}
        onChange={handleTabChange}
        activeColor="text-primary"
      />
    </nav>
  );
}
