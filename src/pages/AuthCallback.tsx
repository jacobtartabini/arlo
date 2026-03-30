import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { clearAuthRedirectAttempts, completeAuthFromCallback, getPostAuthReturnPath, redirectToAegisAuth } from '@/lib/arloAuth';

function getTokenFromLocation(): { token: string | null; returnTo: string | null } {
  const searchParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  const token =
    searchParams.get('token') ??
    searchParams.get('jwt') ??
    searchParams.get('access_token') ??
    hashParams.get('token') ??
    hashParams.get('jwt') ??
    hashParams.get('access_token');

  const returnTo = searchParams.get('return_to') ?? hashParams.get('return_to');

  return { token, returnTo };
}

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const { token, returnTo } = getTokenFromLocation();

    const success = completeAuthFromCallback(token);

    if (!success) {
      // If Aegis didn't provide a token, don't keep accumulating failed attempts on the callback itself.
      // The actual redirect loop breaker lives in redirectToAegisAuth().
      redirectToAegisAuth(returnTo ?? '/');
      return;
    }

    const destination = getPostAuthReturnPath(returnTo);
    clearAuthRedirectAttempts();
    navigate(destination, { replace: true });
  }, [navigate]);

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
