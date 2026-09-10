import { createContext, useContext } from 'react';

import type { AuthProfile } from '@/lib/facebook-profile';
import type { LinkableProvider, LinkedProviders } from '@/lib/supabase';

export type AuthData = {
  claims?: Record<string, any> | null;
  profile?: AuthProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  linkedProviders: LinkedProviders;
  featureAlert: string | null;
  setFeatureAlert: (message: string | null) => void;
  linkAccount: (provider: LinkableProvider) => Promise<void>;
  signOut: () => Promise<void>;
};

const NO_PROVIDERS: LinkedProviders = { facebook: false, google: false };

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  linkedProviders: NO_PROVIDERS,
  featureAlert: null,
  setFeatureAlert: () => {},
  linkAccount: async () => {},
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);
