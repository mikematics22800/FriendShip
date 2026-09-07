import '@/lib/install-auth-storage';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseKey);
}

function createAuthStorage(): SupportedStorage {
  const memory = new Map<string, string>();

  const persistentStore = (): Storage | null => {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
        return globalThis.localStorage;
      }
    } catch {
      // Node SSR and some native runtimes have no localStorage.
    }
    return null;
  };

  return {
    getItem: key => persistentStore()?.getItem(key) ?? memory.get(key) ?? null,
    setItem: (key, value) => {
      const store = persistentStore();
      if (store) {
        store.setItem(key, value);
        return;
      }
      memory.set(key, value);
    },
    removeItem: key => {
      const store = persistentStore();
      if (store) {
        store.removeItem(key);
        return;
      }
      memory.delete(key);
    },
  };
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'public-anon-key', {
  auth: {
    storage: createAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
