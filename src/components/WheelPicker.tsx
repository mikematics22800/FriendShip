import Slider from '@expo/ui/community/slider';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const LIME = '#b4f500';
const LABEL_INK = '#e8e6ee';
const VALUE_INK = '#f4f2fa';
const MUTED_INK = '#8e8e93';
const HAIRLINE = '#2a2738';

export type WheelPickerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
};

/** Compact lime track with the live value beside the label. */
export function WheelPicker({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  disabled = false,
  onChange,
}: WheelPickerProps) {
  const snap = useCallback(
    (raw: number) => {
      const stepped = min + Math.round((raw - min) / step) * step;
      return Math.min(max, Math.max(min, stepped));
    },
    [min, max, step],
  );

  const display = snap(value);
  const readout = unit ? `${display} ${unit}` : `${display}`;

  const nudge = (direction: 1 | -1) => {
    const next = snap(display + direction * step);
    if (next !== display) onChange(next);
  };

  return (
    <View
      style={[styles.host, disabled && styles.disabled]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      accessibilityValue={{ min, max, now: display, text: readout }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => {
        if (disabled) return;
        if (event.nativeEvent.actionName === 'increment') nudge(1);
        if (event.nativeEvent.actionName === 'decrement') nudge(-1);
      }}
    >
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{readout}</Text>
      </View>

      <Slider
        value={display}
        minimumValue={min}
        maximumValue={max}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={LIME}
        maximumTrackTintColor={HAIRLINE}
        thumbTintColor={LIME}
        onValueChange={next => {
          const snapped = snap(next);
          if (snapped !== display) onChange(snapped);
        }}
        style={styles.track}
      />

      <View style={styles.range}>
        <Text style={styles.caption}>{min}</Text>
        <Text style={styles.caption}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    gap: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  header: {
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: LABEL_INK,
    textAlign: 'center',
  },
  value: {
    position: 'absolute',
    right: 0,
    top: 0,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: VALUE_INK,
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: '100%',
    height: 40,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    color: MUTED_INK,
    fontVariant: ['tabular-nums'],
  },
});
