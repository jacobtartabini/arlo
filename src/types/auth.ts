export interface ArloIdentity {
  /** Primary identity derived from the JWT `sub` claim (email/tailnet string). */
  user?: string;
  node?: string;
  tailnet?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  identity: ArloIdentity | null;
  /** Canonical app identifier for user-scoped data (maps to DB `user_key`). */
  userKey: string | null;
}

export interface AuthContextType extends AuthState {
  verifyAuth: () => Promise<boolean>;
  logout: () => void;
}
