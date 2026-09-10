import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const FACEBOOK_BLUE = '#1877F2';
const facebookMark = require('@/assets/images/fb-white.svg');

export type FacebookSignInButtonProps = {
  busy: boolean;
  onPress: () => void;
  label?: string;
};

/** Full-width Facebook control on the login card and profile link CTA. */
export function FacebookSignInButton({
  busy,
  onPress,
  label = 'Continue with Facebook',
}: FacebookSignInButtonProps) {
  return (
    <View style={styles.host}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [styles.button, busy && styles.disabled, pressed && !busy && styles.pressed]}
      >
        <Image
          accessible={false}
          contentFit="contain"
          source={facebookMark}
          style={styles.mark}
        />
        <Text style={styles.label}>{label}</Text>
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
    backgroundColor: FACEBOOK_BLUE,
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
    color: '#FFFFFF',
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
