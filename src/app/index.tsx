import { Redirect } from 'expo-router';

import { useSession } from '@/lib/session';

/** Sends every visitor to login or dashboard once the session is known. */
export default function Index() {
  const { user, initializing } = useSession();

  if (initializing) {
    return null;
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
