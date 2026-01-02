import React, { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, verifyAuth } = useAuth();
  const [hasAttemptedVerify, setHasAttemptedVerify] = useState(false);

  // Attempt to verify auth on mount if not already authenticated
  useEffect(() => {
    if (!isAuthenticated && !isLoading && !hasAttemptedVerify) {
      setHasAttemptedVerify(true);
      verifyAuth();
    }
  }, [isAuthenticated, isLoading, hasAttemptedVerify, verifyAuth]);

  // Show loading spinner while checking authentication
  if (isLoading || (!isAuthenticated && !hasAttemptedVerify)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/30 mb-4 mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated after verification attempt
  if (!isAuthenticated && hasAttemptedVerify) {
    return <Navigate to="/login" replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
