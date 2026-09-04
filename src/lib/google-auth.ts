import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as signOutOfFirebase,
  type UserCredential,
} from '@react-native-firebase/auth';
import {
  GoogleOneTapSignIn,
  GoogleSignInError,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
  type OneTapResponse,
  type OneTapSuccessData,
} from 'react-native-nitro-google-signin';

let configured = false;

/**
 * `autoDetect` resolves the web client id from google-services.json on Android and
 * the plist on iOS, so no client id is hardcoded here.
 */
export function configureGoogleSignIn() {
  if (configured) return;

  GoogleOneTapSignIn.configure({ webClientId: 'autoDetect' });
  configured = true;
}

/** Trades the Google ID token from a native sign-in for a Firebase session. */
export function signInToFirebase(data: OneTapSuccessData): Promise<UserCredential> {
  return signInWithCredential(getAuth(), GoogleAuthProvider.credential(data.idToken));
}

/**
 * Custom-button sign-in: silent restore, then the account picker, then the
 * explicit Sign in with Google UI. Cancelled sheets throw SIGN_IN_CANCELLED
 * so the login screen stays quiet.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  configureGoogleSignIn();
  await GoogleOneTapSignIn.checkPlayServices();

  let response: OneTapResponse = await GoogleOneTapSignIn.signIn();
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

  return signInToFirebase(response.data);
}

/** Clears both the native Google session and the Firebase session. */
export async function signOutOfGoogle() {
  try {
    await GoogleOneTapSignIn.signOut();
  } catch {
    // Firebase is the source of truth for routing, so clear it even if the
    // native session was already gone.
  }
  await signOutOfFirebase(getAuth());
}

/** Returns null when the user simply dismissed the sheet, so callers show nothing. */
export function describeGoogleSignInError(error: unknown): string | null {
  const code = isErrorWithCode(error) ? (error.code as string) : null;

  switch (code) {
    case statusCodes.SIGN_IN_CANCELLED:
      return null;
    case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
      return 'Update Google Play Services to continue.';
    case statusCodes.SIGN_IN_REQUIRED:
      return 'Sign in with Google to continue.';
    case statusCodes.IN_PROGRESS:
      return 'A sign-in is already in progress.';
    case statusCodes.DEVELOPER_ERROR:
      return 'Google Sign-In is misconfigured for this build. Check the OAuth client ID and SHA-1 fingerprint.';
    case 'auth/account-exists-with-different-credential':
      return 'That email is already registered with a different sign-in method.';
    case 'auth/network-request-failed':
      return 'No connection. Check your network and try again.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Could not sign in with Google. Please try again.';
  }
}
