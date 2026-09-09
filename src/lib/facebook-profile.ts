const GRAPH_API_TOKEN = process.env.EXPO_PUBLIC_GRAPH_API_TOKEN ?? '';
const GRAPH_FIELDS = 'id,name,email,birthday,picture.width(512).height(512)';

export type FacebookProfile = {
  name: string | null;
  email: string | null;
  pictureUrl: string | null;
  dateOfBirth: string | null;
};

type GraphPicture = {
  data?: {
    url?: string;
  };
};

type GraphUser = {
  name?: string;
  email?: string;
  birthday?: string;
  picture?: GraphPicture;
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

/** Facebook birthday is MM/DD/YYYY, MM/DD, or YYYY. Only a full date is displayed. */
export function parseFacebookBirthday(birthday?: string | null): string | null {
  if (!birthday) return null;

  const parts = birthday.split(/[/-]/).filter(Boolean);
  if (parts.length !== 3) return null;

  const [month, day, year] = parts;
  if (year.length !== 4 || month.length > 2 || day.length > 2) return null;

  const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  return iso;
}

export async function fetchFacebookProfile(): Promise<FacebookProfile | null> {
  if (!GRAPH_API_TOKEN) {
    console.warn('EXPO_PUBLIC_GRAPH_API_TOKEN is missing; skipping Graph API profile fetch.');
    return null;
  }

  const url = new URL('https://graph.facebook.com/v22.0/me');
  url.searchParams.set('fields', GRAPH_FIELDS);
  url.searchParams.set('access_token', GRAPH_API_TOKEN);

  const response = await fetch(url.toString());
  const payload = (await response.json()) as GraphUser;

  if (!response.ok || payload.error) {
    console.warn('Facebook Graph profile fetch failed:', payload.error?.message ?? response.status);
    return null;
  }

  return {
    name: payload.name ?? null,
    email: payload.email ?? null,
    pictureUrl: payload.picture?.data?.url ?? null,
    dateOfBirth: parseFacebookBirthday(payload.birthday),
  };
}
