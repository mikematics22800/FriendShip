import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { consumeInitialAuthUrl, createSessionFromUrl, signOutOfFacebook } from '@/lib/facebook-auth';
import { clearCachedMetaProfile } from '@/lib/facebook-profile';
import { supabase } from '@/lib/supabase';

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providers: string[];
};

type Session = {
  user: SessionUser | null;
  /** True until Supabase has restored any persisted session on cold start. */
  initializing: boolean;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }

  return value;
}

function toSessionUser(user: User | null): SessionUser | null {
  if (!user) return null;

  const meta = user.user_metadata ?? {};
  const app = user.app_metadata ?? {};
  const providers = Array.isArray(app.providers)
    ? app.providers.filter((provider): provider is string => typeof provider === 'string')
    : typeof app.provider === 'string'
      ? [app.provider]
      : [];

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: stringMeta(meta.full_name) ?? stringMeta(meta.name),
    photoURL: stringMeta(meta.avatar_url) ?? stringMeta(meta.picture),
    providers,
  };
}

function stringMeta(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

async function signOutSession() {
  clearCachedMetaProfile();
  await signOutOfFacebook();
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUser(toSessionUser(data.session?.user ?? null));
      setInitializing(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearCachedMetaProfile();
      }
      setUser(toSessionUser(session?.user ?? null));
      setInitializing(false);
    });

    void consumeInitialAuthUrl().catch(() => {
      // Ignore non-auth launch URLs.
    });

    const linking = Linking.addEventListener('url', ({ url }) => {
      void createSessionFromUrl(url).catch(() => {
        // Ignore non-auth deep links.
      });
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
      linking.remove();
    };
  }, []);

  const value = useMemo<Session>(
    () => ({ user, initializing, signOut: signOutSession }),
    [user, initializing],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
