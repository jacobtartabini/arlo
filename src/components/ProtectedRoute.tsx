import React, { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, verifyAuth } = useAuth();
  const [hasAttemptedVerify, setHasAttemptedVerify] = useState(false);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90">
        <div className="text-center text-muted-foreground">Redirecting to secure sign-in…</div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
