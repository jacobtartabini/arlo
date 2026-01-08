import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTabBar } from "./MobileTabBar";

export function MobileNavWrapper() {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return <MobileTabBar />;
}
