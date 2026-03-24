import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { completeAuthFromCallback, getPostAuthReturnPath, redirectToAegisAuth } from '@/lib/arloAuth';

export default function AuthCallback() {
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const token = params.get('token');
    const returnTo = params.get('return_to');

    const success = completeAuthFromCallback(token);

    if (!success) {
      redirectToAegisAuth(returnTo ?? '/');
      return;
    }

    const destination = getPostAuthReturnPath(returnTo);
    navigate(destination, { replace: true });
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-background/90">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-primary/30 mb-4 mx-auto">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
        <p className="text-muted-foreground">Completing sign-in…</p>
      </div>
    </div>
  );
}
