import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Provider, type User, type UserIdentity } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';
const PENDING_LINK_KEY = 'pending-identity-link';

if (!IS_WEB) {
  // supabase-js needs a spec-compliant URL implementation on native.
  require('react-native-url-polyfill/auto');
}

if (IS_WEB) {
  // Closes the popup/tab that an OAuth provider redirects back into.
  WebBrowser.maybeCompleteAuthSession();
}

/** AsyncStorage is localStorage-backed on web. Skipped entirely while static rendering. */
const IS_SERVER = IS_WEB && typeof window === 'undefined';

const storage = {
  getItem: (key: string) => (IS_SERVER ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) => (IS_SERVER ? Promise.resolve() : AsyncStorage.setItem(key, value)),
  removeItem: (key: string) => (IS_SERVER ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  {
    auth: {
      storage,
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      // On web supabase-js finishes the redirect itself; on native we do it in createSessionFromUrl.
      detectSessionInUrl: IS_WEB && !IS_SERVER,
    },
  },
);

export type LinkableProvider = 'facebook' | 'google';

export type LinkedProviders = {
  facebook: boolean;
  google: boolean;
};

export const FACEBOOK_FEATURE_ALERT = 'Link your Facebook account to access this feature.';
export const GOOGLE_FEATURE_ALERT = 'Link your Google account to access this feature.';

export class EmailMismatchError extends Error {
  constructor(provider: LinkableProvider) {
    const name = provider === 'google' ? 'Google' : 'Facebook';
    super(
      `This ${name} account uses a different email than your FriendShip account. Link the account that uses the same email.`,
    );
    this.name = 'EmailMismatchError';
  }
}

export function linkedProvidersFromUser(user?: User | null): LinkedProviders {
  const providers = new Set<string>();

  for (const identity of user?.identities ?? []) {
    if (identity.provider) providers.add(identity.provider);
  }

  const meta = user?.app_metadata ?? {};
  if (typeof meta.provider === 'string') providers.add(meta.provider);
  if (Array.isArray(meta.providers)) {
    for (const provider of meta.providers) {
      if (typeof provider === 'string') providers.add(provider);
    }
  }

  return {
    facebook: providers.has('facebook'),
    google: providers.has('google'),
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email || null;
}

function identityEmail(identity: UserIdentity): string | null {
  return normalizeEmail(identity.identity_data?.email);
}

function accountEmail(user: User, excludeProvider: LinkableProvider): string | null {
  const fromUser = normalizeEmail(user.email);
  if (fromUser) return fromUser;

  for (const identity of user.identities ?? []) {
    if (identity.provider === excludeProvider) continue;
    const email = identityEmail(identity);
    if (email) return email;
  }

  return null;
}

function scopesFor(provider: LinkableProvider) {
  return provider === 'facebook' ? 'email,public_profile,user_birthday' : 'openid email profile';
}

function isLinkableProvider(value: string | null): value is LinkableProvider {
  return value === 'facebook' || value === 'google';
}

/** Reads params from the query string and the hash fragment of an OAuth redirect. */
function readAuthParams(url: string) {
  const params = new Map<string, string>();

  for (const chunk of url.split(/[?#]/).slice(1)) {
    for (const pair of chunk.split('&')) {
      if (!pair) continue;
      const [key, value = ''] = pair.split('=');
      params.set(decodeURIComponent(key), decodeURIComponent(value.replace(/\+/g, ' ')));
    }
  }

  return params;
}

/** Turns an OAuth redirect back into a Supabase session. */
export async function createSessionFromUrl(url: string) {
  const params = readAuthParams(url);
  const errorDescription = params.get('error_description') ?? params.get('error');

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = params.get('code');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return;
  }

  const accessToken = params.get('access_token');

  if (!accessToken) return;

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: params.get('refresh_token') ?? '',
  });

  if (error) throw error;
}

/** Handles cold-start and warm deep links on native. No-op on web, where supabase-js does it. */
export function subscribeToAuthRedirects() {
  if (IS_WEB) return () => {};

  const handle = (url: string | null) => {
    if (!url) return;
    createSessionFromUrl(url).catch(error => {
      console.error('Could not complete sign-in from redirect:', error);
    });
  };

  handle(Linking.getLinkingURL());
  const subscription = Linking.addEventListener('url', ({ url }) => handle(url));

  return () => subscription.remove();
}

async function startOAuth(provider: Provider, scopes: string, mode: 'signIn' | 'link') {
  const redirectTo = makeRedirectUri();
  const options = {
    redirectTo,
    scopes,
    skipBrowserRedirect: !IS_WEB,
  };

  const { data, error } =
    mode === 'link'
      ? await supabase.auth.linkIdentity({ provider, options })
      : await supabase.auth.signInWithOAuth({ provider, options });

  if (error) throw error;
  if (IS_WEB) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url ?? '', redirectTo);

  if (result.type !== 'success') {
    if (mode === 'link') await storage.removeItem(PENDING_LINK_KEY);
    return;
  }

  await createSessionFromUrl(result.url);
}

async function unlinkProvider(provider: LinkableProvider) {
  const { data, error } = await supabase.auth.getUserIdentities();
  if (error) throw error;

  const identity = data.identities.find(item => item.provider === provider);
  if (!identity) return;

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
  if (unlinkError) throw unlinkError;
}

export async function assertLinkedEmailsMatch(user: User, provider: LinkableProvider) {
  const linked = user.identities?.find(identity => identity.provider === provider);
  const linkedEmail = linked ? identityEmail(linked) : null;
  const existingEmail = accountEmail(user, provider);

  if (!linkedEmail || !existingEmail || linkedEmail === existingEmail) return;

  await unlinkProvider(provider);
  throw new EmailMismatchError(provider);
}

/** Consumes a pending link (web redirect) and unlinks if the emails do not match. */
let finalizeLock = false;

export async function finalizePendingIdentityLink(user: User | null | undefined) {
  if (!user || finalizeLock) return;
  finalizeLock = true;

  try {
    const pending = await storage.getItem(PENDING_LINK_KEY);
    if (!isLinkableProvider(pending)) return;

    await storage.removeItem(PENDING_LINK_KEY);
    await assertLinkedEmailsMatch(user, pending);
  } finally {
    finalizeLock = false;
  }
}

export async function signInWithFacebook() {
  return startOAuth('facebook', scopesFor('facebook'), 'signIn');
}

export async function signInWithGoogle() {
  return startOAuth('google', scopesFor('google'), 'signIn');
}

/** Adds Google or Facebook to the signed-in user. Does not start a new login session. */
export async function linkAccount(provider: LinkableProvider) {
  await storage.setItem(PENDING_LINK_KEY, provider);

  try {
    await startOAuth(provider, scopesFor(provider), 'link');
  } catch (cause) {
    await storage.removeItem(PENDING_LINK_KEY);
    throw cause;
  }

  // Web redirects away; the next session load runs finalizePendingIdentityLink.
  if (IS_WEB) return;

  const { data } = await supabase.auth.getUser();
  if (data.user) await finalizePendingIdentityLink(data.user);
}

export async function signOut() {
  await storage.removeItem(PENDING_LINK_KEY);

  const { error } = await supabase.auth.signOut();
  if (!error) return;

  const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
  if (localError) throw localError;
}
