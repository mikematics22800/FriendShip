const ACCESS_TOKEN_KEY = 'friendship.googleAccessToken';
const SCOPES_KEY = 'friendship.googleScopes';

function storage(): Storage | null {
  return typeof sessionStorage === 'undefined' ? null : sessionStorage;
}

export function rememberGoogleAccess(accessToken: string | undefined, scopes: string[]) {
  const store = storage();
  if (!store) return;

  if (accessToken) {
    store.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  const existing = getGrantedGoogleScopes();
  store.setItem(SCOPES_KEY, JSON.stringify([...new Set([...existing, ...scopes])]));
}

export function getGoogleAccessToken(): string | null {
  return storage()?.getItem(ACCESS_TOKEN_KEY) ?? null;
}

export function getGrantedGoogleScopes(): string[] {
  const raw = storage()?.getItem(SCOPES_KEY);
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(scope => typeof scope === 'string') : [];
  } catch {
    return [];
  }
}

export function hasStoredGoogleScope(scope: string): boolean {
  return getGrantedGoogleScopes().includes(scope);
}

export function clearGoogleAccess() {
  const store = storage();
  store?.removeItem(ACCESS_TOKEN_KEY);
  store?.removeItem(SCOPES_KEY);
}
