'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Reads Supabase settings from runtime config injected by the root layout
 * (window.__GDF__), falling back to build-time NEXT_PUBLIC_ vars for local dev.
 * The runtime path means the browser client works no matter which env-var
 * names the deployment uses — nothing has to be inlined at build time.
 */
declare global {
  interface Window {
    __GDF__?: { url: string; anonKey: string };
  }
}

export function supabaseBrowser() {
  const rt = typeof window !== 'undefined' ? window.__GDF__ : undefined;
  const url = rt?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = rt?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase is not configured for this deployment.');
  return createBrowserClient(url, anonKey);
}
