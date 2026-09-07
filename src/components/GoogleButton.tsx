import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { GOOGLE_WEB_CLIENT_ID } from '@/lib/google-client-id';

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
    <View style={{ width: '100%' }}>
      <Button
        colorScheme="light"
        size="wide"
        contentAlignment="center"
        signInBehavior="none"
        loading={busy}
        disabled={busy}
        onPress={onPress}
      />
    </View>
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
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    /** Chrome uses FedCM instead of a popup postMessage, which COOP would block. */
    use_fedcm_for_button?: boolean;
  }) => void;
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
  return GOOGLE_WEB_CLIENT_ID;
}

let gsiInit: Promise<GoogleAccountsId> | null = null;
let gsiClientId: string | null = null;
let onGoogleCredential: ((idToken: string) => void) | null = null;

function loadGsiClient(): Promise<GoogleAccountsId> {
  const clientId = googleWebClientId();
  if (gsiInit && gsiClientId === clientId) return gsiInit;
  gsiClientId = clientId;

  gsiInit = new Promise((resolve, reject) => {
    const settle = () => {
      const client = window.google?.accounts?.id;
      if (!client) {
        reject(new Error('Google Sign-In failed to load.'));
        return;
      }

      client.initialize({
        client_id: googleWebClientId(),
        use_fedcm_for_button: true,
        callback: response => {
          if (response.credential) onGoogleCredential?.(response.credential);
        },
      });
      resolve(client);
    };

    const existing = window.google?.accounts?.id;
    if (existing) {
      settle();
      return;
    }

    const script =
      document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`) ?? document.createElement('script');

    script.addEventListener('load', settle, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Sign-In failed to load.')), { once: true });

    if (!script.src) {
      script.src = GSI_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return gsiInit;
}

function buttonWidthForHost(host: HTMLElement) {
  return Math.round(host.getBoundingClientRect().width);
}

function GoogleIdentityServicesButton({ busy, onPress }: GoogleSignInButtonProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  useEffect(() => {
    onGoogleCredential = idToken => onPressRef.current(idToken);
    ensureOfficialGoogleButtonFont();

    const host = hostRef.current;
    if (!host || !googleWebClientId()) return;

    let cancelled = false;
    let client: GoogleAccountsId | undefined;
    let lastWidth = 0;

    const render = () => {
      if (cancelled || !client || !hostRef.current) return;

      const width = buttonWidthForHost(hostRef.current);
      if (width < 1 || width === lastWidth) return;

      lastWidth = width;
      hostRef.current.replaceChildren();
      client.renderButton(hostRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width,
      });
    };

    void loadGsiClient().then(gsi => {
      if (cancelled || !hostRef.current) return;

      client = gsi;
      render();
    });

    const observer = new ResizeObserver(render);
    observer.observe(host);

    return () => {
      cancelled = true;
      observer.disconnect();
      host.replaceChildren();
    };
  }, []);

  return (
    <View style={{ width: '100%', maxWidth: '100%' }}>
      <div
        ref={hostRef}
        aria-busy={busy}
        style={{ width: '100%', maxWidth: '100%', pointerEvents: busy ? 'none' : 'auto' }}
      />
    </View>
  );
}
