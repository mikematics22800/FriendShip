import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { describeGoogleSignInError } from '@/lib/google-auth';
import {
  fetchGoogleBirthday,
  formatBirthday,
  hasBirthdayScope,
  requestBirthdayAccess,
  type GoogleBirthday,
} from '@/lib/google-profile';
import { useSession } from '@/lib/session';

const LIME = '#b4f500';
const NAVY = '#1a1530';
const NAVY_DEEP = '#120e24';
const INK = '#e8e6ee';
const MUTED = '#9b97ad';

type BirthdayState =
  | { status: 'needsConsent' }
  | { status: 'loading' }
  | { status: 'ready'; value: GoogleBirthday }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export default function Profile() {
  const { user, signOut } = useSession();
  const [birthday, setBirthday] = useState<BirthdayState>({ status: 'loading' });

  const loadBirthday = useCallback(async () => {
    setBirthday({ status: 'loading' });
    try {
      const value = await fetchGoogleBirthday();
      setBirthday(value ? { status: 'ready', value } : { status: 'unavailable' });
    } catch (cause) {
      setBirthday({ status: 'error', message: describeBirthdayError(cause) });
    }
  }, []);

  useEffect(() => {
    // Only read silently when consent already exists, so landing here never
    // triggers an unprompted Google consent sheet.
    try {
      if (hasBirthdayScope()) {
        loadBirthday();
      } else {
        setBirthday({ status: 'needsConsent' });
      }
    } catch (cause) {
      setBirthday({ status: 'error', message: describeBirthdayError(cause) });
    }
  }, [loadBirthday]);

  async function handleGrantBirthday() {
    setBirthday({ status: 'loading' });
    try {
      if (await requestBirthdayAccess()) {
        await loadBirthday();
      } else {
        setBirthday({ status: 'needsConsent' });
      }
    } catch (cause) {
      setBirthday({ status: 'error', message: describeBirthdayError(cause) });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.profile}>
            <Avatar photoURL={user?.photoURL} name={user?.displayName} />
            <Text style={styles.name}>{user?.displayName ?? 'Unnamed account'}</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <BirthdayValue state={birthday} onGrant={handleGrantBirthday} onRetry={loadBirthday} />
          </View>

          <Pressable onPress={signOut} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Avatar({ photoURL, name }: { photoURL?: string | null; name?: string | null }) {
  if (photoURL) {
    return <Image source={photoURL} style={styles.avatar} contentFit="cover" transition={150} />;
  }

  const initials = (name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarInitials}>{initials || '?'}</Text>
    </View>
  );
}

function BirthdayValue({
  state,
  onGrant,
  onRetry,
}: {
  state: BirthdayState;
  onGrant: () => void;
  onRetry: () => void;
}) {
  switch (state.status) {
    case 'loading':
      return <ActivityIndicator color={LIME} style={styles.fieldLoading} />;

    case 'ready':
      return <Text style={styles.value}>{formatBirthday(state.value)}</Text>;

    case 'needsConsent':
      return (
        <>
          <Text style={styles.hint}>Google asks for this separately from sign-in.</Text>
          <Pressable onPress={onGrant} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Share my birthday</Text>
          </Pressable>
        </>
      );

    case 'unavailable':
      return (
        <Text style={styles.hint}>
          No birthday on this Google account, or it is not shared with apps.
        </Text>
      );

    case 'error':
      return (
        <>
          <Text style={styles.error}>{state.message}</Text>
          <Pressable onPress={onRetry} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        </>
      );
  }
}

function describeBirthdayError(cause: unknown): string {
  return describeGoogleSignInError(cause) ?? 'Could not read your birthday from Google.';
}

const limeGlow = Platform.select({
  ios: {
    shadowColor: LIME,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
  },
  android: {
    shadowColor: LIME,
    elevation: 16,
  },
  default: {
    boxShadow: '0 0 16px 3px #b4f500, 0 0 48px 10px rgba(180, 245, 0, 0.55)',
  },
});

const limeTextGlow = Platform.select({
  ios: {
    textShadowColor: LIME,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  android: {
    textShadowColor: LIME,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  default: {
    textShadow: `0 0 16px ${LIME}`,
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: NAVY_DEEP,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NAVY_DEEP,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: NAVY,
    borderRadius: 25,
    padding: 32,
    gap: 28,
    ...limeGlow,
  },
  profile: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: NAVY_DEEP,
    borderWidth: 2,
    borderColor: LIME,
    marginBottom: 8,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '600',
    color: LIME,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: LIME,
    textAlign: 'center',
    ...limeTextGlow,
  },
  email: {
    fontSize: 15,
    color: INK,
    textAlign: 'center',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: LIME,
  },
  fieldLoading: {
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 17,
    color: INK,
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    color: MUTED,
  },
  secondary: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: LIME,
  },
  error: {
    fontSize: 15,
    color: '#ff6b6b',
  },
  signOut: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIME,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  pressed: {
    opacity: 0.75,
  },
});
