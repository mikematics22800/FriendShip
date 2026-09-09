import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const IS_WEB = Platform.OS === 'web';

if (!IS_WEB) {
  // supabase-js needs a spec-compliant URL implementation on native.
  require('react-native-url-polyfill/auto');
}

if (IS_WEB) {
  // Closes the popup/tab that Facebook redirects back into.
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

/** Turns a Facebook redirect back into a Supabase session. */
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

export async function signInWithFacebook() {
  const redirectTo = makeRedirectUri();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
      scopes: 'email,public_profile,user_birthday',
      // Native has no browser to redirect, so we open the URL ourselves.
      skipBrowserRedirect: !IS_WEB,
    },
  });

  if (error) throw error;
  if (IS_WEB) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url ?? '', redirectTo);

  if (result.type !== 'success') return;

  await createSessionFromUrl(result.url);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
