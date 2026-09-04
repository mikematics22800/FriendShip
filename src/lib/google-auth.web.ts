import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut as signOutOfFirebase,
  type UserCredential,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase.web';
import { clearGoogleAccess, rememberGoogleAccess } from '@/lib/google-token.web';

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID ??
  process.env.google_auth_web_client_id ??
  '474367110848-o1glgpnqq4ofrgbq2vpjordj7737tp2h.apps.googleusercontent.com';

export function configureGoogleSignIn() {
  // Web uses Google Identity Services + Firebase; there is no native client to configure.
}

/** Completes Firebase sign-in from a Google Identity Services ID token. */
export function signInWithGoogleIdToken(idToken: string): Promise<UserCredential> {
  return signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(idToken));
}

export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithGoogleScopes([]);
}

export async function signInWithGoogleScopes(scopes: string[]): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  for (const scope of scopes) {
    provider.addScope(scope);
  }

  const result = await signInWithPopup(getFirebaseAuth(), provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  rememberGoogleAccess(credential?.accessToken, scopes);
  return result;
}

export async function requestGoogleScopes(scopes: string[]): Promise<boolean> {
  const result = await signInWithGoogleScopes(scopes);
  return Boolean(GoogleAuthProvider.credentialFromResult(result)?.accessToken);
}

export async function signOutOfGoogle() {
  clearGoogleAccess();
  await signOutOfFirebase(getFirebaseAuth());
}

export function describeGoogleSignInError(error: unknown): string | null {
  const code =
    typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered with a different sign-in method.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.';
    default:
      return 'Could not sign in with Google. Please try again.';
  }
}
