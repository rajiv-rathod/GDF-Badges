import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/admin';
import { sendBroadcast } from '@/lib/server/email';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  subject: z.string().min(1).max(200),
  body_html: z.string().min(1).max(20_000),
  audience: z.enum(['members', 'delegates', 'all']).default('all'),
  test_to: z.string().email().optional(),
});

/**
 * Email blast to the community. Audience:
 *  - members:   everyone with an account (profiles)
 *  - delegates: everyone imported on any roster (delegates)
 *  - all:       the union of both, de-duplicated
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const { subject, body_html, audience, test_to } = parsed.data;

  if (test_to) {
    const { sent } = await sendBroadcast([test_to], `[TEST] ${subject}`, body_html);
    return NextResponse.json({ tested: test_to, ok: sent === 1 });
  }

  const db = supabaseAdmin();
  const emails = new Set<string>();
  if (audience === 'members' || audience === 'all') {
    const { data } = await db.from('profiles').select('email');
    (data ?? []).forEach((r) => r.email && emails.add(r.email.toLowerCase()));
  }
  if (audience === 'delegates' || audience === 'all') {
    const { data } = await db.from('delegates').select('email');
    (data ?? []).forEach((r) => r.email && emails.add(r.email.toLowerCase()));
  }
  const list = [...emails];
  if (list.length === 0) return NextResponse.json({ error: 'No recipients found' }, { status: 400 });

  const { sent, failed } = await sendBroadcast(list, subject, body_html);
  return NextResponse.json({ recipients: list.length, sent, failed });
}
