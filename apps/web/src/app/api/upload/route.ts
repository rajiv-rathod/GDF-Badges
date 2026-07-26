import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireOrgStaffById } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

/** Upload a certificate background (PNG/JPG) to the public assets bucket. */
export async function POST(request: Request) {
  const form = await request.formData();
  const orgId = String(form.get('org_id') ?? '');
  const file = form.get('file');
  if (!orgId || !(file instanceof File)) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    return NextResponse.json({ error: 'Use a PNG or JPG background image' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Max background size is 8 MB' }, { status: 400 });

  const ctx = await requireOrgStaffById(orgId);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = supabaseAdmin();
  const ext = file.type === 'image/png' ? 'png' : 'jpg';
  const path = `${ctx.org.slug}/backgrounds/${randomUUID()}.${ext}`;
  const { error } = await admin.storage
    .from('assets')
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data } = admin.storage.from('assets').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
