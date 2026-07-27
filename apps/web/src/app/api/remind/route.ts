import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { appUrl } from '@/lib/server/appconfig';
import { sendCredentialEmail } from '@/lib/server/email';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({ org_id: z.string().uuid() });

/** Re-sends the claim email to everyone with an issued-but-unclaimed credential. */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, 'remind'), 6, 60_000)) {
    return NextResponse.json({ error: 'Too many requests — wait a minute.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const admin = supabaseAdmin();
  const origin = await appUrl();
  const { data: pending } = await admin
    .from('credentials')
    .select('recipient_email, recipient_name, event_name, verification_code, type')
    .eq('org_id', ctx.org.id)
    .eq('status', 'issued')
    .limit(2000);

  let sent = 0;
  for (const c of pending ?? []) {
    const ok = await sendCredentialEmail({
      to: c.recipient_email,
      recipientName: c.recipient_name,
      templateName: c.type === 'badge' ? 'Your badge' : 'Your certificate',
      eventName: c.event_name,
      orgName: ctx.org.name,
      certificateId: c.verification_code,
      verifyUrl: `${origin}/verify/${c.verification_code}`,
      claimUrl: `${origin}/signup`,
      alreadyClaimed: false,
    });
    if (ok) sent += 1;
  }
  return NextResponse.json({ pending: (pending ?? []).length, sent });
}
