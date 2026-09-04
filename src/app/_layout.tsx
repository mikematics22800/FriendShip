import { SplashScreen, Stack } from 'expo-router';

import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <SplashScreenController />
      <RootNavigator />
    </SessionProvider>
  );
}

/** Holds the splash screen until we know whether the user is already signed in. */
function SplashScreenController() {
  const { initializing } = useSession();

  if (!initializing) {
    SplashScreen.hide();
  }

  return null;
}

function RootNavigator() {
  const { user } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={!!user}>
        <Stack.Screen name="dashboard" />
      </Stack.Protected>

      <Stack.Protected guard={!user}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}
