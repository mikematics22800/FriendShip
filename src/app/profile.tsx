import { Image } from 'expo-image';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMetaProfile } from '@/hooks/use-meta-profile';
import { formatBirthday, type MetaBirthday } from '@/lib/facebook-profile';
import { useSession } from '@/lib/session';

const LIME = '#b4f500';
const NAVY = '#1a1530';
const NAVY_DEEP = '#120e24';
const INK = '#e8e6ee';
const MUTED = '#9b97ad';

export default function Profile() {
  const { user, signOut } = useSession();
  const meta = useMetaProfile();
  const name = meta.profile?.name ?? user?.displayName;
  const photoURL = meta.profile?.photoURL ?? user?.photoURL;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.profile}>
            <Avatar photoURL={photoURL} name={name} />
            <Text style={styles.name}>{name ?? 'Unnamed account'}</Text>
            {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of birth</Text>
            <BirthdayValue
              status={meta.status}
              birthday={meta.profile?.birthday ?? null}
              error={meta.status === 'error' ? meta.message : null}
              onRetry={meta.reload}
            />
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
  status,
  birthday,
  error,
  onRetry,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  birthday: MetaBirthday | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === 'loading' || status === 'idle') {
    return <ActivityIndicator color={LIME} style={styles.fieldLoading} />;
  }

  if (birthday) {
    return <Text style={styles.value}>{formatBirthday(birthday)}</Text>;
  }

  if (status === 'error') {
    return (
      <>
        <Text style={styles.error}>{error}</Text>
        <Pressable onPress={onRetry} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <Text style={styles.secondaryText}>Try again</Text>
        </Pressable>
      </>
    );
  }

  return (
    <Text style={styles.hint}>No birthday on this Facebook account, or it is not shared with apps.</Text>
  );
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
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
