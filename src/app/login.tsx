import { Image, ImageBackground } from 'expo-image';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleButton';
import { useGoogleAuth, type UseGoogleAuthOptions } from '@/hooks/use-google-auth';

const logo = require('@/assets/images/icon.png');
const space = require('@/assets/images/toon-space.jpg');

export type LoginProps = {
  onSignedIn?: UseGoogleAuthOptions['onSuccess'];
};

export default function Login({ onSignedIn }: LoginProps) {
  const { busy, error, signIn } = useGoogleAuth({
    onSuccess: onSignedIn,
  });

  return (
    <ImageBackground source={space} style={styles.screen} contentFit="cover">
      <View style={styles.card}>
        <Image source={logo} style={styles.logo} contentFit="contain" accessibilityLabel="FriendShip" />
        <View style={styles.header}>
          <Text style={styles.title}>FRIENDSHIP</Text>
          <Text style={styles.subtitle}>
            Zoom off and make plans with friends in your area safely and effortlessly.
          </Text>
        </View>
        <GoogleSignInButton busy={busy} onPress={signIn} />

        <View style={styles.status}>
          {busy ? <ActivityIndicator color="#e8e6ee" /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1240',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1a1530',
    borderRadius: 24,
    padding: 42,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#b4f500',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 28,
      },
      android: {
        shadowColor: '#b4f500',
        elevation: 16,
      },
      default: {
        boxShadow: '0 0 16px 3px #b4f500, 0 0 48px 10px rgba(180, 245, 0, 0.55)',
      },
    }),
  },
  logo: {
    width: 160,
    height: 160,
    alignSelf: 'center',
  },
  header: {
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#b4f500',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  status: {
    minHeight: 24,
    justifyContent: 'center',
    gap: 8,
  },
  error: {
    fontSize: 14,
    color: '#c62828',
    textAlign: 'center',
  },
});
