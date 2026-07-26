import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { renderCertificatePdf } from '@/lib/server/certificates';
import type { CertificateField, CertificateTemplate } from '@gdf/shared';

const schema = z.object({
  org_id: z.string().uuid(),
  background_url: z.string().default(''),
  layout_json: z.array(z.any()),
  page_size: z.enum(['A4-landscape', 'A4-portrait', 'letter-landscape', 'letter-portrait']),
  values: z.record(z.string()).default({}),
});

/** Renders a preview PDF (no credential is issued, nothing stored). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid preview request' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const pdf = await renderCertificatePdf(
    {
      background_url: parsed.data.background_url,
      layout_json: parsed.data.layout_json as CertificateField[],
      page_size: parsed.data.page_size as CertificateTemplate['page_size'],
    },
    parsed.data.values,
  );
  return new NextResponse(Buffer.from(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename=preview.pdf' },
  });
}
