import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

import { signOutOfGoogle } from '@/lib/google-auth';

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

type Session = {
  user: SessionUser | null;
  /** True until Firebase has restored any persisted session on cold start. */
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

function listenToAuth(onUser: (user: SessionUser | null) => void): () => void {
  if (Platform.OS === 'web') {
    const { onAuthStateChanged } = require('firebase/auth') as typeof import('firebase/auth');
    const { getFirebaseAuth } = require('@/lib/firebase') as typeof import('@/lib/firebase');
    return onAuthStateChanged(getFirebaseAuth(), onUser);
  }

  const { getAuth, onAuthStateChanged } = require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
  return onAuthStateChanged(getAuth(), onUser);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Firebase persists sessions, so the first callback also restores an
    // existing login rather than just reporting new ones.
    return listenToAuth(nextUser => {
      setUser(nextUser);
      setInitializing(false);
    });
  }, []);

  const value = useMemo<Session>(
    () => ({ user, initializing, signOut: signOutOfGoogle }),
    [user, initializing],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
