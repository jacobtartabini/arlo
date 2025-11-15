import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { AuthContextType, AuthState } from "@/types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Backends to verify identity against
const VERIFY_ENDPOINTS = [
  "https://raspberrypi.tailf531bd.ts.net/auth/verify",
  "https://jacobs-macbook-pro.tailf531bd.ts.net/api/verify",
];

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    tailscaleVerified: false,
    isLoading: true,
    error: null,
  });

  // ------------------------------------------------------------
  // Helper: call all verification endpoints until one succeeds
  // ------------------------------------------------------------
  const checkTailscaleBackend = useCallback(async () => {
    let lastError: unknown = null;

    for (const url of VERIFY_ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (res.ok) {
          const data = (await res.json()) as Partial<
            Record<"status" | "message", string>
          >;

          // Many endpoints return different shapes, normalize them
          const status = data.status;
          const msg = data.message;

          const authorized =
            status === "authorized" ||
            msg === "Tailscale access verified" ||
            msg === "Tailscale access verified ✅";

          if (authorized) {
            return { ok: true, data };
          }

          lastError = new Error(`Access denied via ${url}`);
        } else {
          lastError = new Error(`Access denied via ${url}`);
        }
      } catch (err: unknown) {
        lastError = err;
      }
    }

    return { ok: false, error: lastError };
  }, []);

  // ------------------------------------------------------------
  // On mount → ask backend if we're authorized
  // ------------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      const result = await checkTailscaleBackend();

      if (!result.ok) {
        setAuthState({
          tailscaleVerified: false,
          isLoading: false,
          error:
            result.error instanceof Error
              ? result.error.message
              : "Failed to verify Tailscale access",
        });
      } else {
        setAuthState({
          tailscaleVerified: true,
          isLoading: false,
          error: null,
        });
      }
    };

    init();
  }, [checkTailscaleBackend]);

  // ------------------------------------------------------------
  // Manual re-check (e.g., retry button in AccessDenied UI)
  // ------------------------------------------------------------
  const verifyTailscaleAccess = useCallback(async () => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

    const result = await checkTailscaleBackend();

    if (!result.ok) {
      setAuthState((prev) => ({
        ...prev,
        tailscaleVerified: false,
        isLoading: false,
        error:
          result.error instanceof Error
            ? result.error.message
            : "Failed to verify Tailscale access",
      }));
      throw result.error || new Error("Verification failed");
    }

    setAuthState((prev) => ({
      ...prev,
      tailscaleVerified: true,
      isLoading: false,
      error: null,
    }));
  }, [checkTailscaleBackend]);

  // ------------------------------------------------------------
  // Optional helper to override state inside app logic
  // ------------------------------------------------------------
  const setTailscaleVerified = useCallback((verified: boolean) => {
    // Local state only — backend remains source of truth
    setAuthState((prev) => ({ ...prev, tailscaleVerified: verified }));
  }, []);

  const contextValue: AuthContextType = {
    ...authState,
    verifyTailscaleAccess,
    setTailscaleVerified,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ------------------------------------------------------------
// Hook
// ------------------------------------------------------------
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return ctx;
};
