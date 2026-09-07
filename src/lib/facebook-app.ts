/**
 * Public Meta / Facebook Login values.
 *
 * App Secret stays in the Supabase dashboard only — never ship it in the
 * client. `EXPO_PUBLIC_*` values are inlined at bundle time.
 *
 * Meta dashboard:
 * - Add Facebook Login and request public_profile, email, user_birthday
 * - Valid OAuth Redirect URI:
 *   https://<project-ref>.supabase.co/auth/v1/callback
 * - iOS bundle id / Android package: com.mikematics.friendship
 * - Enable Facebook in Supabase Auth and paste App ID + App Secret there
 * - user_birthday needs App Review before release; testers work in Development
 */
export const META_GRAPH_VERSION = process.env.EXPO_PUBLIC_META_GRAPH_VERSION ?? 'v26.0';
export const META_GRAPH_BASE_URL = process.env.EXPO_PUBLIC_META_GRAPH_BASE_URL ?? 'https://graph.facebook.com';

const FACEBOOK_PERMISSIONS = process.env.EXPO_PUBLIC_FACEBOOK_PERMISSIONS ?? 'public_profile,email,user_birthday';

export const FACEBOOK_LOGIN_PERMISSIONS = FACEBOOK_PERMISSIONS.split(',')
  .map(permission => permission.trim())
  .filter(Boolean);
