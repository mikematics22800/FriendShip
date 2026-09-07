import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  configureGoogleSignIn,
  describeGoogleSignInError,
  signInWithGoogle,
  signInWithGoogleIdToken,
  type GoogleUserCredential,
} from '@/lib/google-auth';

export type UseGoogleAuthOptions = {
  onSuccess?: (credential: GoogleUserCredential) => void;
};

/** Tracks the Firebase exchange after the shared Google button is pressed. */
export function useGoogleAuth({ onSuccess }: UseGoogleAuthOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    try {
      configureGoogleSignIn();
    } catch (cause) {
      setError(describeGoogleSignInError(cause));
    }
  }, []);

  const signIn = useCallback(
    async (idToken?: string) => {
      setBusy(true);
      setError(null);
      try {
        const credential =
          Platform.OS === 'web' && idToken
            ? await signInWithGoogleIdToken(idToken)
            : await signInWithGoogle();
        onSuccess?.(credential);
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
