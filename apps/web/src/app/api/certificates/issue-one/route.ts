import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { renderCertificatePdf } from '@/lib/server/certificates';
import { issueCredential } from '@/lib/server/credentials';
import { sendCredentialEmail } from '@/lib/server/email';
import { appUrl } from '@/lib/server/appconfig';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { CertificateField, CertificateTemplate } from '@gdf/shared';

const schema = z.object({
  org_id: z.string().uuid(),
  template_id: z.string().uuid(),
  event_name: z.string().min(1).max(200),
  recipient_email: z.string().email(),
  recipient_name: z.string().min(1).max(200),
  values: z.record(z.string()).default({}),
});

/**
 * Renders + issues ONE certificate. The bulk UI calls this per row so it can
 * show real progress — which also keeps peak memory tiny on a 1 GB host.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, 'cert-issue'), 600, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: template } = await admin
    .from('certificate_templates')
    .select('id, org_id, background_url, layout_json, page_size')
    .eq('id', parsed.data.template_id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();
  if (!template) return NextResponse.json({ error: 'Unknown certificate template' }, { status: 400 });

  const values = { ...parsed.data.values, recipient_name: parsed.data.recipient_name };
  const pdf = await renderCertificatePdf(
    {
      background_url: template.background_url,
      layout_json: template.layout_json as CertificateField[],
      page_size: template.page_size as CertificateTemplate['page_size'],
    },
    values,
  );

  const issued = await issueCredential(admin, {
    type: 'certificate',
    orgId: ctx.org.id,
    templateId: template.id,
    recipientEmail: parsed.data.recipient_email,
    recipientName: parsed.data.recipient_name,
    fields: values,
    eventName: parsed.data.event_name,
    issuedBy: ctx.session.userId,
  });

  const path = `${ctx.org.slug}/${issued.verification_code}.pdf`;
  let assetUrl: string | null = null;
  const { error: uploadError } = await admin.storage
    .from('certs')
    .upload(path, Buffer.from(pdf), { contentType: 'application/pdf', upsert: true });
  if (!uploadError) {
    const { data } = admin.storage.from('certs').getPublicUrl(path);
    assetUrl = data.publicUrl;
    await admin.from('credentials').update({ asset_url: assetUrl }).eq('id', issued.id);
  }

  const origin = await appUrl();
  const { data: templateName } = await admin
    .from('certificate_templates')
    .select('name')
    .eq('id', template.id)
    .single();
  // Best-effort notification — never fails the issuance.
  void sendCredentialEmail({
    to: issued.recipient_email,
    recipientName: parsed.data.recipient_name,
    templateName: templateName?.name ?? 'Certificate',
    eventName: parsed.data.event_name,
    orgName: ctx.org.name,
    certificateId: issued.verification_code,
    verifyUrl: `${origin}/verify/${issued.verification_code}`,
    claimUrl: `${origin}/signup`,
    assetUrl,
    alreadyClaimed: issued.status === 'claimed',
  });

  return NextResponse.json({
    id: issued.id,
    verification_code: issued.verification_code,
    recipient_email: issued.recipient_email,
    asset_stored: !uploadError,
  });
}
