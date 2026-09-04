import { GoogleOneTapSignIn } from 'react-native-nitro-google-signin';

/**
 * Birthdays are not part of sign-in. They need this extra scope, the People API
 * enabled in Google Cloud, and a birthday the user actually chose to share.
 */
export const BIRTHDAY_SCOPE = 'https://www.googleapis.com/auth/user.birthday.read';

export type GoogleBirthday = {
  /** Null when the user shared only the month and day. */
  year: number | null;
  month: number;
  day: number;
};

type PeopleDate = { year?: number; month?: number; day?: number };
type PeopleBirthday = { metadata?: { primary?: boolean }; date?: PeopleDate };

export function hasBirthdayScope(): boolean {
  return GoogleOneTapSignIn.getCurrentUser()?.scopes.includes(BIRTHDAY_SCOPE) ?? false;
}

/** Shows Google's consent sheet. Returns false when the user declines. */
export async function requestBirthdayAccess(): Promise<boolean> {
  const { accessToken } = await GoogleOneTapSignIn.requestScopes([BIRTHDAY_SCOPE]);

  // iOS resolves with a null token on cancel; Android throws SIGN_IN_CANCELLED.
  return accessToken !== null;
}

export async function fetchGoogleBirthday(): Promise<GoogleBirthday | null> {
  const { accessToken } = await GoogleOneTapSignIn.getTokens();

  const response = await fetch(
    'https://people.googleapis.com/v1/people/me?personFields=birthdays',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!response.ok) {
    throw new Error(`People API responded with ${response.status}`);
  }

  const birthdays: PeopleBirthday[] = (await response.json())?.birthdays ?? [];

  // Google commonly returns two entries and the profile one omits the year, so
  // prefer whichever entry actually carries it.
  const ordered = [...birthdays].sort(
    (a, b) => Number(Boolean(b.date?.year)) - Number(Boolean(a.date?.year)),
  );

  for (const { date } of ordered) {
    if (date?.month && date.day) {
      return { year: date.year || null, month: date.month, day: date.day };
    }
  }

  return null;
}

export function formatBirthday({ year, month, day }: GoogleBirthday): string {
  // Any leap-safe placeholder year works when Google withheld the real one.
  return new Date(year ?? 2000, month - 1, day).toLocaleDateString(undefined, {
    year: year ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
  });
}
