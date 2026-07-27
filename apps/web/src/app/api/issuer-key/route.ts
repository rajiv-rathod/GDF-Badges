import { NextResponse } from 'next/server';
import { getSigningPublicKey } from '@/lib/server/signing';

/** Publishes the issuer's Ed25519 public key (SPKI DER, base64) for independent verification. */
export async function GET() {
  try {
    const publicKey = await getSigningPublicKey();
    return NextResponse.json({
      keyType: 'Ed25519',
      format: 'spki-der-base64',
      publicKey,
      controller: 'Global Diplomacy Forum — MUN CertView',
    });
  } catch {
    return NextResponse.json({ error: 'Issuer key unavailable' }, { status: 503 });
  }
}
