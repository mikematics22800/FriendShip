import { onAuthStateChanged, type User } from 'firebase/auth';
import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { getFirebaseAuth } from '@/lib/firebase.web';
import { signOutOfGoogle } from '@/lib/google-auth.web';

type Session = {
  user: User | null;
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

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), nextUser => {
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
