import type { Session } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import { getQueryParams } from 'expo-auth-session/build/QueryParams';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { FACEBOOK_LOGIN_PERMISSIONS } from '@/lib/facebook-app';
import { fetchMetaProfile } from '@/lib/facebook-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export type FacebookUserCredential = Session;

const FACEBOOK_CANCELLED = 'facebook/cancelled';
const FACEBOOK_NOT_CONFIGURED = 'facebook/not-configured';

export function getFacebookRedirectUri() {
  return makeRedirectUri({ scheme: 'friendship' });
}

/** Completes PKCE or implicit OAuth when the app is opened from a redirect URL. */
export async function createSessionFromUrl(url: string): Promise<Session | null> {
  const { params, errorCode } = getQueryParams(url);
  if (errorCode) {
    throw Object.assign(new Error(params.error_description ?? errorCode), { code: errorCode });
  }
  if (params.error) {
    throw Object.assign(new Error(params.error_description ?? params.error), { code: params.error });
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }

  if (!params.access_token) {
    return null;
  }

  const { data, error } = await supabase.auth.setSession({
    access_token: params.access_token,
    refresh_token: params.refresh_token ?? '',
  });
  if (error) throw error;
  return data.session;
}

export async function signInWithFacebook(): Promise<Session> {
  if (!isSupabaseConfigured()) {
    throw Object.assign(new Error('Facebook sign-in is not configured for this build.'), {
      code: FACEBOOK_NOT_CONFIGURED,
    });
  }

  const redirectTo = getFacebookRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      scopes: FACEBOOK_LOGIN_PERMISSIONS.join(','),
    },
  });
  if (error) throw error;
  if (!data.url) {
    throw new Error('Could not sign in with Facebook.');
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw facebookCancelled();
  }
  if (result.type !== 'success') {
    throw new Error('Could not sign in with Facebook.');
  }

  const session = await createSessionFromUrl(result.url);
  if (!session) {
    throw new Error('Could not sign in with Facebook.');
  }

  try {
    await fetchMetaProfile();
  } catch {
    // Session is already established; profile can retry Graph reads.
  }

  return session;
}

export async function signOutOfFacebook() {
  await supabase.auth.signOut();
}

/** Returns null when the user dismissed the browser session. */
export function describeFacebookSignInError(error: unknown): string | null {
  switch (facebookErrorCode(error)) {
    case FACEBOOK_CANCELLED:
    case 'access_denied':
      return null;
    case FACEBOOK_NOT_CONFIGURED:
      return 'Facebook sign-in is not configured for this build.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    default:
      return 'Could not sign in with Facebook. Please try again.';
  }
}

export async function consumeInitialAuthUrl() {
  const url = await Linking.getInitialURL();
  if (!url) return null;
  return createSessionFromUrl(url);
}

function facebookCancelled() {
  return Object.assign(new Error('Sign in cancelled'), { code: FACEBOOK_CANCELLED });
}

function facebookErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return null;
}
