export interface ArloIdentity {
  user?: string;
  node?: string;
  tailnet?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  identity: ArloIdentity | null;
}

export interface AuthContextType extends AuthState {
  verifyAuth: () => Promise<boolean>;
  logout: () => void;
}
