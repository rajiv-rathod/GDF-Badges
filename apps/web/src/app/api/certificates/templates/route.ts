import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const fieldSchema = z.object({
  key: z.string().min(1).max(60),
  label: z.string().max(120).default(''),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  font: z.string().max(60).default('Helvetica'),
  size: z.number().min(6).max(120),
  weight: z.number().min(100).max(900).default(400),
  align: z.enum(['left', 'center', 'right']).default('left'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#06002e'),
  sample: z.string().max(200).default(''),
});

const schema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  background_url: z.string().default(''),
  layout_json: z.array(fieldSchema).max(40),
  page_size: z.enum(['A4-landscape', 'A4-portrait', 'letter-landscape', 'letter-portrait']),
});

/** Create or update a certificate template (fully-custom, per org). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid template' }, { status: 400 });

  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = supabaseAdmin();
  const row = {
    org_id: ctx.org.id,
    name: parsed.data.name,
    background_url: parsed.data.background_url,
    layout_json: parsed.data.layout_json,
    page_size: parsed.data.page_size,
    created_by: ctx.session.userId,
  };

  if (parsed.data.id) {
    const { data, error } = await admin
      .from('certificate_templates')
      .update(row)
      .eq('id', parsed.data.id)
      .eq('org_id', ctx.org.id)
      .select('id')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.id });
  }
  const { data, error } = await admin.from('certificate_templates').insert(row).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
