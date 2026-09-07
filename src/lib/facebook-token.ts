import { supabase } from '@/lib/supabase';

/** Facebook Graph token from the latest Supabase OAuth session, when present. */
export async function getFacebookAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token ?? null;
}
