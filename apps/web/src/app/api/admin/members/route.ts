import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, setBanned } from '@/lib/server/admin';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ban'), email: z.string().email() }),
  z.object({ action: z.literal('unban'), email: z.string().email() }),
  z.object({ action: z.literal('set_role'), user_id: z.string().uuid(), role: z.enum(['member', 'organizer', 'admin']) }),
  z.object({ action: z.literal('delete'), user_id: z.string().uuid() }),
  z.object({
    action: z.literal('add_organizer'),
    email: z.string().email(),
    password: z.string().min(8).max(200),
    full_name: z.string().min(1).max(200),
  }),
]);

/** Super-admin member/organizer management. */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const db = supabaseAdmin();
  const input = parsed.data;

  if (input.action === 'ban' || input.action === 'unban') {
    await setBanned(input.email, input.action === 'ban');
    return NextResponse.json({ ok: true });
  }
  if (input.action === 'set_role') {
    const { error } = await db.from('profiles').update({ role: input.role }).eq('id', input.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  if (input.action === 'delete') {
    if (input.user_id === admin.userId) return NextResponse.json({ error: "You can't delete yourself" }, { status: 400 });
    const { error } = await db.auth.admin.deleteUser(input.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }
  // add_organizer: create a confirmed account with the organizer role
  const { error } = await db.auth.admin.createUser({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name.trim(), role: 'organizer' },
  });
  if (error) {
    const msg = /registered|already/i.test(error.message) ? 'That email already has an account.' : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
