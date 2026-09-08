import { createContext, use, useMemo, type PropsWithChildren } from 'react';

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providers: string[];
};

type Session = {
  user: SessionUser | null;
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
  const value = useMemo<Session>(
    () => ({
      user: null,
      initializing: false,
      signOut: async () => {},
    }),
    [],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
