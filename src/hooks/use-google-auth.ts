import type { UserCredential } from '@react-native-firebase/auth';
import { useCallback, useEffect, useState } from 'react';

import {
  configureGoogleSignIn,
  describeGoogleSignInError,
  signInWithGoogle,
} from '@/lib/google-auth';

export type UseGoogleAuthOptions = {
  onSuccess?: (credential: UserCredential) => void;
};

/** Tracks the Firebase exchange after the shared Google button is pressed. */
export function useGoogleAuth({ onSuccess }: UseGoogleAuthOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      configureGoogleSignIn();
    } catch (cause) {
      setError(describeGoogleSignInError(cause));
    }
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      onSuccess?.(await signInWithGoogle());
    } catch (cause) {
      setError(describeGoogleSignInError(cause));
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  return { busy, error, signIn };
}
