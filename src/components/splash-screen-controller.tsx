import { SplashScreen } from 'expo-router';

import { useAuthContext } from '@/hooks/use-auth-context';

SplashScreen.preventAutoHideAsync();

/** Holds the splash screen until we know whether the user is already signed in. */
export function SplashScreenController() {
  const { isLoading } = useAuthContext();

  if (!isLoading) {
    SplashScreen.hideAsync();
  }

  return null;
}
