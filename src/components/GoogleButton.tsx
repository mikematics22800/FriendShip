import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const googleMark = require('@/assets/images/google-g.svg');

export type GoogleSignInButtonProps = {
  busy: boolean;
  onPress: () => void;
};

/** Full-width Continue with Google control on the login card. */
export function GoogleSignInButton({ busy, onPress }: GoogleSignInButtonProps) {
  return (
    <View style={styles.host}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [styles.button, busy && styles.disabled, pressed && !busy && styles.pressed]}
      >
        <Image accessible={false} contentFit="contain" source={googleMark} style={styles.mark} />
        <Text style={styles.label}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
  },
  button: {
    height: 44,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#747775',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  mark: {
    width: 22,
    height: 22,
  },
  label: {
    color: '#1F1F1F',
    fontSize: 15,
    fontWeight: 'bold',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
