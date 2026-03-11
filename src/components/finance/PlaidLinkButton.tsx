import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Loader2, Link2, AlertCircle } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";

type PlaidLinkButtonProps = {
  onSuccess?: () => void;
};

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const { createLinkToken, exchangePublicToken } = useFinancePersistence();

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        setTokenError(false);
        const response = await createLinkToken();
        if (response?.link_token) {
          setLinkToken(response.link_token);
        } else {
          console.error("Failed to create link token: no token in response", response);
          setTokenError(true);
        }
      } catch (error) {
        console.error("Failed to create link token:", error);
        setTokenError(true);
      }
    };
    fetchLinkToken();
  }, [createLinkToken]);

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true);
      try {
        const result = await exchangePublicToken(publicToken, metadata as unknown as Record<string, unknown>);
        
        // Only show success if the backend confirmed with item_id
        if (result?.item_id || result?.success) {
          toast.success(`Account connected! ${result.accounts_stored ? `${result.accounts_stored} account(s) linked.` : ''}`);
          onSuccess?.();
        } else {
          console.error("Exchange returned unexpected result:", result);
          toast.error("Connection may have failed. Please check your accounts.");
        }
      } catch (error) {
        console.error("Failed to exchange token:", error);
        toast.error(error instanceof Error ? error.message : "Failed to connect account");
      } finally {
        setLoading(false);
      }
    },
    [exchangePublicToken, onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  });

  if (tokenError) {
    return (
      <Button
        variant="outline"
        disabled
        className="gap-2 text-destructive"
      >
        <AlertCircle className="w-4 h-4" />
        Connection unavailable
      </Button>
    );
  }

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Link2 className="w-4 h-4" />
      )}
      Connect Bank Account
    </Button>
  );
}
