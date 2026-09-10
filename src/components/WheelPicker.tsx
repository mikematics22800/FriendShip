import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

/** Dark rotor: near-black surface with very light figures, matching the favorite-places chips. */
const SURFACE = '#0a0910';
const LABEL_INK = '#e8e6ee';
const PICKER_INK = '#f4f2fa';
const PICKER_SECONDARY = '#8e8e93';
const SELECTION_FILL = 'rgba(244, 242, 250, 0.08)';
const HAIRLINE = '#2a2738';

const ITEM_HEIGHT = 40;
const VISIBLE_ROWS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PAD_ROWS = (VISIBLE_ROWS - 1) / 2;
/** Surface-coloured layers from the outer edge inward, approximating a gradient without a dependency. */
const SCRIM_OPACITIES = [0.9, 0.62, 0.26];
/** Scroll events stop before onMomentumScrollEnd fires on web, so we settle on a timer too. */
const SETTLE_MS = 140;

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

/** Dark rotor: a vertical list that snaps whole rows into a light selection band. */
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
  const [display, setDisplay] = useState(value);

  const scrollRef = useRef<ScrollView>(null);
  const interactingRef = useRef(false);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const offsetRef = useRef(0);
  const displayRef = useRef(value);

  displayRef.current = display;

  const rows = useMemo(() => {
    const list: number[] = [];
    for (let row = min; row <= max; row += step) list.push(row);
    return list;
  }, [min, max, step]);

  const offsetFor = useCallback(
    (candidate: number) => ((clamp(candidate, min, max) - min) / step) * ITEM_HEIGHT,
    [min, max, step],
  );

  const valueAt = useCallback(
    (offset: number) => clamp(min + Math.round(offset / ITEM_HEIGHT) * step, min, max),
    [min, max, step],
  );

  const clearSettle = () => {
    if (settleRef.current) clearTimeout(settleRef.current);
    settleRef.current = null;
  };

  /** Web has no native snapping, so the wheel is pulled onto the row once scrolling settles. */
  const commit = useCallback(
    (next: number) => {
      interactingRef.current = false;
      setDisplay(next);

      const target = offsetFor(next);

      if (Math.abs(offsetRef.current - target) > 0.5) {
        offsetRef.current = target;
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }

      if (next !== value) onChange(next);
    },
    [offsetFor, onChange, value],
  );

  const scrollTo = useCallback((offset: number) => {
    offsetRef.current = offset;
    scrollRef.current?.scrollTo({ y: offset, animated: false });
  }, []);

  // Follow the value when it changes from outside (initial load, reset) and never mid-drag.
  useEffect(() => {
    if (interactingRef.current || value === displayRef.current) return;

    setDisplay(value);
    scrollTo(offsetFor(value));
  }, [value, offsetFor, scrollTo]);

  useEffect(() => clearSettle, []);

  // The wheel cannot be scrolled until its rows have been measured.
  const handleContentSizeChange = () => {
    if (interactingRef.current) return;
    scrollTo(offsetFor(displayRef.current));
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offsetRef.current = event.nativeEvent.contentOffset.y;

    const next = valueAt(offsetRef.current);
    if (next !== displayRef.current) setDisplay(next);

    clearSettle();
    settleRef.current = setTimeout(() => {
      if (interactingRef.current) return;
      commit(displayRef.current);
    }, SETTLE_MS);
  };

  const handleDragStart = () => {
    interactingRef.current = true;
    clearSettle();
  };

  const handleDragEnd = () => {
    interactingRef.current = false;
    clearSettle();
    settleRef.current = setTimeout(() => commit(displayRef.current), SETTLE_MS);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    clearSettle();
    offsetRef.current = event.nativeEvent.contentOffset.y;
    commit(valueAt(offsetRef.current));
  };

  const nudge = (direction: 1 | -1) => {
    const next = clamp(display + direction * step, min, max);
    if (next !== display) commit(next);
  };

  return (
    <View style={[styles.host, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[styles.wheel, disabled && styles.wheelDisabled]}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: display, text: unit ? `${display} ${unit}` : `${display}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => {
          if (disabled) return;
          if (event.nativeEvent.actionName === 'increment') nudge(1);
          if (event.nativeEvent.actionName === 'decrement') nudge(-1);
        }}
      >
        <View pointerEvents="none" style={styles.band}>
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
        </View>

        <ScrollView
          ref={scrollRef}
          scrollEnabled={!disabled}
          showsVerticalScrollIndicator={false}
          // The screen wraps the card in its own vertical ScrollView.
          nestedScrollEnabled
          decelerationRate="fast"
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          disableIntervalMomentum
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollBeginDrag={handleDragStart}
          onScrollEndDrag={handleDragEnd}
          onMomentumScrollBegin={handleDragStart}
          onMomentumScrollEnd={handleMomentumEnd}
          onContentSizeChange={handleContentSizeChange}
          contentContainerStyle={styles.rows}
        >
          {rows.map(row => (
            <WheelRow key={row} value={row} distance={Math.abs(row - display)} />
          ))}
        </ScrollView>

        <EdgeScrim placement="top" />
        <EdgeScrim placement="bottom" />
      </View>

      <View style={styles.steppers}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          disabled={disabled || display <= min}
          onPress={() => nudge(-1)}
          style={({ pressed }) => [
            styles.stepper,
            (disabled || display <= min) && styles.stepperDisabled,
            pressed && !disabled && display > min && styles.stepperPressed,
          ]}
        >
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          disabled={disabled || display >= max}
          onPress={() => nudge(1)}
          style={({ pressed }) => [
            styles.stepper,
            (disabled || display >= max) && styles.stepperDisabled,
            pressed && !disabled && display < max && styles.stepperPressed,
          ]}
        >
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Dissolves the off-band rows into the surface, the way a real rotor falls away at the edges. */
function EdgeScrim({ placement }: { placement: 'top' | 'bottom' }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.scrim, placement === 'top' ? styles.scrimTop : styles.scrimBottom]}
    >
      {SCRIM_OPACITIES.map(opacity => (
        <View key={opacity} style={[styles.scrimLayer, { opacity }]} />
      ))}
    </View>
  );
}

/** Memoized so a scroll tick only repaints the rows whose depth tier actually changed. */
const WheelRow = memo(function WheelRow({ value, distance }: { value: number; distance: number }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, tierStyles[Math.min(distance, 3)]]}>{value}</Text>
    </View>
  );
});

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

const styles = StyleSheet.create({
  host: {
    gap: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: LABEL_INK,
    textAlign: 'center',
  },
  wheel: {
    height: WHEEL_HEIGHT,
    borderRadius: 12,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: HAIRLINE,
    overflow: 'hidden',
    justifyContent: 'center',
    // Inert on native; on web this inherits down to every row.
    cursor: 'pointer',
  },
  wheelDisabled: {
    cursor: 'auto',
  },
  steppers: {
    flexDirection: 'row',
    gap: 8,
  },
  stepper: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: HAIRLINE,
    cursor: 'pointer',
  },
  stepperDisabled: {
    opacity: 0.4,
    cursor: 'auto',
  },
  stepperPressed: {
    opacity: 0.75,
  },
  stepperText: {
    fontSize: 20,
    fontWeight: '600',
    color: PICKER_INK,
    lineHeight: 24,
  },
  band: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: ITEM_HEIGHT * PAD_ROWS,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: SELECTION_FILL,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 14,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * PAD_ROWS,
  },
  scrimTop: {
    top: 0,
  },
  scrimBottom: {
    bottom: 0,
    flexDirection: 'column-reverse',
  },
  scrimLayer: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  rows: {
    paddingVertical: ITEM_HEIGHT * PAD_ROWS,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tabular figures keep a fixed advance width so nothing shifts as the value rolls.
  rowText: {
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    color: PICKER_INK,
  },
  // Opacities stay gentle here because the edge scrims do most of the fading.
  rowSelected: {
    fontSize: 30,
    fontWeight: '600',
  },
  rowNear: {
    fontSize: 26,
    fontWeight: '500',
    opacity: 0.6,
  },
  rowFar: {
    fontSize: 22,
    fontWeight: '400',
    opacity: 0.35,
  },
  rowEdge: {
    fontSize: 20,
    fontWeight: '400',
    opacity: 0.18,
  },
  unit: {
    fontSize: 13,
    fontWeight: '400',
    color: PICKER_SECONDARY,
  },
});

/** Indexed by how many rows a value sits from the selection band. */
const tierStyles = [styles.rowSelected, styles.rowNear, styles.rowFar, styles.rowEdge];
