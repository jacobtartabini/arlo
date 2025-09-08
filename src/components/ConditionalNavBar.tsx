import React from "react";
import { useLocation } from "react-router-dom";
import NavBar from "./NavBar";

const unprotectedRoutes = ["/login", "/unauthorized"];

export default function ConditionalNavBar() {
  const location = useLocation();
  const isUnprotectedRoute = unprotectedRoutes.includes(location.pathname);

  if (isUnprotectedRoute) {
    return null;
  }

  return <NavBar />;
}