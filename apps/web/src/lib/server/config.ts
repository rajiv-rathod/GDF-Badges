/**
 * Central resolution of Supabase connection settings. Accepts several env-var
 * names so the app runs whether they're set with Next's NEXT_PUBLIC_ names or
 * Supabase's default names (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY /
 * SUPABASE_SECRET_KEY) — no re-entry needed after connecting Supabase to Vercel.
 */
const first = (...names: string[]): string | undefined => {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  return undefined;
};

export const supabaseUrl = () => first('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');

export const supabaseAnonKey = () =>
  first('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY');

export const supabaseServiceKey = () =>
  first('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY');

/** Optional pinned signing key; when absent the app auto-manages one in the DB. */
export const signingKeyEnv = () => first('CREDENTIAL_SIGNING_KEY');

export const publicConfig = () => ({ url: supabaseUrl() ?? '', anonKey: supabaseAnonKey() ?? '' });

export const supabaseConfigured = () => Boolean(supabaseUrl() && supabaseAnonKey());
