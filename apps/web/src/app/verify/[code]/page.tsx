import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { Card, EmptyState } from '@/components/ui';
import { type CanonicalCredential, verifyCredentialSignature } from '@gdf/shared/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data } = await supabaseAdmin().rpc('get_credential_by_code', { p_code: code });

  if (!data) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-3xl px-6 py-20">
          <EmptyState
            title="Credential not found"
            body="This verification code does not match any credential. Check the link — codes are case-sensitive."
          />
        </main>
      </>
    );
  }

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
  const signatureValid = verifyCredentialSignature(
    canonical,
    data.signature,
    process.env.NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY ?? '',
  );
  const revoked = data.status === 'revoked';
  const authentic = signatureValid && !revoked;

  return (
    <>
      <AppNav />
      <main className="relative min-h-screen">
        <div className="gdf-globe-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-3xl px-6 py-14">
          <div
            className={`rounded-lg border-2 p-5 text-center font-display text-lg font-bold ${
              revoked
                ? 'border-danger bg-danger/10 text-danger'
                : authentic
                  ? 'border-success bg-success/10 text-success'
                  : 'border-danger bg-danger/10 text-danger'
            }`}
          >
            {revoked
              ? '✕ REVOKED — this credential has been revoked by the issuer'
              : authentic
                ? '✓ VERIFIED — authentic credential, signature valid'
                : '✕ SIGNATURE INVALID — this credential could not be verified'}
          </div>

          <Card className="mt-6">
            <p className="text-xs uppercase tracking-[0.25em] text-accent">{data.type}</p>
            <h1 className="mt-2 font-display text-3xl font-bold">{data.template_name}</h1>
            <p className="mt-1 text-muted">{data.event_name}</p>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Awarded to</dt>
                <dd className="mt-1 font-display text-lg font-semibold">{data.recipient_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Issued by</dt>
                <dd className="mt-1 font-display text-lg font-semibold">{data.org_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Issued on</dt>
                <dd className="mt-1">{new Date(data.issued_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted">Verification code</dt>
                <dd className="mt-1 break-all font-mono text-sm">{data.verification_code}</dd>
              </div>
            </dl>

            {Object.keys(data.fields_json ?? {}).length > 0 ? (
              <div className="mt-6 border-t border-border pt-4">
                {Object.entries(data.fields_json as Record<string, string>)
                  .filter(([k]) => k !== 'recipient_name')
                  .map(([k, v]) => (
                    <p key={k} className="text-sm">
                      <span className="text-muted">{k.replace(/_/g, ' ')}: </span>
                      {v}
                    </p>
                  ))}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4 text-sm">
              {data.asset_url ? (
                <a className="font-semibold text-accent hover:underline" href={data.asset_url} target="_blank" rel="noreferrer">
                  View certificate PDF
                </a>
              ) : null}
              <Link className="font-semibold text-accent hover:underline" href={`/api/verify/${code}?format=ob3`}>
                Open Badges 3.0 JSON
              </Link>
            </div>
          </Card>

          <p className="mt-6 text-center text-xs text-muted">
            Verified cryptographically (Ed25519) against the issuer&apos;s published key · MUN CertView, powered by GDF
          </p>
        </div>
      </main>
    </>
  );
}
