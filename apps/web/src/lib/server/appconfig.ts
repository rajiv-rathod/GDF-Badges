import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Server-side key/value settings stored in the RLS-locked app_config table
 * (service-role only). Used for secrets/config we don't want to depend on
 * Vercel env vars for: SMTP creds, admin email allow-list, canonical app URL,
 * editable landing-page content. Env vars still win when present.
 */
const cache = new Map<string, { v: string | null; at: number }>();
const TTL = 30_000;

export async function getAppConfig(key: string, envName?: string): Promise<string | null> {
  if (envName && process.env[envName]?.trim()) return process.env[envName]!.trim();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v;
  let v: string | null = null;
  try {
    const { data } = await supabaseAdmin().from('app_config').select('value').eq('key', key).maybeSingle();
    v = data?.value ?? null;
  } catch {
    v = null;
  }
  cache.set(key, { v, at: Date.now() });
  return v;
}

export async function setAppConfig(key: string, value: string): Promise<void> {
  await supabaseAdmin().from('app_config').upsert({ key, value });
  cache.set(key, { v: value, at: Date.now() });
}

/** Canonical public origin for links in emails etc. */
export async function appUrl(): Promise<string> {
  return (await getAppConfig('app_url', 'APP_URL')) ?? 'https://certview.gdf.social';
}
