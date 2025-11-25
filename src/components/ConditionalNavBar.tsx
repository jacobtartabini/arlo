import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

const hiddenRoutes = ["/login", "/unauthorized"];

export default function ConditionalNavBar() {
  const location = useLocation();
  const shouldHideNav = hiddenRoutes.includes(location.pathname);

  if (shouldHideNav) {
    return null;
  }

  return <NavBar />;
}