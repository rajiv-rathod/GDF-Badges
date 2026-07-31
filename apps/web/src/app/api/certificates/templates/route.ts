import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

// A colour is a 6-digit hex, or the sentinels 'none' / '' (transparent fill,
// e.g. an outline-only frame). Presets and the "None" fill button use these.
const hex = z.union([z.string().regex(/^#[0-9a-fA-F]{6}$/), z.literal('none'), z.literal('')]);

// Canva-style mixed elements: text/data fields, static text, images, shapes,
// lines and the verification stamp. Fields are optional per-kind; the renderer
// applies sensible defaults, so we validate a permissive superset with bounds.
const elementSchema = z
  .object({
    id: z.string().max(80).optional(),
    type: z.enum(['field', 'text', 'image', 'rect', 'ellipse', 'line', 'verification']).optional(),
    x: z.number().min(-20).max(120),
    y: z.number().min(-20).max(120),
    width: z.number().min(0).max(200),
    height: z.number().min(0).max(200).optional(),
    key: z.string().max(60).optional(),
    label: z.string().max(120).optional(),
    text: z.string().max(400).optional(),
    font: z.string().max(60).optional(),
    size: z.number().min(4).max(200).optional(),
    weight: z.number().min(100).max(900).optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    color: hex.optional(),
    fill: hex.optional(),
    stroke: hex.optional(),
    strokeWidth: z.number().min(0).max(40).optional(),
    opacity: z.number().min(0).max(1).optional(),
    thickness: z.number().min(0).max(40).optional(),
    sample: z.string().max(200).optional(),
    vmode: z.enum(['id', 'url', 'both']).optional(),
    url: z.string().max(1000).optional(),
  })
  .passthrough();

const schema = z.object({
  id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  background_url: z.string().default(''),
  layout_json: z.array(elementSchema).max(80),
  page_size: z.enum(['A4-landscape', 'A4-portrait', 'letter-landscape', 'letter-portrait']),
});

/** Create or update a certificate template (fully-custom, per org). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    const where = i?.path?.length ? ` (${i.path.join('.')})` : '';
    return NextResponse.json({ error: `${i?.message ?? 'Invalid template'}${where}` }, { status: 400 });
  }

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
