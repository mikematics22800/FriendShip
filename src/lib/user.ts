import { supabase } from '@/lib/supabase';

export const SETTING_MIN = 10;
export const SETTING_MAX = 100;

export type FriendsOnly = [boolean, boolean];

export type UserSettings = {
  places: number[];
  placesRadius: number;
  dailyInviteLimit: number;
  friendsOnly: FriendsOnly;
};

const DEFAULT_PLACES: number[] = [];
const DEFAULT_PLACES_RADIUS = SETTING_MIN;
const DEFAULT_DAILY_INVITE_LIMIT = SETTING_MIN;
const DEFAULT_FRIENDS_ONLY: FriendsOnly = [false, false];

const ensuring = new Set<string>();

/** Keeps stored values inside the range the ruler pickers can reach. */
function clamp(value: number | null | undefined, fallback: number) {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(SETTING_MAX, Math.max(SETTING_MIN, Math.round(candidate)));
}

/** Drops duplicates and non-integers so `user.places` stays a clean smallint[]. */
function uniqueInts(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_PLACES];

  const seen = new Set<number>();
  for (const item of value) {
    if (typeof item === 'number' && Number.isFinite(item)) seen.add(Math.round(item));
  }
  return [...seen];
}

/** [send, receive]; a leftover scalar boolean is copied into both slots. */
function asFriendsOnly(value: unknown): FriendsOnly {
  if (Array.isArray(value) && value.length >= 2) return [Boolean(value[0]), Boolean(value[1])];
  if (typeof value === 'boolean') return [value, value];
  return [DEFAULT_FRIENDS_ONLY[0], DEFAULT_FRIENDS_ONLY[1]];
}

/** Creates the public.user row for this auth UID if it does not already exist. */
export async function ensureUserRow(uid: string) {
  if (ensuring.has(uid)) return;
  ensuring.add(uid);

  try {
    const { data, error } = await supabase.from('user').select('id').eq('id', uid).maybeSingle();

    if (error) {
      console.warn('Could not load user row:', error.message);
      return;
    }

    if (data) return;

    const { error: insertError } = await supabase.from('user').insert({
      id: uid,
      places: DEFAULT_PLACES,
      places_radius: DEFAULT_PLACES_RADIUS,
      daily_invite_limit: DEFAULT_DAILY_INVITE_LIMIT,
    });

    // Unique violation: another in-flight login already created the row.
    if (insertError && insertError.code !== '23505') {
      console.warn('Could not create user row:', insertError.message);
    }
  } finally {
    ensuring.delete(uid);
  }
}

/** Reads the editable settings for this UID, falling back to defaults when the row is missing. */
export async function fetchUserSettings(uid: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user')
    .select('places, places_radius, daily_invite_limit, friends_only')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.warn('Could not load user settings:', error.message);
  }

  return {
    places: uniqueInts(data?.places),
    placesRadius: clamp(data?.places_radius, DEFAULT_PLACES_RADIUS),
    dailyInviteLimit: clamp(data?.daily_invite_limit, DEFAULT_DAILY_INVITE_LIMIT),
    friendsOnly: asFriendsOnly(data?.friends_only),
  };
}

/** Writes editable settings back to the user row. */
export async function updateUserSettings(uid: string, settings: UserSettings) {
  const { error } = await supabase
    .from('user')
    .update({
      places: uniqueInts(settings.places),
      places_radius: clamp(settings.placesRadius, DEFAULT_PLACES_RADIUS),
      daily_invite_limit: clamp(settings.dailyInviteLimit, DEFAULT_DAILY_INVITE_LIMIT),
      friends_only: asFriendsOnly(settings.friendsOnly),
    })
    .eq('id', uid);

  if (error) throw new Error(error.message);
}

