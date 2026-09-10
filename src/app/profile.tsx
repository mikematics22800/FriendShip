import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FacebookSignInButton } from '@/components/FacebookButton';
import { GoogleSignInButton } from '@/components/GoogleButton';
import { useAuthContext } from '@/hooks/use-auth-context';
import type { LinkableProvider } from '@/lib/supabase';

const LIME = '#b4f500';
const NAVY = '#1a1530';
const NAVY_DEEP = '#120e24';
const INK = '#e8e6ee';

function formatDateOfBirth(value?: string | null) {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Profile() {
  const { claims, profile, signOut, linkedProviders, linkAccount, featureAlert, setFeatureAlert } =
    useAuthContext();
  const [busy, setBusy] = useState(false);
  const uid = typeof claims?.sub === 'string' ? claims.sub : undefined;
  const name = profile?.name ?? null;
  const photoURL = profile?.pictureUrl ?? null;
  const email = profile?.email ?? null;
  const dateOfBirth = formatDateOfBirth(profile?.dateOfBirth);
  const showGoogleLink = linkedProviders.facebook && !linkedProviders.google;
  const showFacebookLink = linkedProviders.google && !linkedProviders.facebook;

  useEffect(() => {
    if (!featureAlert) return;
    Alert.alert(featureAlert);
    setFeatureAlert(null);
  }, [featureAlert, setFeatureAlert]);

  const handleLink = useCallback(
    async (provider: LinkableProvider) => {
      setBusy(true);
      try {
        await linkAccount(provider);
      } catch (cause) {
        Alert.alert(cause instanceof Error ? cause.message : 'Could not link this account.');
      } finally {
        setBusy(false);
      }
    },
    [linkAccount],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.profile}>
            <Avatar uid={uid} photoURL={photoURL} name={name} />
            <Text style={styles.name}>{name ?? 'Unnamed account'}</Text>
            {email ? <Text style={styles.email}>{email}</Text> : null}
            {dateOfBirth ? <Text style={styles.dob}>{dateOfBirth}</Text> : null}
          </View>

          {showGoogleLink ? (
            <GoogleSignInButton
              busy={busy}
              label="Link with Google"
              onPress={() => {
                void handleLink('google');
              }}
            />
          ) : null}

          {showFacebookLink ? (
            <FacebookSignInButton
              busy={busy}
              label="Link with Facebook"
              onPress={() => {
                void handleLink('facebook');
              }}
            />
          ) : null}

          <Pressable
            onPress={() => {
              void signOut();
            }}
            style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function Avatar({
  uid,
  photoURL,
  name,
}: {
  uid?: string;
  photoURL?: string | null;
  name?: string | null;
}) {
  if (photoURL) {
    return (
      <Image
        key={uid ?? photoURL}
        recyclingKey={uid ?? photoURL}
        source={photoURL}
        style={styles.avatar}
        contentFit="cover"
        transition={150}
      />
    );
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
  dob: {
    fontSize: 15,
    color: INK,
    textAlign: 'center',
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
