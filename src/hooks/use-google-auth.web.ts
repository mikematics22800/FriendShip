import type { UserCredential } from 'firebase/auth';
import { useCallback, useState } from 'react';

import {
  describeGoogleSignInError,
  signInWithGoogle,
  signInWithGoogleIdToken,
} from '@/lib/google-auth.web';

export type UseGoogleAuthOptions = {
  onSuccess?: (credential: UserCredential) => void;
};

/** Web counterpart: the official GSI button exchanges an ID token with Firebase. */
export function useGoogleAuth({ onSuccess }: UseGoogleAuthOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(
    async (idToken?: string) => {
      setBusy(true);
      setError(null);
      try {
        onSuccess?.(idToken ? await signInWithGoogleIdToken(idToken) : await signInWithGoogle());
      } catch (cause) {
        setError(describeGoogleSignInError(cause));
      } finally {
        setBusy(false);
      }
    },
    [onSuccess],
  );

  return { busy, error, signIn };
}
