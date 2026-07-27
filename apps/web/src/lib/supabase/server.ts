import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseServiceKey, supabaseUrl } from '@/lib/server/config';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export const supabaseConfigured = Boolean(supabaseUrl() && supabaseAnonKey());

/** Cookie-bound client for server components and route handlers (RLS applies). */
export async function supabaseServer(): Promise<SupabaseClient> {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) throw new Error('Supabase env vars missing — see apps/web/.env.example');
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list: CookieToSet[]) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component — middleware refreshes sessions instead
        }
      },
    },
  });
}

/** Service-role client for trusted server writes (issuance, rendering, revocation). */
export function supabaseAdmin(): SupabaseClient {
  const url = supabaseUrl();
  const serviceKey = supabaseServiceKey();
  if (!url || !serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY missing');
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
