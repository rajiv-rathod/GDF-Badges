import { createSupabaseClient, isSupabaseConfigured } from '@gdf/shared';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = isSupabaseConfigured(url, anonKey);

/** Browser/client Supabase instance. Throws if env vars are missing — see .env.example. */
export function getSupabase() {
  return createSupabaseClient(url, anonKey);
}
