import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireOrgStaffById } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Organizer branding: logo + accent color, stored in
 * organizations.brand_overrides (jsonb). Logo upload is multipart; color/text
 * updates are JSON. No schema change needed.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const admin = supabaseAdmin();

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const orgId = String(form.get('org_id') ?? '');
    const file = form.get('file');
    const ctx = await requireOrgStaffById(orgId);
    if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      return NextResponse.json({ error: 'Upload a PNG, JPG, or SVG logo' }, { status: 400 });
    }
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Max logo size is 4 MB' }, { status: 400 });
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/svg+xml' ? 'svg' : 'jpg';
    const path = `${ctx.org.slug}/branding/${randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from('assets')
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const { data } = admin.storage.from('assets').getPublicUrl(path);
    const { data: org } = await admin.from('organizations').select('brand_overrides').eq('id', ctx.org.id).single();
    const brand = { ...(org?.brand_overrides ?? {}), logo_url: data.publicUrl };
    await admin.from('organizations').update({ brand_overrides: brand }).eq('id', ctx.org.id);
    return NextResponse.json({ logo_url: data.publicUrl });
  }

  const schema = z.object({
    org_id: z.string().uuid(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    tagline: z.string().max(200).optional(),
  });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const { data: org } = await admin.from('organizations').select('brand_overrides').eq('id', ctx.org.id).single();
  const brand = { ...(org?.brand_overrides ?? {}) };
  if (parsed.data.accent) brand.accent = parsed.data.accent;
  if (parsed.data.tagline !== undefined) brand.tagline = parsed.data.tagline;
  await admin.from('organizations').update({ brand_overrides: brand }).eq('id', ctx.org.id);
  return NextResponse.json({ ok: true });
}
