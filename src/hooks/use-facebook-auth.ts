import { useCallback, useState } from 'react';

import {
  describeFacebookSignInError,
  signInWithFacebook,
  type FacebookUserCredential,
} from '@/lib/facebook-auth';

export type UseFacebookAuthOptions = {
  onSuccess?: (credential: FacebookUserCredential) => void;
};

/** Tracks the Supabase Facebook OAuth exchange after the button is pressed. */
export function useFacebookAuth({ onSuccess }: UseFacebookAuthOptions = {}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const credential = await signInWithFacebook();
      onSuccess?.(credential);
    } catch (cause) {
      setError(describeFacebookSignInError(cause));
    } finally {
      setBusy(false);
    }
  }, [onSuccess]);

  return { busy, error, signIn };
}
