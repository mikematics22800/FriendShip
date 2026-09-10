import type { Session, User } from '@supabase/supabase-js';

const GRAPH_FIELDS = 'id,name,email,birthday,picture.width(512).height(512)';

export type AuthProfile = {
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

function metaString(meta: Record<string, unknown>, key: string): string | null {
  const value = meta[key];
  return typeof value === 'string' && value ? value : null;
}

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

/** Name, email, and photo from the Supabase user (Google, or Facebook after token refresh). */
export function profileFromUser(user: User): AuthProfile {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  return {
    name: metaString(meta, 'name') ?? metaString(meta, 'full_name') ?? metaString(meta, 'fullName'),
    email: user.email ?? metaString(meta, 'email'),
    pictureUrl: metaString(meta, 'picture') ?? metaString(meta, 'avatar_url'),
    dateOfBirth: parseFacebookBirthday(metaString(meta, 'birthday')),
  };
}

export async function fetchFacebookProfile(accessToken: string): Promise<AuthProfile | null> {
  if (!accessToken) return null;

  const url = new URL('https://graph.facebook.com/v22.0/me');
  url.searchParams.set('fields', GRAPH_FIELDS);
  url.searchParams.set('access_token', accessToken);

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
/** Facebook Graph when this session has a provider token; otherwise user_metadata. */
export async function loadSessionProfile(session: Session): Promise<AuthProfile | null> {
  const provider = session.user.app_metadata?.provider ?? session.user.identities?.[0]?.provider;

  if (provider === 'facebook' && session.provider_token) {
    const graph = await fetchFacebookProfile(session.provider_token);
    if (graph) return graph;
  }

  return profileFromUser(session.user);
}

