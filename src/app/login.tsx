import { Image, ImageBackground } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';

import { GoogleSignInButton } from '@/components/GoogleButton';
import { useGoogleAuth, type UseGoogleAuthOptions } from '@/hooks/use-google-auth';

const logo = require('@/assets/images/icon.png');
const space = require('@/assets/images/toon-space.jpg');

const DOT_COLOR = '#b4f500';
const DOT_SIZE = 6;
const DOT_INSET = 18;
const DOT_SPACING = 28;

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
        <BorderDots />
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

type DotPosition = { x: number; y: number; delay: number; duration: number };

function layoutBorderDots(width: number, height: number): DotPosition[] {
  if (width < 48 || height < 48) return [];

  const left = DOT_INSET;
  const top = DOT_INSET;
  const right = width - DOT_INSET - DOT_SIZE;
  const bottom = height - DOT_INSET - DOT_SIZE;
  const innerW = right - left;
  const innerH = bottom - top;
  const cols = Math.max(2, Math.round(innerW / DOT_SPACING));
  const rows = Math.max(2, Math.round(innerH / DOT_SPACING));
  const positions: Omit<DotPosition, 'delay' | 'duration'>[] = [];

  for (let i = 0; i <= cols; i++) {
    positions.push({ x: left + (i / cols) * innerW, y: top });
  }
  for (let j = 1; j < rows; j++) {
    positions.push({ x: right, y: top + (j / rows) * innerH });
  }
  for (let i = cols; i >= 0; i--) {
    positions.push({ x: left + (i / cols) * innerW, y: bottom });
  }
  for (let j = rows - 1; j > 0; j--) {
    positions.push({ x: left, y: top + (j / rows) * innerH });
  }

  return positions.map((position, index) => ({
    ...position,
    delay: (index * 70) % 1400,
    duration: 520 + (index % 5) * 90,
  }));
}

function BorderDots() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const dots = useMemo(() => layoutBorderDots(size.width, size.height), [size]);

  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={styles.dots}
      onLayout={event => {
        const { width, height } = event.nativeEvent.layout;
        setSize(current => (current.width === width && current.height === height ? current : { width, height }));
      }}
    >
      {dots.map((dot, index) => (
        <BlinkDot key={index} {...dot} />
      ))}
    </View>
  );
}

function BlinkDot({ x, y, delay, duration }: DotPosition) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0.15,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    const start = Animated.sequence([Animated.delay(delay), blink]);
    start.start();
    return () => {
      start.stop();
      blink.stop();
    };
  }, [delay, duration, opacity]);

  return <Animated.View style={[styles.dot, { opacity, transform: [{ translateX: x }, { translateY: y }] }]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1240',
  },
  card: { 
    width: '100%',
    maxWidth: 500,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1530',
    borderRadius: 25,
    padding: 50,
    gap: 10,
    position: 'relative',
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
  dots: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  dot: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: DOT_COLOR,
    ...Platform.select({
      ios: {
        shadowColor: DOT_COLOR,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.95,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      default: {
        boxShadow: `0 0 6px 2px ${DOT_COLOR}`,
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
    textShadowColor: '#b4f500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
