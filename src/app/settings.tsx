import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WheelPicker } from '@/components/WheelPicker';
import { useAuthContext } from '@/hooks/use-auth-context';
import {
  AGE_MAX,
  AGE_MIN,
  fetchUserSettings,
  PARTY_MAX,
  PARTY_MIN,
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
const MUTED_INK = '#c8c5d0';
const PLACE_SURFACE = '#0a0910';
const PLACE_INK = '#f4f2fa';
const HAIRLINE = '#2a2738';
const LIME_FILL = 'rgba(180, 245, 0, 0.14)';
const PLACES = placesCatalog as [string, number][];
const FRIENDS_ONLY_OPTIONS = [
  { label: 'Friends', value: true },
  { label: 'Anyone', value: false },
] as const;

function samePlaces(left: number[], right: number[]) {
  if (left.length !== right.length) return false;
  const lookup = new Set(left);
  return right.every(id => lookup.has(id));
}

function sameAgeRange(left: [number, number], right: [number, number]) {
  return left[0] === right[0] && left[1] === right[1];
}

/** city_park -> City Park */
function placeLabel(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

type FriendsOnlyGroupProps = {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (friendsOnly: boolean) => void;
};

function FriendsOnlyGroup({ label, value, disabled, onChange }: FriendsOnlyGroupProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.friendsOnlyHost}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.segmentTrack}>
        {FRIENDS_ONLY_OPTIONS.map(option => {
          const checked = value === option.value;

          return (
            <Pressable
              key={option.label}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                checked && styles.segmentSelected,
                disabled && styles.controlDisabled,
                pressed && !disabled && styles.pressed,
              ]}
            >
              <Text style={[styles.segmentLabel, checked && styles.segmentLabelSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Settings() {
  const { claims } = useAuthContext();
  const uid = claims?.sub as string | undefined;

  const [saved, setSaved] = useState<UserSettings | null>(null);
  const [draft, setDraft] = useState<UserSettings | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setSaved(null);
      setDraft(null);
      setStatus('loading');
      setError(null);
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setError(null);

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
      draft.friendsOnly !== saved.friendsOnly ||
      draft.partySize !== saved.partySize ||
      !sameAgeRange(draft.ageRange, saved.ageRange) ||
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
          {status === 'loading' || !draft ? (
            <View style={styles.loading}>
              <ActivityIndicator color={PICKER_SPINNER} />
            </View>
          ) : (
            <>
              <View style={styles.pickers}>
              <View style={styles.friendsOnlyColumn}>
                  <FriendsOnlyGroup
                    label="Seeking Plans With"
                    value={draft.friendsOnly}
                    disabled={saving}
                    onChange={friendsOnly =>
                      setDraft(current => (current ? { ...current, friendsOnly } : current))
                    }
                  />
                </View>
                <View style={styles.picker}>
                  <WheelPicker
                    label="Daily Invite Limit"
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
              <View style={styles.pickers}>
                <View style={styles.picker}>
                  <WheelPicker
                    label="Min Age"
                    unit="yrs"
                    value={draft.ageRange[0]}
                    min={AGE_MIN}
                    max={draft.ageRange[1]}
                    disabled={saving}
                    onChange={minAge =>
                      setDraft(current =>
                        current ? { ...current, ageRange: [minAge, current.ageRange[1]] } : current,
                      )
                    }
                  />
                </View>
                <View style={styles.picker}>
                  <WheelPicker
                    label="Max Age"
                    unit="yrs"
                    value={draft.ageRange[1]}
                    min={draft.ageRange[0]}
                    max={AGE_MAX}
                    disabled={saving}
                    onChange={maxAge =>
                      setDraft(current =>
                        current ? { ...current, ageRange: [current.ageRange[0], maxAge] } : current,
                      )
                    }
                  />
                </View>
              </View>
              <View style={styles.pickers}>
                <View style={styles.picker}>
                  <WheelPicker
                    label="Party Size"
                    unit="people"
                    value={draft.partySize}
                    min={PARTY_MIN}
                    max={PARTY_MAX}
                    disabled={saving}
                    onChange={partySize =>
                      setDraft(current => (current ? { ...current, partySize } : current))
                    }
                  />
                </View>
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
              </View>
              <View style={styles.favoritePlacesHost}>
                <Text style={styles.sectionLabel}>Favorite Places</Text>
                <View style={styles.favoritePlaces}>
                  <View style={styles.placeList}>
                    {PLACES.map(([name, id]) => {
                      const checked = draft.places.includes(id);
                      const chip = placeLabel(name);

                      return (
                        <Pressable
                          key={id}
                          accessibilityRole="checkbox"
                          accessibilityLabel={chip}
                          accessibilityState={{ checked, disabled: saving }}
                          disabled={saving}
                          onPress={() => togglePlace(id)}
                          style={({ pressed }) => [
                            styles.placeChip,
                            checked && styles.placeChipSelected,
                            saving && styles.controlDisabled,
                            pressed && !saving && styles.pressed,
                          ]}
                        >
                          {checked ? <Text style={styles.placeCheck}>✓</Text> : null}
                          <Text style={[styles.placeName, checked && styles.placeNameSelected]}>{chip}</Text>
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
                    !dirty && styles.saveGhost,
                    pressed && dirty && !saving && styles.pressed,
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color={NAVY} />
                  ) : (
                    <Text style={[styles.saveText, !dirty && styles.saveTextGhost]}>
                      {dirty ? 'Save changes' : 'Saved'}
                    </Text>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  android: {
    shadowColor: LIME,
    elevation: 6,
  },
  default: {
    boxShadow: `0 0 0 1px ${HAIRLINE}, 0 8px 24px rgba(180, 245, 0, 0.16)`,
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
    borderRadius: 20,
    padding: 32,
    gap: 24,
    ...limeGlow,
  },
  pickers: {
    flexDirection: 'row',
    gap: 20,
  },
  picker: {
    flex: 1,
    minWidth: 0,
  },
  friendsOnlyColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
  },
  friendsOnlyHost: {
    width: '100%',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    color: LABEL_INK,
    textAlign: 'center',
  },
  segmentTrack: {
    flexDirection: 'row',
    height: 40,
    padding: 3,
    borderRadius: 20,
    backgroundColor: PLACE_SURFACE,
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  segment: {
    flex: 1,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: LIME_FILL,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: MUTED_INK,
  },
  segmentLabelSelected: {
    color: LIME,
    fontWeight: '600',
  },
  favoritePlacesHost: {
    width: '100%',
    gap: 10,
  },
  favoritePlaces: {
    width: '100%',
    backgroundColor: PLACE_SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 25,
  },
  placeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  placeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    minHeight: 45,
    paddingHorizontal: 15,
    gap: 5,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: HAIRLINE,
    backgroundColor: 'transparent',
    maxWidth: 160,
    width: '100%',
  },
  placeChipSelected: {
    backgroundColor: LIME_FILL,
    borderColor: LIME,
  },
  placeCheck: {
    fontSize: 13,
    fontWeight: '700',
    color: LIME,
  },
  placeName: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
    color: PLACE_INK,
  },
  placeNameSelected: {
    color: LIME,
  },
  controlDisabled: {
    opacity: 0.5,
  },
  loading: {
    minHeight: 480,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLACE_SURFACE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: HAIRLINE,
  },
  actions: {
    gap: 12,
  },
  save: {
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LIME,
    borderWidth: 1,
    borderColor: LIME,
  },
  saveGhost: {
    backgroundColor: 'transparent',
    borderColor: HAIRLINE,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  saveTextGhost: {
    color: MUTED_INK,
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
