import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { describeGoogleSignInError } from '@/lib/google-auth';
import {
    fetchGoogleBirthday,
    formatBirthday,
    hasBirthdayScope,
    requestBirthdayAccess,
    type GoogleBirthday,
} from '@/lib/google-profile';
import { useSession } from '@/lib/session';

type BirthdayState =
  | { status: 'needsConsent' }
  | { status: 'loading' }
  | { status: 'ready'; value: GoogleBirthday }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

export default function DashboardScreen() {
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
    <View style={styles.container}>
      <View style={styles.profile}>
        <Avatar photoURL={user?.photoURL} name={user?.displayName} />
        <Text style={styles.name}>{user?.displayName ?? 'Unnamed account'}</Text>
        {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Date of birth</Text>
        <BirthdayValue state={birthday} onGrant={handleGrantBirthday} onRetry={loadBirthday} />
      </View>

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
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
      return <ActivityIndicator style={styles.fieldLoading} />;

    case 'ready':
      return <Text style={styles.value}>{formatBirthday(state.value)}</Text>;

    case 'needsConsent':
      return (
        <>
          <Text style={styles.hint}>Google asks for this separately from sign-in.</Text>
          <Pressable onPress={onGrant} style={styles.secondary}>
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
          <Pressable onPress={onRetry} style={styles.secondary}>
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        </>
      );
  }
}

function describeBirthdayError(cause: unknown): string {
  return describeGoogleSignInError(cause) ?? 'Could not read your birthday from Google.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    gap: 32,
  },
  profile: {
    alignItems: 'center',
    gap: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0f0f3',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '600',
    color: '#60646c',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  email: {
    fontSize: 15,
    color: '#60646c',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#60646c',
  },
  fieldLoading: {
    alignSelf: 'flex-start',
  },
  value: {
    fontSize: 17,
    color: '#000000',
  },
  hint: {
    fontSize: 15,
    lineHeight: 21,
    color: '#60646c',
  },
  secondary: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#208aef',
  },
  error: {
    fontSize: 15,
    color: '#c62828',
  },
  signOut: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#208aef',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
