import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { AuthContext } from '@/hooks/use-auth-context';
import { signOut as signOutOfSupabase, subscribeToAuthRedirects, supabase } from '@/lib/supabase';

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>();
  const [profile, setProfile] = useState<any>();
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

  // Load the profile row alongside the claims. This must not gate the splash screen.
  useEffect(() => {
    if (claims === undefined) return;

    let cancelled = false;

    const readProfile = async () => {
      if (!claims) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', claims.sub).single();

      if (cancelled) return;

      if (error) {
        console.warn('Could not load profile row:', error.message);
        setProfile(null);
        return;
      }

      setProfile(data);
    };

    readProfile();

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
