import { createContext, useContext } from 'react';

import type { FacebookProfile } from '@/lib/facebook-profile';

export type AuthData = {
  claims?: Record<string, any> | null;
  profile?: FacebookProfile | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  profile: undefined,
  isLoading: true,
  isLoggedIn: false,
  signOut: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);
