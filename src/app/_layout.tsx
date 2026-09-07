import { Link, SplashScreen, Stack, usePathname, useRouter, type Href } from 'expo-router';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Appbar,
  BottomNavigation,
  Button,
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
  Text,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

const IS_WEB = Platform.OS === 'web';

const TABS = [
  {
    href: '/calendar',
    label: 'Calendar',
    focusedIcon: 'calendar-month',
    unfocusedIcon: 'calendar-month-outline',
  },
  {
    href: '/chat',
    label: 'Chat',
    focusedIcon: 'chat',
    unfocusedIcon: 'chat-outline',
  },
  {
    href: '/events',
    label: 'Events',
    focusedIcon: 'ticket-confirmation',
    unfocusedIcon: 'ticket-confirmation-outline',
  },
  {
    href: '/friends',
    label: 'Friends',
    focusedIcon: 'account-group',
    unfocusedIcon: 'account-group-outline',
  },
  {
    href: '/invites',
    label: 'Invites',
    focusedIcon: 'email',
    unfocusedIcon: 'email-outline',
  },
  {
    href: '/profile',
    label: 'Profile',
    focusedIcon: 'account-circle',
    unfocusedIcon: 'account-circle-outline',
  },
  {
    href: '/settings',
    label: 'Settings',
    focusedIcon: 'cog',
    unfocusedIcon: 'cog-outline',
  },
] as const satisfies ReadonlyArray<{
  href: Href;
  label: string;
  focusedIcon: string;
  unfocusedIcon: string;
}>;

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1877F2',
    onPrimary: '#FFFFFF',
    primaryContainer: '#D6E4FF',
    onPrimaryContainer: '#001A41',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#8BB8FF',
    onPrimary: '#001A41',
    primaryContainer: '#0A3D8F',
    onPrimaryContainer: '#D6E4FF',
  },
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? darkTheme : lightTheme;

  return (
    <PaperProvider theme={theme}>
      <SessionProvider>
        <SplashScreenController />
        <RootNavigator />
      </SessionProvider>
    </PaperProvider>
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
  const { user, initializing } = useSession();
  const pathname = usePathname();
  const theme = useTheme();
  const showNav = !initializing && !!user && TABS.some(tab => isTabPath(pathname, tab.href));

  return (
    <View style={[styles.shell, { backgroundColor: theme.colors.background }]}>
      {showNav && IS_WEB ? <DesktopNavBar /> : null}
      <View style={styles.scene}>
        <Stack screenOptions={{ headerShown: false, animation: showNav ? 'none' : 'default' }}>
          <Stack.Screen name="index" />

          <Stack.Protected guard={!!user}>
            <Stack.Screen name="calendar" />
            <Stack.Screen name="chat" />
            <Stack.Screen name="events" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="invites" />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
          </Stack.Protected>

          <Stack.Protected guard={!user}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      </View>
      {showNav && !IS_WEB ? <MobileNavBar /> : null}
    </View>
  );
}

function DesktopNavBar() {
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Appbar.Header
      mode="small"
      elevated
      statusBarHeight={0}
      style={[styles.desktopBar, { borderBottomColor: theme.colors.outlineVariant }]}
    >
      <Text variant="titleLarge" style={[styles.brand, { color: "#b4f500" }]}>
        FriendShip
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.desktopLinks}
        style={styles.desktopScroll}
      >
        {TABS.map(tab => {
          const focused = isTabPath(pathname, tab.href);

          return (
            <Link key={tab.href} href={tab.href} replace asChild>
              <Button
                compact
                mode={focused ? 'contained-tonal' : 'text'}
                icon={focused ? tab.focusedIcon : tab.unfocusedIcon}
                textColor={focused ? "#b4f500" : theme.colors.onSurfaceVariant}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
              >
                {tab.label}
              </Button>
            </Link>
          );
        })}
      </ScrollView>
    </Appbar.Header>
  );
}

function MobileNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const index = Math.max(
    0,
    TABS.findIndex(tab => isTabPath(pathname, tab.href)),
  );

  return (
    <BottomNavigation.Bar
      compact
      shifting={false}
      labeled
      navigationState={{
        index,
        routes: TABS.map(tab => ({
          key: tab.href,
          title: tab.label,
          focusedIcon: tab.focusedIcon,
          unfocusedIcon: tab.unfocusedIcon,
        })),
      }}
      safeAreaInsets={insets}
      onTabPress={({ route }) => {
        router.replace(route.key as Href);
      }}
    />
  );
}

function isTabPath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  scene: {
    flex: 1,
  },
  desktopBar: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    fontWeight: '700',
    marginRight: 16,
  },
  desktopScroll: {
    flex: 1,
  },
  desktopLinks: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
});
