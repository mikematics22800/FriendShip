import { createElement, useState, type ChangeEvent } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatHour, snapTime, TIME_MAX, TIME_MIN } from '@/lib/user';

const LIME = '#b4f500';
const LABEL_INK = '#e8e6ee';
const VALUE_INK = '#f4f2fa';
const CHIP_SURFACE = '#2a2a2e';
const HAIRLINE = '#2a2738';

const DateTimePicker =
  Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

const TIME_INPUT_CLASS = 'fs-time-input';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  let style = document.getElementById('fs-time-input-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'fs-time-input-style';
    document.head.appendChild(style);
  }
  style.textContent = `
    .${TIME_INPUT_CLASS} {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      border: 0;
      opacity: 0;
      cursor: pointer;
      color-scheme: dark;
      accent-color: ${LIME};
    }
    .${TIME_INPUT_CLASS}::-webkit-calendar-picker-indicator {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      cursor: pointer;
    }
    .${TIME_INPUT_CLASS}::-webkit-datetime-edit {
      display: none;
    }
  `;
}

export type TimePickerProps = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  midnightAs: 0 | 24;
  disabled?: boolean;
  onChange: (value: number) => void;
};

function clampHour(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, snapTime(value)));
}

function dateFromHour(hour: number) {
  const snapped = snapTime(hour);
  if (snapped >= TIME_MAX) return new Date(2000, 0, 2, 0, 0, 0, 0);

  const totalMinutes = Math.round(snapped * 60);
  return new Date(2000, 0, 1, Math.floor(totalMinutes / 60), totalMinutes % 60, 0, 0);
}

function hourFromDate(date: Date, midnightAs: 0 | 24) {
  const snapped = snapTime(date.getHours() + date.getMinutes() / 60);
  if (snapped === 0 && midnightAs === 24) return TIME_MAX;
  return snapped;
}

function hourToInputValue(hour: number) {
  const snapped = snapTime(hour);
  if (snapped >= TIME_MAX) return '00:00';

  const totalMinutes = Math.round(snapped * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function hourFromInputValue(text: string, midnightAs: 0 | 24) {
  const [hours, minutes] = text.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return TIME_MIN;

  const value = hours + minutes / 60;
  const snapped = snapTime(value);
  if (snapped === 0 && midnightAs === 24) return TIME_MAX;
  return snapped;
}

function NativeTimeField({
  value,
  min,
  max,
  midnightAs,
  disabled,
  onChange,
}: Omit<TimePickerProps, 'label'>) {
  const [open, setOpen] = useState(false);
  const display = clampHour(value, min ?? TIME_MIN, max ?? TIME_MAX);
  const selected = dateFromHour(display);
  const minimumDate = dateFromHour(min ?? TIME_MIN);
  const maximumDate = dateFromHour(max ?? TIME_MAX);

  if (!DateTimePicker) return null;

  const commit = (date: Date) => {
    const next = clampHour(hourFromDate(date, midnightAs), min ?? TIME_MIN, max ?? TIME_MAX);
    if (next !== display) onChange(next);
  };

  const picker = (
    <DateTimePicker
      value={selected}
      mode="time"
      is24Hour={false}
      minuteInterval={15}
      display={Platform.OS === 'ios' ? 'compact' : 'default'}
      themeVariant="dark"
      accentColor={LIME}
      disabled={disabled}
      minimumDate={minimumDate.getTime() <= maximumDate.getTime() ? minimumDate : undefined}
      maximumDate={minimumDate.getTime() <= maximumDate.getTime() ? maximumDate : undefined}
      onValueChange={(_event: unknown, date: Date) => {
        commit(date);
        if (Platform.OS === 'android') setOpen(false);
      }}
      onDismiss={() => setOpen(false)}
    />
  );

  if (Platform.OS === 'ios') {
    return <View style={styles.nativeOverlay}>{picker}</View>;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change time"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={styles.nativeHit}
      />
      {open ? picker : null}
    </>
  );
}

/** System time field: HTML time input on web, DateTimePicker on iOS/Android. */
export function TimePicker({
  label,
  value,
  min = TIME_MIN,
  max = TIME_MAX,
  midnightAs,
  disabled = false,
  onChange,
}: TimePickerProps) {
  const display = clampHour(value, min, max);
  const readout = formatHour(display);

  return (
    <View style={[styles.host, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.timeRow}>
        <Text style={styles.clock}>🕒</Text>
        <Text style={styles.timeReadout}>{readout}</Text>
        {Platform.OS === 'web'
          ? createElement('input', {
              type: 'time',
              step: 900,
              value: hourToInputValue(display),
              disabled,
              className: TIME_INPUT_CLASS,
              'aria-label': label,
              onChange: (event: ChangeEvent<HTMLInputElement>) => {
                if (!event.target.value) return;
                const next = clampHour(hourFromInputValue(event.target.value, midnightAs), min, max);
                if (next !== display) onChange(next);
              },
            })
          : (
              <NativeTimeField
                value={display}
                min={min}
                max={max}
                midnightAs={midnightAs}
                disabled={disabled}
                onChange={onChange}
              />
            )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    gap: 4,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    color: LABEL_INK,
    textAlign: 'center',
  },
  timeRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: CHIP_SURFACE,
    cursor: 'pointer',
  },
  clock: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeReadout: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: VALUE_INK,
    fontVariant: ['tabular-nums'],
  },
  nativeOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.02,
  },
  nativeHit: {
    ...StyleSheet.absoluteFillObject,
  },
});
