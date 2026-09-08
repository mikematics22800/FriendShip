import { Redirect } from 'expo-router';

import { useAuthContext } from '@/hooks/use-auth-context';

/** Sends every visitor to login or the app once the session is known. */
export default function Index() {
  const { isLoggedIn, isLoading } = useAuthContext();

  if (isLoading) {
    return null;
  }

  return <Redirect href={isLoggedIn ? '/profile' : '/login'} />;
}
