import { generateSigningKeyPair, publicKeyFromPrivate } from '@gdf/shared/server';
import { signingKeyEnv } from './config';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Resolves the Ed25519 signing key (PKCS#8 DER, base64).
 *
 * Preference order:
 *  1. CREDENTIAL_SIGNING_KEY env var (recommended for production — a DB
 *     compromise alone then can't forge signatures).
 *  2. A key stored in public.app_config, auto-generated once on first use.
 *     This makes the platform work with zero key configuration.
 *
 * The public key is always derived from the private key, so there is never a
 * separate public-key env var to keep in sync.
 */
let cachedPrivate: string | null = null;

export async function getSigningPrivateKey(): Promise<string> {
  if (cachedPrivate) return cachedPrivate;

  const envKey = signingKeyEnv();
  if (envKey) {
    cachedPrivate = envKey;
    return envKey;
  }

  const admin = supabaseAdmin();
  const { data } = await admin.from('app_config').select('value').eq('key', 'signing_key').maybeSingle();
  if (data?.value) {
    cachedPrivate = data.value;
    return data.value;
  }

  // First run with no env key: generate and persist one.
  const { privateKey } = generateSigningKeyPair();
  const { error } = await admin.from('app_config').insert({ key: 'signing_key', value: privateKey });
  if (error) {
    // A concurrent request may have inserted it first — re-read.
    const { data: again } = await admin.from('app_config').select('value').eq('key', 'signing_key').maybeSingle();
    if (again?.value) {
      cachedPrivate = again.value;
      return again.value;
    }
    throw new Error('Could not initialize signing key: ' + error.message);
  }
  cachedPrivate = privateKey;
  return privateKey;
}

export async function getSigningPublicKey(): Promise<string> {
  return publicKeyFromPrivate(await getSigningPrivateKey());
}
