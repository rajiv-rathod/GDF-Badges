import { NextResponse } from 'next/server';
import { buildOpenBadgeCredential, type CanonicalCredential, verifyCredentialSignature } from '@gdf/shared/server';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Public verification API. Returns the credential's status + signature check;
 * append ?format=ob3 for the Open Badges 3.0 verifiable-credential JSON.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!rateLimit(clientKey(request, 'verify'), 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const { code } = await params;
  const admin = supabaseAdmin();
  const { data, error } = await admin.rpc('get_credential_by_code', { p_code: code });
  // A backend failure must never read as "this credential does not exist".
  if (error) return NextResponse.json({ error: 'Verification temporarily unavailable' }, { status: 503 });
  if (!data) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });

  const canonical: CanonicalCredential = {
    id: data.id,
    type: data.type,
    org_id: data.org_id,
    template_id: data.template_id,
    recipient_email: data.recipient_email,
    recipient_name: data.recipient_name,
    fields_json: data.fields_json ?? {},
    event_name: data.event_name,
    issued_at: data.issued_at,
    verification_code: data.verification_code,
  };
  const publicKey = process.env.NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY ?? '';
  const keyConfigured = publicKey.length > 0;
  const signatureValid = keyConfigured && verifyCredentialSignature(canonical, data.signature, publicKey);

  const url = new URL(request.url);
  if (url.searchParams.get('format') === 'ob3') {
    return NextResponse.json(
      buildOpenBadgeCredential({
        credential: canonical,
        status: data.status,
        orgName: data.org_name,
        orgSlug: data.org_slug,
        templateName: data.template_name,
        signature: data.signature,
        publicKeyB64: publicKey,
        baseUrl: url.origin,
      }),
    );
  }

  return NextResponse.json({
    status: data.status,
    signature_valid: signatureValid,
    signature_check: keyConfigured ? (signatureValid ? 'valid' : 'invalid') : 'unavailable',
    type: data.type,
    recipient_name: data.recipient_name,
    template_name: data.template_name,
    event_name: data.event_name,
    issued_at: data.issued_at,
    org_name: data.org_name,
    asset_url: data.asset_url,
    ob3_url: `${url.origin}/api/verify/${code}?format=ob3`,
  });
}
