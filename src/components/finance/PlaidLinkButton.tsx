import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from "react-plaid-link";
import { Button } from "@/components/ui/button";
import { Loader2, Link2 } from "lucide-react";
import { useFinancePersistence } from "@/hooks/useFinancePersistence";
import { toast } from "sonner";

type PlaidLinkButtonProps = {
  onSuccess?: () => void;
};

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { createLinkToken, exchangePublicToken } = useFinancePersistence();

  useEffect(() => {
    const fetchLinkToken = async () => {
      try {
        const response = await createLinkToken();
        if (response.link_token) {
          setLinkToken(response.link_token);
        }
      } catch (error) {
        console.error("Failed to create link token:", error);
      }
    };
    fetchLinkToken();
  }, [createLinkToken]);

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true);
      try {
        await exchangePublicToken(publicToken, metadata);
        toast.success("Account connected successfully!");
        onSuccess?.();
      } catch (error) {
        console.error("Failed to exchange token:", error);
        toast.error("Failed to connect account");
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
