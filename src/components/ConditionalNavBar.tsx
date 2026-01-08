import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";
import { isPublicBookingDomain } from "@/lib/domain-utils";
import { useIsMobile } from "@/hooks/use-mobile";

// Show navbar on main app routes
const visibleRoutes = ["/", "/dashboard", "/chat", "/calendar", "/settings", "/maps"];

export default function ConditionalNavBar() {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // Never show navbar on public booking domains
  if (isPublicBookingDomain()) {
    return null;
  }

  // Hide desktop navbar on mobile - mobile uses bottom tab bar
  if (isMobile) {
    return null;
  }
  
  const shouldShowNav = visibleRoutes.includes(location.pathname);

  if (!shouldShowNav) {
    return null;
  }

  return <NavBar />;
}
