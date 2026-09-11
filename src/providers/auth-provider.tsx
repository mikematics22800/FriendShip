import type { Session } from '@supabase/supabase-js';
import { PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { AuthContext } from '@/hooks/use-auth-context';
import { loadSessionProfile, type AuthProfile } from '@/lib/facebook-profile';
import { requestUserLocation, type UserLocation } from '@/lib/location';
import {
  EmailMismatchError,
  finalizePendingIdentityLink,
  linkAccount as linkAccountWithSupabase,
  linkedProvidersFromUser,
  signOut as signOutOfSupabase,
  subscribeToAuthRedirects,
  supabase,
  type LinkableProvider,
  type LinkedProviders,
} from '@/lib/supabase';
import { ensureUserRow } from '@/lib/user';

const NO_PROVIDERS: LinkedProviders = { facebook: false, google: false };

function claimsFromSession(session: Session | null): Record<string, any> | null {
  if (!session?.user) return null;

  return {
    sub: session.user.id,
    email: session.user.email,
  };
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<Record<string, any> | undefined | null>();
  const [profile, setProfile] = useState<AuthProfile | null | undefined>();
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [linkedProviders, setLinkedProviders] = useState<LinkedProviders>(NO_PROVIDERS);
  const [featureAlert, setFeatureAlert] = useState<string | null>(null);
  const sessionReady = claims !== undefined;
  const uid = typeof claims?.sub === 'string' ? claims.sub : undefined;

  // Read the session once, then follow auth state changes and native OAuth redirects.
  useEffect(() => {
    let cancelled = false;

    const refreshLinkedProviders = async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setLinkedProviders(linkedProvidersFromUser(data.session?.user));
    };

    const applySession = (session: Session | null) => {
      if (cancelled) return;
      setClaims(claimsFromSession(session));
      setLinkedProviders(linkedProvidersFromUser(session?.user));
      setIsLoading(false);

      if (!session?.user) return;

      void finalizePendingIdentityLink(session.user)
        .then(() => refreshLinkedProviders())
        .catch(cause => {
          void refreshLinkedProviders();
          if (cause instanceof EmailMismatchError) setFeatureAlert(cause.message);
        });
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('Error fetching session:', error);
      }
      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const unsubscribeFromRedirects = subscribeToAuthRedirects();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      unsubscribeFromRedirects();
    };
  }, []);

  // After login: ensure a public.user row exists, load profile, then request location (kept in memory only).
  useEffect(() => {
    if (!sessionReady) return;

    let cancelled = false;

    if (!uid) {
      setProfile(null);
      setLocation(null);
      setLinkedProviders(NO_PROVIDERS);
      return;
    }

    setProfile(undefined);
    setLocation(null);

    const afterLogin = async () => {
      await ensureUserRow(uid);

      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (cancelled || !session || session.user.id !== uid) return;

        const next = await loadSessionProfile(session);
        if (!cancelled) {
          setProfile(next);
          setLinkedProviders(linkedProvidersFromUser(session.user));
        }
      } catch (cause) {
        console.warn('Could not load profile:', cause);
        if (!cancelled) setProfile(null);
      }

      if (cancelled) return;

      const coords = await requestUserLocation();
      if (!cancelled) setLocation(coords);
    };

    void afterLogin();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, uid]);

  const linkAccount = useCallback(async (provider: LinkableProvider) => {
    await linkAccountWithSupabase(provider);
    const { data } = await supabase.auth.getSession();
    setLinkedProviders(linkedProvidersFromUser(data.session?.user));
  }, []);

  const signOut = useCallback(async () => {
    setProfile(null);
    setLocation(null);
    setClaims(null);
    setLinkedProviders(NO_PROVIDERS);
    setFeatureAlert(null);
    await signOutOfSupabase();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        claims,
        profile,
        location,
        isLoading,
        isLoggedIn: !!claims,
        linkedProviders,
        featureAlert,
        setFeatureAlert,
        linkAccount,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
