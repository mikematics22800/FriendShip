import { useCallback, useEffect, useState } from 'react';

import {
  describeMetaProfileError,
  fetchMetaProfile,
  getCachedMetaProfile,
  type MetaProfile,
} from '@/lib/facebook-profile';
import { useSession } from '@/lib/session';

type MetaProfileState =
  | { status: 'idle'; profile: null }
  | { status: 'loading'; profile: MetaProfile | null }
  | { status: 'ready'; profile: MetaProfile }
  | { status: 'error'; profile: MetaProfile | null; message: string };

/** Loads name, photo, and birthday from Meta Graph after Facebook sign-in. */
export function useMetaProfile() {
  const { user } = useSession();
  const [state, setState] = useState<MetaProfileState>(() =>
    user
      ? { status: 'loading', profile: getCachedMetaProfile() }
      : { status: 'idle', profile: null },
  );

  const reload = useCallback(async () => {
    setState(current => ({ status: 'loading', profile: current.profile }));
    try {
      const profile = await fetchMetaProfile();
      setState({ status: 'ready', profile });
    } catch (cause) {
      setState({
        status: 'error',
        profile: getCachedMetaProfile(),
        message: describeMetaProfileError(cause),
      });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setState({ status: 'idle', profile: null });
      return;
    }

    void reload();
  }, [reload, user]);

  return { ...state, reload };
}
