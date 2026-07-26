import { NextResponse } from 'next/server';

/** Publishes the issuer's Ed25519 public key (SPKI DER, base64) for independent verification. */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY;
  if (!publicKey) return NextResponse.json({ error: 'Issuer key not configured' }, { status: 404 });
  return NextResponse.json({
    keyType: 'Ed25519',
    format: 'spki-der-base64',
    publicKey,
    controller: 'Global Diplomacy Forum — MUN CertView',
  });
}
