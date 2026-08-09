import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  full_name: z.string().min(1).max(200),
  role: z.enum(['member', 'organizer']),
  // Mandatory consent — enforced server-side, not just by the checkbox.
  terms_accepted: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms of Service, Privacy Policy and Data Collection Notice.' }),
  }),
});

/**
 * Instant signup: creates the account already email-confirmed via the admin
 * API, so there is no inbox step. (Auto-confirm on purpose — the platform
 * treats email as an addressable identifier for claim-by-email, not proof of
 * ownership.) The client then signs in normally to establish its session.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, 'signup'), 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a minute.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { email, password, full_name, role } = parsed.data;

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim(), role },
  });
  if (error) {
    const msg = /registered|already/i.test(error.message)
      ? 'An account with this email already exists — sign in instead.'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
