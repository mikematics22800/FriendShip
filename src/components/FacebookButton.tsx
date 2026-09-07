import { Pressable, StyleSheet, Text, View } from 'react-native';

const FACEBOOK_BLUE = '#1877F2';

export type FacebookSignInButtonProps = {
  busy: boolean;
  onPress: () => void;
};

/** Full-width Continue with Facebook control on the login card. */
export function FacebookSignInButton({ busy, onPress }: FacebookSignInButtonProps) {
  return (
    <View style={styles.host}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Facebook"
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={onPress}
        style={({ pressed }) => [styles.button, busy && styles.disabled, pressed && !busy && styles.pressed]}
      >
        <View style={styles.mark}>
          <Text style={styles.markText}>f</Text>
        </View>
        <Text style={styles.label}>Continue with Facebook</Text>
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
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    color: FACEBOOK_BLUE,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
