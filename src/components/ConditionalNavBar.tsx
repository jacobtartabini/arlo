import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

// Show navbar on main app routes
const visibleRoutes = ["/", "/dashboard", "/chat", "/calendar", "/settings"];

export default function ConditionalNavBar() {
  const location = useLocation();
  const shouldShowNav = visibleRoutes.includes(location.pathname);

  if (!shouldShowNav) {
    return null;
  }

  return <NavBar />;
}
