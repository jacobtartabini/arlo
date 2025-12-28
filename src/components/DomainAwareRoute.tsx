import React, { useEffect } from "react";
import PublicBookingPage from "@/pages/PublicBooking";
import ProtectedRoute from "./ProtectedRoute";
import { useTheme } from "@/providers/ThemeProvider";
import { isPublicBookingDomain } from "@/lib/domain-utils";

interface DomainAwareRouteProps {
  children: React.ReactNode;
}

const DomainAwareRoute: React.FC<DomainAwareRouteProps> = ({ children }) => {
  const { setTheme } = useTheme();
  const isPublicDomain = isPublicBookingDomain();
  
  // Force light mode on public booking domains
  useEffect(() => {
    if (isPublicDomain) {
      setTheme("light");
    }
  }, [isPublicDomain, setTheme]);
  
  // If we're on a public booking domain, show the booking page
  if (isPublicDomain) {
    return <PublicBookingPage />;
  }
  
  // Otherwise, show the protected route with the original children
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

export default DomainAwareRoute;
