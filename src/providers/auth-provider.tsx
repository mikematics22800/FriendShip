import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { AuthContext } from '@/hooks/use-auth-context';
import { fetchFacebookProfile, type FacebookProfile } from '@/lib/facebook-profile';
import { signOut as signOutOfSupabase, subscribeToAuthRedirects, supabase } from '@/lib/supabase';
import { ensureUserRow } from '@/lib/user';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>();
  const [profile, setProfile] = useState<FacebookProfile | null | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Read the claims once, then follow auth state changes and native OAuth redirects.
  useEffect(() => {
    const readClaims = async () => {
      const { data, error } = await supabase.auth.getClaims();

      if (error) {
        console.error('Error fetching claims:', error);
      }

      setClaims(data?.claims ?? null);
      setIsLoading(false);
    };

    readClaims();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const { data } = await supabase.auth.getClaims();
      setClaims(data?.claims ?? null);
      setIsLoading(false);
    });

    const unsubscribeFromRedirects = subscribeToAuthRedirects();

    return () => {
      subscription.unsubscribe();
      unsubscribeFromRedirects();
    };
  }, []);

  // After login: ensure a public.user row exists, then load Graph profile (never written to user).
  useEffect(() => {
    if (claims === undefined) return;

    let cancelled = false;

    const afterLogin = async () => {
      if (!claims?.sub) {
        setProfile(null);
        return;
      }

      await ensureUserRow(claims.sub);

      try {
        const facebookProfile = await fetchFacebookProfile();
        if (!cancelled) setProfile(facebookProfile);
      } catch (cause) {
        console.warn('Could not load Facebook profile:', cause);
        if (!cancelled) setProfile(null);
      }
    };

    afterLogin();

    return () => {
      cancelled = true;
    };
  }, [claims]);

  const signOut = useCallback(async () => {
    await signOutOfSupabase();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        claims,
        profile,
        isLoading,
        isLoggedIn: !!claims,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
