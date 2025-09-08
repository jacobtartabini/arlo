export interface AuthState {
  tailscaleVerified: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  verifyTailscaleAccess: () => Promise<void>;
  setTailscaleVerified: (verified: boolean) => void;
}
