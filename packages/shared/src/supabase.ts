import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase client factory. Each app passes its own env values:
 * - web:    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - mobile: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * Server-only keys (service role) never go through this factory — server logic
 * lives in Supabase Edge Functions or Next.js route handlers.
 */
export function createSupabaseClient(url: string | undefined, anonKey: string | undefined): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Copy the app\'s .env.example and fill in your project URL and anon key.',
    );
  }
  return createClient(url, anonKey);
}

export function isSupabaseConfigured(url: string | undefined, anonKey: string | undefined): boolean {
  return Boolean(url && anonKey);
}
