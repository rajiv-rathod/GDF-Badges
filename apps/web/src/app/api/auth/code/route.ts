import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isBanned } from '@/lib/server/admin';
import { escapeIlike } from '@/lib/server/credentials';
import { sendAuthCode } from '@/lib/server/email';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  email: z.string().email(),
  purpose: z.enum(['signin', 'recovery']),
});

/**
 * Sends a 6-digit one-time code (via our own SMTP) for passwordless sign-in or
 * password recovery. Uses GoTrue's generateLink to mint a code that verifyOtp
 * accepts — no Supabase email templates involved.
 *
 * Anti-enumeration: the response is a generic { ok:true } whether or not an
 * account exists (and for banned emails) — we just skip sending in those cases.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  const { purpose } = parsed.data;

  // Hard limits: per client IP and per target inbox.
  if (
    !rateLimit(clientKey(request, 'authcode'), 5, 10 * 60_000) ||
    !rateLimit(`authcode-email:${email}`, 5, 10 * 60_000)
  ) {
    return NextResponse.json({ error: 'Too many code requests — try again in a few minutes.' }, { status: 429 });
  }

  const generic = NextResponse.json({ ok: true, sent: false });

  if (await isBanned(email)) return generic;

  const admin = supabaseAdmin();

  // Explicit existence check: on current GoTrue, generateLink('magiclink') for
  // an unknown email AUTO-CREATES the user (it does not error as older
  // versions did) — which would mint phantom accounts that never accepted the
  // terms. Unknown emails get the same generic ok, with nothing generated.
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', escapeIlike(email))
    .maybeSingle();
  if (!existing) return generic;

  let code: string | undefined;
  try {
    const { data, error } = await admin.auth.admin.generateLink({
      type: purpose === 'recovery' ? 'recovery' : 'magiclink',
      email,
    });
    // Belt-and-braces: if GoTrue still errors (user deleted between checks,
    // older versions), return the same generic ok so existence never leaks.
    if (error || !data) return generic;
    // The 6-digit OTP lives in data.properties.email_otp; be defensive about
    // the shape across supabase-js versions.
    const bag = data as unknown as { properties?: { email_otp?: string }; email_otp?: string };
    code = bag.properties?.email_otp ?? bag.email_otp;
  } catch {
    return generic;
  }
  if (!code) {
    console.error('auth/code: generateLink returned no email_otp');
    return generic;
  }

  const sent = await sendAuthCode(email, code, purpose === 'recovery' ? 'reset your password' : 'sign in');
  return NextResponse.json({ ok: true, sent });
}
