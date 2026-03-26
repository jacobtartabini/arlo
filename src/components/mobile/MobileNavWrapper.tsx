import { useIsMobile } from "@/hooks/use-mobile";
import { useIsDesktop } from "@/hooks/use-desktop";
import { MobileTabBar } from "./MobileTabBar";
import { useAuth } from "@/providers/AuthProvider";

export function MobileNavWrapper() {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const { isAuthenticated } = useAuth();

  // Hide mobile tab bar on desktop (Mac Catalyst, Electron, desktop web)
  if (!isMobile || isDesktop) return null;
  if (!isAuthenticated) return null;

  return <MobileTabBar />;
}
