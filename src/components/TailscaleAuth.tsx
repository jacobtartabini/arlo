import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { redirectToAegisAuth } from '@/lib/arloAuth';

/**
 * Backward-compatible login route.
 * We keep `/login` but it now immediately defers to Aegis.
 */
const TailscaleAuth: React.FC = () => {
  useEffect(() => {
    const returnTo = new URLSearchParams(window.location.search).get('return_to') || '/';
    redirectToAegisAuth(returnTo);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/30 mb-4 mx-auto">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="text-muted-foreground">Redirecting to secure sign-in…</p>
      </div>
    </div>
  );
};

export default TailscaleAuth;
