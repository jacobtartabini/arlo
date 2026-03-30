import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { redirectToAegisAuth } from '@/lib/arloAuth';

export default function AuthError() {
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const reason = params.get('reason') ?? 'Authentication could not be completed.';
  const returnTo = params.get('return_to') ?? '/';

  const handleRetry = () => {
    redirectToAegisAuth(returnTo);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Sign-in failed</CardTitle>
            <CardDescription>
              Arlo couldn&apos;t complete authentication. This usually happens if the auth service didn&apos;t return a token
              or returned one the app couldn&apos;t validate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Reason</div>
                  <div className="text-sm text-muted-foreground break-words">{reason}</div>
                </div>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleRetry} className="w-full sm:w-auto">
                Retry sign-in
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={returnTo}>Go back</Link>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              If this keeps happening, ensure you&apos;re authenticated with the Aegis service and that your browser can reach it
              over Tailscale.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
