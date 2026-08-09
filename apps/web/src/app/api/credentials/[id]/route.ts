import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireOrgStaffById } from '@/lib/server/auth';
import { renameCredential, revokeCredential } from '@/lib/server/credentials';
import { renderCertificatePdf, CERT_ID_KEY, CERT_URL_KEY } from '@/lib/server/certificates';
import { appUrl } from '@/lib/server/appconfig';
import { supabaseAdmin } from '@/lib/supabase/server';
import type { CertificateTemplate } from '@gdf/shared';

const schema = z.object({
  action: z.enum(['revoke', 'set_visibility', 'rename']),
  is_public: z.boolean().optional(),
  name: z.string().min(2).max(200).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: credential } = await admin
    .from('credentials')
    .select('id, org_id, recipient_user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!credential) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.action === 'revoke') {
    const ctx = await requireOrgStaffById(credential.org_id);
    if (!ctx) return NextResponse.json({ error: 'Only the issuing organization can revoke' }, { status: 403 });
    await revokeCredential(admin, credential.id, credential.org_id);
    return NextResponse.json({ ok: true, status: 'revoked' });
  }

  if (parsed.data.action === 'rename') {
    // Name correction by the claimed recipient: re-sign, then re-render the PDF
    // so the downloadable certificate shows the corrected name too.
    const session = await getSession();
    if (!session || session.userId !== credential.recipient_user_id) {
      return NextResponse.json({ error: 'Only the credential holder can fix the name' }, { status: 403 });
    }
    if (!parsed.data.name) return NextResponse.json({ error: 'Enter the corrected name' }, { status: 400 });
    try {
      const { verification_code } = await renameCredential(admin, credential.id, session.userId, parsed.data.name);
      const { data: full } = await admin
        .from('credentials')
        .select('type, template_id, fields_json, org_id')
        .eq('id', credential.id)
        .single();
      if (full?.type === 'certificate') {
        const [{ data: template }, { data: org }] = await Promise.all([
          admin.from('certificate_templates').select('background_url, layout_json, page_size').eq('id', full.template_id).maybeSingle(),
          admin.from('organizations').select('slug').eq('id', full.org_id).single(),
        ]);
        if (template && org) {
          const origin = await appUrl();
          const values: Record<string, string> = {
            ...(full.fields_json as Record<string, string>),
            [CERT_ID_KEY]: verification_code,
            [CERT_URL_KEY]: `${origin.replace(/^https?:\/\//, '')}/verify/${verification_code}`,
          };
          const pdf = await renderCertificatePdf(
            {
              background_url: template.background_url,
              layout_json: template.layout_json as CertificateTemplate['layout_json'],
              page_size: template.page_size as CertificateTemplate['page_size'],
            },
            values,
          );
          await admin.storage
            .from('certs')
            .upload(`${org.slug}/${verification_code}.pdf`, Buffer.from(pdf), { contentType: 'application/pdf', upsert: true });
        }
      }
      return NextResponse.json({ ok: true, name: parsed.data.name.trim() });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  // set_visibility: only the recipient controls whether it appears on their public profile
  const session = await getSession();
  if (!session || session.userId !== credential.recipient_user_id) {
    return NextResponse.json({ error: 'Only the credential holder can change visibility' }, { status: 403 });
  }
  const { error } = await admin
    .from('credentials')
    .update({ is_public: parsed.data.is_public ?? false })
    .eq('id', credential.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, is_public: parsed.data.is_public ?? false });
}
