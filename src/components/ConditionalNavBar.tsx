import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

// Only show navbar on dashboard routes
const dashboardRoutes = ["/", "/dashboard"];

export default function ConditionalNavBar() {
  const location = useLocation();
  const shouldShowNav = dashboardRoutes.includes(location.pathname);

  if (!shouldShowNav) {
    return null;
  }

  return <NavBar />;
}
