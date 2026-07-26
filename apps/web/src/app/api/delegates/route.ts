import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  org_id: z.string().uuid(),
  delegates: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email(),
        committee: z.string().max(200).default(''),
        country_portfolio: z.string().max(200).default(''),
        award: z.string().max(200).nullable().default(null),
      }),
    )
    .min(1)
    .max(2000),
});

/** Bulk import (upsert by org + email) the conference's delegate roster. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = supabaseAdmin();
  let imported = 0;
  const failures: Array<{ email: string; error: string }> = [];
  for (const delegate of parsed.data.delegates) {
    const email = delegate.email.trim().toLowerCase();
    const { data: existing } = await admin
      .from('delegates')
      .select('id')
      .eq('org_id', ctx.org.id)
      .ilike('email', email)
      .maybeSingle();
    const row = { ...delegate, email, org_id: ctx.org.id };
    const { error } = existing
      ? await admin.from('delegates').update(row).eq('id', existing.id)
      : await admin.from('delegates').insert(row);
    if (error) failures.push({ email, error: error.message });
    else imported += 1;
  }
  return NextResponse.json({ imported, failures });
}

const deleteSchema = z.object({ org_id: z.string().uuid(), id: z.string().uuid() });

export async function DELETE(request: Request) {
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  const { error } = await supabaseAdmin().from('delegates').delete().eq('id', parsed.data.id).eq('org_id', ctx.org.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
