import { META_GRAPH_BASE_URL, META_GRAPH_VERSION } from '@/lib/facebook-app';
import { getFacebookAccessToken } from '@/lib/facebook-token';

export type MetaBirthday = {
  /** Null when the person shared only the month and day. */
  year: number | null;
  month: number;
  day: number;
};

export type MetaProfile = {
  id: string;
  name: string | null;
  photoURL: string | null;
  birthday: MetaBirthday | null;
};

type GraphPicture = {
  data?: {
    url?: string;
    is_silhouette?: boolean;
  };
};

type GraphUser = {
  id?: string;
  name?: string;
  birthday?: string;
  picture?: GraphPicture;
  error?: { message?: string; code?: number };
};

let cachedProfile: MetaProfile | null = null;

export function getCachedMetaProfile() {
  return cachedProfile;
}

export function clearCachedMetaProfile() {
  cachedProfile = null;
}

/** Reads name, picture, and birthday from Graph API `/me`. */
export async function fetchMetaProfile(): Promise<MetaProfile> {
  const accessToken = await getFacebookAccessToken();
  if (!accessToken) {
    throw Object.assign(new Error('Facebook session expired. Sign in again.'), {
      code: 'facebook/missing-access-token',
    });
  }

  const url = new URL(`${META_GRAPH_BASE_URL}/${META_GRAPH_VERSION}/me`);
  url.searchParams.set('fields', 'id,name,birthday,picture.width(512).height(512)');

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = (await response.json()) as GraphUser;

  if (!response.ok || body.error || !body.id) {
    throw Object.assign(new Error(body.error?.message ?? `Graph API responded with ${response.status}`), {
      code: 'facebook/graph-error',
    });
  }

  const profile: MetaProfile = {
    id: body.id,
    name: body.name?.trim() || null,
    photoURL: body.picture?.data?.is_silhouette ? null : body.picture?.data?.url || null,
    birthday: parseFacebookBirthday(body.birthday),
  };
  cachedProfile = profile;
  return profile;
}

export function formatBirthday({ year, month, day }: MetaBirthday): string {
  return new Date(year ?? 2000, month - 1, day).toLocaleDateString(undefined, {
    year: year ? 'numeric' : undefined,
    month: 'long',
    day: 'numeric',
  });
}

export function describeMetaProfileError(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error && error.code === 'facebook/missing-access-token') {
    return 'Facebook session expired. Sign in again.';
  }

  return 'Could not read your profile from Facebook.';
}

/** Facebook returns MM/DD/YYYY, MM/DD, or YYYY depending on the person's privacy settings. */
export function parseFacebookBirthday(value: string | undefined): MetaBirthday | null {
  if (!value) return null;

  const parts = value.split('/').map(part => Number(part));
  if (parts.some(part => !Number.isFinite(part) || part <= 0)) {
    return null;
  }

  if (parts.length === 3) {
    const [month, day, year] = parts;
    return isCalendarDate(month, day) ? { year, month, day } : null;
  }

  if (parts.length === 2) {
    const [month, day] = parts;
    return isCalendarDate(month, day) ? { year: null, month, day } : null;
  }

  return null;
}

function isCalendarDate(month: number, day: number) {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}
