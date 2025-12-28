import React from "react";
import PublicBookingPage from "@/pages/PublicBooking";
import ProtectedRoute from "./ProtectedRoute";
import Dashboard from "@/pages/Dashboard";

// Domains that should show the public booking page instead of requiring auth
const PUBLIC_BOOKING_DOMAINS = [
  "meet.jacobtartabini.com",
];

interface DomainAwareRouteProps {
  children: React.ReactNode;
}

const DomainAwareRoute: React.FC<DomainAwareRouteProps> = ({ children }) => {
  const currentHost = window.location.hostname;
  
  // If we're on a public booking domain, show the booking page
  if (PUBLIC_BOOKING_DOMAINS.includes(currentHost)) {
    return <PublicBookingPage />;
  }
  
  // Otherwise, show the protected route with the original children
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default DomainAwareRoute;
