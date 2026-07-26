import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({ name: z.string().min(2).max(120) });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid name' }, { status: 400 });

  const base = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);
  const slug = `${base || 'conference'}-${Math.random().toString(36).slice(2, 6)}`;

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from('organizations')
    .insert({ name: parsed.data.name, slug, owner_id: session.userId })
    .select('id, name, slug')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ org: data });
}
