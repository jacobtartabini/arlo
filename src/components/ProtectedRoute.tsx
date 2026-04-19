import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { redirectToAegisAuth, shouldBypassAuthRedirect } from '@/lib/arloAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, verifyAuth } = useAuth();
  const [hasAttemptedVerify, setHasAttemptedVerify] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && !isLoading && !hasAttemptedVerify) {
      setHasAttemptedVerify(true);
      verifyAuth().catch((error) => {
        console.error('[ProtectedRoute] verifyAuth failed:', error);
      });
    }
  }, [isAuthenticated, isLoading, hasAttemptedVerify, verifyAuth]);

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

  if (!isAuthenticated) {
    // Single point of redirect — avoids double-counting with AuthProvider
    if (!shouldBypassAuthRedirect()) {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      redirectToAegisAuth(returnTo);
    }
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
