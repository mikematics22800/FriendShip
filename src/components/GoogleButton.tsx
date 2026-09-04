import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export type GoogleSignInButtonProps = {
  busy: boolean;
  onPress: (idToken?: string) => void;
};

/** Official Google button: Identity Services on web, native SDK on iOS/Android. */
export function GoogleSignInButton(props: GoogleSignInButtonProps) {
  if (Platform.OS === 'web') {
    return <GoogleIdentityServicesButton {...props} />;
  }

  return <NativeGoogleSignInButton {...props} />;
}

function NativeGoogleSignInButton({ busy, onPress }: GoogleSignInButtonProps) {
  const { GoogleSignInButton: Button } =
    require('react-native-nitro-google-signin') as typeof import('react-native-nitro-google-signin');

  return (
    <Button
      colorScheme="light"
      size="wide"
      contentAlignment="center"
      signInBehavior="none"
      loading={busy}
      disabled={busy}
      style={{ alignSelf: 'center', width: '100%' }}
      onPress={onPress}
    />
  );
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
const GOOGLE_SANS_HREF =
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@500&display=swap';

/** Official Sign in with Google typeface: Google Sans Medium 14/20. */
function ensureOfficialGoogleButtonFont() {
  if (typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${GOOGLE_SANS_HREF}"]`)) return;

  const preconnect = (href: string, crossOrigin?: string) => {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    if (crossOrigin) link.crossOrigin = crossOrigin;
    document.head.appendChild(link);
  };

  preconnect('https://fonts.googleapis.com');
  preconnect('https://fonts.gstatic.com', 'anonymous');

  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = GOOGLE_SANS_HREF;
  document.head.appendChild(stylesheet);
}

type GoogleAccountsId = {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

function googleWebClientId() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_AUTH_WEB_CLIENT_ID ??
    process.env.google_auth_web_client_id ??
    '474367110848-o1glgpnqq4ofrgbq2vpjordj7737tp2h.apps.googleusercontent.com'
  );
}

function loadGsiClient(): Promise<GoogleAccountsId> {
  const existing = window.google?.accounts?.id;
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const settle = () => {
      const client = window.google?.accounts?.id;
      if (client) resolve(client);
      else reject(new Error('Google Sign-In failed to load.'));
    };

    const script =
      document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`) ?? document.createElement('script');

    script.addEventListener('load', settle, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Sign-In failed to load.')), { once: true });

    if (!script.src) {
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    } else if (window.google?.accounts?.id) {
      settle();
    }
  });
}

function GoogleIdentityServicesButton({ busy, onPress }: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    ensureOfficialGoogleButtonFont();

    const host = hostRef.current;
    const clientId = googleWebClientId();
    if (!host || !clientId) return;

    let cancelled = false;

    void loadGsiClient().then(client => {
      if (cancelled || !hostRef.current) return;

      client.initialize({
        client_id: clientId,
        callback: response => {
          onPressRef.current(response.credential);
        },
      });

      host.replaceChildren();
      client.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(400, Math.max(host.clientWidth || 400, 200)),
      });
    });

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} aria-busy={busy} style={{ pointerEvents: busy ? 'none' : 'auto' }} />;
}
