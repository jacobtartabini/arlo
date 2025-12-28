import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";
import { isPublicBookingDomain } from "@/lib/domain-utils";

// Show navbar on main app routes
const visibleRoutes = ["/", "/dashboard", "/chat", "/calendar", "/settings"];

export default function ConditionalNavBar() {
  const location = useLocation();
  
  // Never show navbar on public booking domains
  if (isPublicBookingDomain()) {
    return null;
  }
  
  const shouldShowNav = visibleRoutes.includes(location.pathname);

  if (!shouldShowNav) {
    return null;
  }

  return <NavBar />;
}
