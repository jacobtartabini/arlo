import { useIsMobile } from "@/hooks/use-mobile";
import { useIsDesktop } from "@/hooks/use-desktop";
import { MobileTabBar } from "./MobileTabBar";

export function MobileNavWrapper() {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  // Hide mobile tab bar on desktop (Mac Catalyst, Electron, desktop web)
  if (!isMobile || isDesktop) return null;

  return <MobileTabBar />;
}
