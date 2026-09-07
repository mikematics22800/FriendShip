import type { UserCredential as NativeUserCredential } from '@react-native-firebase/auth';
import type { UserCredential as WebUserCredential } from 'firebase/auth';
import { Platform } from 'react-native';

export { GOOGLE_WEB_CLIENT_ID } from '@/lib/google-client-id';

export type GoogleUserCredential = NativeUserCredential | WebUserCredential;

let configured = false;

function nativeAuth() {
  return require('@react-native-firebase/auth') as typeof import('@react-native-firebase/auth');
}

function nativeGoogle() {
  return require('react-native-nitro-google-signin') as typeof import('react-native-nitro-google-signin');
}

function webAuth() {
  return require('firebase/auth') as typeof import('firebase/auth');
}

function webFirebase() {
  return require('@/lib/firebase') as typeof import('@/lib/firebase');
}

function webTokens() {
  return require('@/lib/google-token') as typeof import('@/lib/google-token');
}

/**
 * `autoDetect` resolves the web client id from google-services.json on Android and
 * the plist on iOS, so no client id is hardcoded here.
 */
export function configureGoogleSignIn() {
  if (Platform.OS === 'web' || configured) return;

  nativeGoogle().GoogleOneTapSignIn.configure({ webClientId: 'autoDetect' });
  configured = true;
}

/** Completes Firebase sign-in from a Google Identity Services ID token. */
export function signInWithGoogleIdToken(idToken: string): Promise<GoogleUserCredential> {
  const { GoogleAuthProvider, signInWithCredential } = webAuth();
  return signInWithCredential(webFirebase().getFirebaseAuth(), GoogleAuthProvider.credential(idToken));
}

/**
 * Custom-button sign-in: silent restore, then the account picker, then the
 * explicit Sign in with Google UI. Cancelled sheets throw SIGN_IN_CANCELLED
 * so the login screen stays quiet. Web uses a Firebase popup.
 */
export async function signInWithGoogle(): Promise<GoogleUserCredential> {
  return Platform.OS === 'web' ? signInWithGoogleScopes([]) : signInWithGoogleNative();
}

async function signInWithGoogleNative(): Promise<GoogleUserCredential> {
  const {
    GoogleOneTapSignIn,
    GoogleSignInError,
    isCancelledResponse,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
    statusCodes,
  } = nativeGoogle();
  const { GoogleAuthProvider, getAuth, signInWithCredential } = nativeAuth();

  configureGoogleSignIn();
  await GoogleOneTapSignIn.checkPlayServices();

  let response = await GoogleOneTapSignIn.signIn();
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.createAccount();
  }
  if (isNoSavedCredentialFoundResponse(response)) {
    response = await GoogleOneTapSignIn.presentExplicitSignIn();
  }

  if (isCancelledResponse(response)) {
    throw new GoogleSignInError(statusCodes.SIGN_IN_CANCELLED, 'Sign in cancelled');
  }

  if (!isSuccessResponse(response)) {
    throw new Error('Could not sign in with Google.');
  }

  return signInWithCredential(getAuth(), GoogleAuthProvider.credential(response.data.idToken));
}

export async function signInWithGoogleScopes(scopes: string[]): Promise<GoogleUserCredential> {
  const { GoogleAuthProvider, signInWithPopup } = webAuth();
  const provider = new GoogleAuthProvider();
  for (const scope of scopes) {
    provider.addScope(scope);
  }

  const result = await signInWithPopup(webFirebase().getFirebaseAuth(), provider);
  webTokens().rememberGoogleAccess(GoogleAuthProvider.credentialFromResult(result)?.accessToken, scopes);
  return result;
}

export async function requestGoogleScopes(scopes: string[]): Promise<boolean> {
  if (Platform.OS === 'web') {
    const result = await signInWithGoogleScopes(scopes);
    return Boolean(webAuth().GoogleAuthProvider.credentialFromResult(result)?.accessToken);
  }

  const { accessToken } = await nativeGoogle().GoogleOneTapSignIn.requestScopes(scopes);
  return accessToken !== null;
}

/** Clears the Google session and the Firebase session. */
export async function signOutOfGoogle() {
  if (Platform.OS === 'web') {
    webTokens().clearGoogleAccess();
    await webAuth().signOut(webFirebase().getFirebaseAuth());
    return;
  }

  try {
    await nativeGoogle().GoogleOneTapSignIn.signOut();
  } catch {
    // Firebase is the source of truth for routing, so clear it even if the
    // native session was already gone.
  }

  const { getAuth, signOut } = nativeAuth();
  await signOut(getAuth());
}

/** Returns null when the user simply dismissed the sheet, so callers show nothing. */
export function describeGoogleSignInError(error: unknown): string | null {
  const code = googleErrorCode(error);

  switch (code) {
    case nativeStatusCode('SIGN_IN_CANCELLED'):
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case nativeStatusCode('PLAY_SERVICES_NOT_AVAILABLE'):
      return 'Update Google Play Services to continue.';
    case nativeStatusCode('SIGN_IN_REQUIRED'):
      return 'Sign in with Google to continue.';
    case nativeStatusCode('IN_PROGRESS'):
      return 'A sign-in is already in progress.';
    case nativeStatusCode('DEVELOPER_ERROR'):
      return 'Google Sign-In is misconfigured for this build. Check the OAuth client ID and SHA-1 fingerprint.';
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered with a different sign-in method.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Google sign-in is not enabled for this Firebase project.';
    case 'auth/invalid-credential':
      return 'Google sign-in could not be verified. Check the OAuth web client ID.';
    default:
      return 'Could not sign in with Google. Please try again.';
  }
}

function googleErrorCode(error: unknown): string | null {
  if (Platform.OS !== 'web') {
    const { isErrorWithCode } = nativeGoogle();
    if (isErrorWithCode(error)) {
      return error.code as string;
    }
  }

  return typeof error === 'object' && error && 'code' in error && typeof error.code === 'string'
    ? error.code
    : null;
}

function nativeStatusCode(
  name: 'SIGN_IN_CANCELLED' | 'PLAY_SERVICES_NOT_AVAILABLE' | 'SIGN_IN_REQUIRED' | 'IN_PROGRESS' | 'DEVELOPER_ERROR',
): string {
  if (Platform.OS === 'web') {
    return `__native_${name}`;
  }

  return nativeGoogle().statusCodes[name];
}
