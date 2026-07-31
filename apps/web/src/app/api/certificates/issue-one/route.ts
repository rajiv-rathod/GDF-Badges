import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { renderCertificatePdf, CERT_ID_KEY, CERT_URL_KEY } from '@/lib/server/certificates';
import { issueCredential } from '@/lib/server/credentials';
import { sendCredentialEmail } from '@/lib/server/email';
import { appUrl } from '@/lib/server/appconfig';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { CertificateTemplate } from '@gdf/shared';

const schema = z.object({
  org_id: z.string().uuid(),
  template_id: z.string().uuid(),
  event_name: z.string().min(1).max(200),
  recipient_email: z.string().email(),
  recipient_name: z.string().min(1).max(200),
  values: z.record(z.string()).default({}),
  skills: z.array(z.string().max(60)).max(20).optional(),
  evidence: z.string().max(2000).optional(),
  expires: z.string().max(40).optional(),
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

  // Render uses only the visual field values; skills/evidence/expiry are
  // credential metadata folded into the signed fields (not drawn on the PDF).
  const renderValues: Record<string, string> = { ...parsed.data.values, recipient_name: parsed.data.recipient_name };
  const skills = (parsed.data.skills ?? []).map((s) => s.trim()).filter(Boolean);
  const values: Record<string, string> = { ...renderValues };
  if (skills.length) values.skills = skills.join(', ');
  if (parsed.data.evidence?.trim()) values.evidence = parsed.data.evidence.trim();
  if (parsed.data.expires?.trim()) values.expires = parsed.data.expires.trim();

  // Issue FIRST so the credential's verification_code exists, then render with
  // the reserved keys — the printed Certificate ID always matches the verify URL.
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

  const origin = await appUrl();
  renderValues[CERT_ID_KEY] = issued.verification_code;
  renderValues[CERT_URL_KEY] = `${origin.replace(/^https?:\/\//, '')}/verify/${issued.verification_code}`;

  const pdf = await renderCertificatePdf(
    {
      background_url: template.background_url,
      layout_json: template.layout_json as CertificateTemplate['layout_json'],
      page_size: template.page_size as CertificateTemplate['page_size'],
    },
    renderValues,
  );

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
