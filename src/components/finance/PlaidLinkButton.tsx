import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
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
  const { plaidRequest } = useFinancePersistence();

  useEffect(() => {
    const createLinkToken = async () => {
      try {
        const response = await plaidRequest("create_link_token", {});
        if (response.link_token) {
          setLinkToken(response.link_token);
        }
      } catch (error) {
        console.error("Failed to create link token:", error);
      }
    };
    createLinkToken();
  }, [plaidRequest]);

  const handleSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { name?: string; institution_id?: string } }) => {
      setLoading(true);
      try {
        await plaidRequest("exchange_public_token", {
          public_token: publicToken,
          institution_name: metadata.institution?.name || "Unknown",
          institution_id: metadata.institution?.institution_id,
        });
        toast.success("Account connected successfully!");
        onSuccess?.();
      } catch (error) {
        console.error("Failed to exchange token:", error);
        toast.error("Failed to connect account");
      } finally {
        setLoading(false);
      }
    },
    [plaidRequest, onSuccess]
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
