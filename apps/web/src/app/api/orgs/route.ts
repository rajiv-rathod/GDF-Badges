import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/server/auth';
import { verifyMyMunUrl } from '@/lib/server/mymun';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  name: z.string().min(2).max(120),
  mymun_url: z.string().min(4).max(400),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? 'Invalid details' }, { status: 400 });
  }

  // Identity gate: the conference must be listed on MyMUN. A valid link lets
  // the organizer proceed immediately — no manual approval.
  const check = await verifyMyMunUrl(parsed.data.mymun_url);
  if (!check.ok || !check.url) {
    return NextResponse.json({ error: check.error ?? 'Invalid MyMUN link' }, { status: 400 });
  }

  const base = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
  const slug = `${base || 'conference'}-${Math.random().toString(36).slice(2, 6)}`;

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('organizations')
    .insert({ name: parsed.data.name, slug, owner_id: session.userId, mymun_url: check.url })
    .select('id, name, slug')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ org: data });
}
