import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RadioButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WheelPicker } from '@/components/WheelPicker';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  fetchUserSettings,
  SETTING_MAX,
  SETTING_MIN,
  updateUserSettings,
  type UserSettings,
} from '@/lib/user';
import placesCatalog from '../../places.json';

const LIME = '#b4f500';
const NAVY = '#1a1530';
const DANGER = '#ff7a7a';
const PICKER_SPINNER = '#8e8e93';
const LABEL_INK = '#e8e6ee';
const PLACE_SURFACE = '#0a0910';
const PLACE_ROW = '#16141f';
const PLACE_INK = '#f4f2fa';
const PLACES = placesCatalog as [string, number][];

function samePlaces(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  const lookup = new Set(left);
  return right.every(id => lookup.has(id));
}

/** city_park -> City Park */
function placeLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Settings() {
  const { claims } = useAuthContext();
  const uid = claims?.sub as string | undefined;

  const [saved, setSaved] = useState<UserSettings | null>(null);
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;
    setStatus('loading');

    fetchUserSettings(uid).then(settings => {
      if (cancelled) return;

      setSaved(settings);
      setDraft(settings);
      setStatus('idle');
    });

    return () => {
      cancelled = true;
    };
  }, [uid]);

  const dirty =
    !!draft &&
    !!saved &&
    (draft.placesRadius !== saved.placesRadius ||
      draft.dailyInviteLimit !== saved.dailyInviteLimit ||
      !samePlaces(draft.places, saved.places));
  const saving = status === 'saving';

  const togglePlace = (id: number) => {
    if (saving) return;

    setDraft(current => {
      if (!current) return current;

      const selected = current.places.includes(id);
      return {
        ...current,
        places: selected ? current.places.filter(place => place !== id) : [...current.places, id],
      };
    });
  };

  const save = async () => {
    if (!uid || !draft || !dirty || saving) return;

    setStatus('saving');
    setError(null);

    try {
      await updateUserSettings(uid, draft);
      setSaved(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your settings.');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.heading}>Settings</Text>

          {status === 'loading' || !draft ? (
            <View style={styles.loading}>
              <ActivityIndicator color={PICKER_SPINNER} />
            </View>
          ) : (
            <>
              <View style={styles.pickers}>
                <View style={styles.picker}>
                  <WheelPicker
                    label="Places Radius"
                    unit="km"
                    value={draft.placesRadius}
                    min={SETTING_MIN}
                    max={SETTING_MAX}
                    disabled={saving}
                    onChange={placesRadius =>
                      setDraft(current => (current ? { ...current, placesRadius } : current))
                    }
                  />
                </View>

                <View style={styles.picker}>
                  <WheelPicker
                    label="Daily Invite Limit"
                    labelAlign="right"
                    unit="invites"
                    value={draft.dailyInviteLimit}
                    min={SETTING_MIN}
                    max={SETTING_MAX}
                    disabled={saving}
                    onChange={dailyInviteLimit =>
                      setDraft(current => (current ? { ...current, dailyInviteLimit } : current))
                    }
                  />
                </View>
              </View>
              <View style={styles.favoritePlacesHost}>
                <Text style={styles.favoritePlacesLabel}>Favorite Places</Text>
                <View style={styles.favoritePlaces}>

                <View style={styles.placeList}>
                  {PLACES.map(([name, id]) => {
                    const checked = draft.places.includes(id);
                    const label = placeLabel(name);

                    return (
                      <Pressable
                        key={id}
                        accessibilityRole="radio"
                        accessibilityLabel={label}
                        accessibilityState={{ checked, disabled: saving }}
                        disabled={saving}
                        onPress={() => togglePlace(id)}
                        style={({ pressed }) => [
                          styles.placeRow,
                          saving && styles.placeRowDisabled,
                          pressed && !saving && styles.pressed,
                        ]}
                      >
                        <Text style={styles.placeName}>{label}</Text>
                        <View style={styles.placeRadio}>
                          <RadioButton
                            value={String(id)}
                            status={checked ? 'checked' : 'unchecked'}
                            disabled={saving}
                            color={PLACE_INK}
                            uncheckedColor={PICKER_SPINNER}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                </View>
              </View>

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save changes"
                  accessibilityState={{ busy: saving, disabled: !dirty || saving }}
                  disabled={!dirty || saving}
                  onPress={() => {
                    void save();
                  }}
                  style={({ pressed }) => [
                    styles.save,
                    (!dirty || saving) && styles.saveDisabled,
                    pressed && dirty && !saving && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color={NAVY} />
                  ) : (
                    <Text style={styles.saveText}>{dirty ? 'Save changes' : 'Saved'}</Text>
                  )}
                </Pressable>

                {error ? <Text style={styles.error}>{error}</Text> : null}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  card: {
    width: 1000,
    maxWidth: '100%',
    backgroundColor: NAVY,
    borderRadius: 25,
    padding: 32,
    gap: 28,
    ...limeGlow,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: LIME,
    textAlign: 'center',
    ...limeTextGlow,
  },
  pickers: {
    flexDirection: 'row',
    gap: 20,
  },
  picker: {
    flex: 1,
    minWidth: 0,
  },
  favoritePlacesHost: {
    width: '100%',
    gap: 10,
  },
  favoritePlaces: {
    width: '100%',
    backgroundColor: PLACE_SURFACE,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  favoritePlacesLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: LABEL_INK,
    textAlign: 'center',
  },
  placeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 12,
    backgroundColor: PLACE_ROW,
  },
  placeRowDisabled: {
    opacity: 0.5,
  },
  placeName: {
    fontSize: 15,
    color: PLACE_INK,
  },
  placeRadio: {
    pointerEvents: 'none',
  },
  loading: {
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLACE_SURFACE,
    borderRadius: 12,
  },
  actions: {
    gap: 12,
  },
  save: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIME,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  pressed: {
    opacity: 0.75,
  },
  error: {
    fontSize: 13,
    color: DANGER,
    textAlign: 'center',
  },
});
