import { supabase } from '@/lib/supabase';

export const SETTING_MIN = 10;
export const SETTING_MAX = 100;
export const AGE_MIN = 18;
export const AGE_MAX = 99;
export const PARTY_MIN = 5;
export const PARTY_MAX = 25;
export const TIME_MIN = 0;
export const TIME_MAX = 24;
export const TIME_STEP = 0.25;

/** Rounds to 15-minute hours in 0–24 (24 is end-of-day midnight). */
export function snapTime(value: number | null | undefined, fallback = TIME_MIN): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  const minutes = Math.round(candidate * 60);
  const stepMinutes = Math.round(TIME_STEP * 60);
  const snappedMinutes = Math.round(minutes / stepMinutes) * stepMinutes;
  return Math.min(TIME_MAX, Math.max(TIME_MIN, snappedMinutes / 60));
}

/** 0 and 24 -> 12:00 AM, 9.25 -> 9:15 AM */
export function formatHour(hour: number): string {
  const snapped = snapTime(hour);
  if (snapped >= TIME_MAX) return '12:00 AM';

  const totalMinutes = Math.round(snapped * 60);
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const minute = wrapped % 60;
  const period = hour24 < 12 ? 'AM' : 'PM';
  const twelve = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${twelve}:${String(minute).padStart(2, '0')} ${period}`;
}

export type AgeRange = [number, number];
export type HourRange = [number, number];
export type Availability = [HourRange, HourRange, HourRange, HourRange, HourRange, HourRange, HourRange];

export type UserSettings = {
  places: number[];
  placesRadius: number;
  dailyInviteLimit: number;
  friendsOnly: boolean;
  ageRange: AgeRange;
  partySize: number;
  availability: Availability;
};

const DEFAULT_PLACES: number[] = [];
const DEFAULT_PLACES_RADIUS = SETTING_MIN;
const DEFAULT_DAILY_INVITE_LIMIT = SETTING_MIN;
const DEFAULT_FRIENDS_ONLY = false;
const DEFAULT_AGE_RANGE: AgeRange = [AGE_MIN, AGE_MAX];
const DEFAULT_PARTY_SIZE = 10;
const DEFAULT_AVAILABILITY: Availability = [
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
  [TIME_MIN, TIME_MAX],
];

const ensuring = new Set<string>();

/** Keeps stored values inside the range the sliders can reach. */
function clamp(value: number | null | undefined, fallback: number, min = SETTING_MIN, max = SETTING_MAX) {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, Math.round(candidate)));
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

/** A leftover 2-tuple is collapsed to its first slot. */
function asFriendsOnly(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value) && value.length >= 1) return Boolean(value[0]);
  return DEFAULT_FRIENDS_ONLY;
}

function asAgeRange(value: unknown): AgeRange {
  const raw = Array.isArray(value) ? value : DEFAULT_AGE_RANGE;
  const min = clamp(raw[0], DEFAULT_AGE_RANGE[0], AGE_MIN, AGE_MAX);
  const max = clamp(raw[1], DEFAULT_AGE_RANGE[1], AGE_MIN, AGE_MAX);
  return min <= max ? [min, max] : [max, min];
}

function asHourRange(value: unknown): HourRange {
  const raw = Array.isArray(value) ? value : DEFAULT_AVAILABILITY[0];
  const min = snapTime(raw[0], TIME_MIN);
  const max = snapTime(raw[1], TIME_MAX);
  return min <= max ? [min, max] : [max, min];
}

function asAvailability(value: unknown): Availability {
  const raw = Array.isArray(value) ? value : DEFAULT_AVAILABILITY;
  return [
    asHourRange(raw[0]),
    asHourRange(raw[1]),
    asHourRange(raw[2]),
    asHourRange(raw[3]),
    asHourRange(raw[4]),
    asHourRange(raw[5]),
    asHourRange(raw[6]),
  ];
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
      max_daily_invites: DEFAULT_DAILY_INVITE_LIMIT,
      friends_only: DEFAULT_FRIENDS_ONLY,
      age_range: DEFAULT_AGE_RANGE,
      party_size: DEFAULT_PARTY_SIZE,
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
    .select('places, places_radius, max_daily_invites, friends_only, age_range, party_size, availability')
    .eq('id', uid)
    .maybeSingle();

  if (error) {
    console.warn('Could not load user settings:', error.message);
  }

  return {
    places: uniqueInts(data?.places),
    placesRadius: clamp(data?.places_radius, DEFAULT_PLACES_RADIUS),
    dailyInviteLimit: clamp(data?.max_daily_invites, DEFAULT_DAILY_INVITE_LIMIT),
    friendsOnly: asFriendsOnly(data?.friends_only),
    ageRange: asAgeRange(data?.age_range),
    partySize: clamp(data?.party_size, DEFAULT_PARTY_SIZE, PARTY_MIN, PARTY_MAX),
    availability: asAvailability(data?.availability),
  };
}

/** Writes editable settings back to the user row. */
export async function updateUserSettings(uid: string, settings: UserSettings) {
  const { error } = await supabase
    .from('user')
    .update({
      places: uniqueInts(settings.places),
      places_radius: clamp(settings.placesRadius, DEFAULT_PLACES_RADIUS),
      max_daily_invites: clamp(settings.dailyInviteLimit, DEFAULT_DAILY_INVITE_LIMIT),
      friends_only: asFriendsOnly(settings.friendsOnly),
      age_range: asAgeRange(settings.ageRange),
      party_size: clamp(settings.partySize, DEFAULT_PARTY_SIZE, PARTY_MIN, PARTY_MAX),
      availability: asAvailability(settings.availability),
    })
    .eq('id', uid);

  if (error) throw new Error(error.message);
}
