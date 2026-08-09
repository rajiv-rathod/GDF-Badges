import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z
  .object({
    email: z.string().email(),
    purpose: z.enum(['signin', 'recovery']),
    code: z.string().min(4).max(10),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((v) => v.purpose !== 'recovery' || Boolean(v.password), {
    message: 'A new password (min 8 characters) is required',
    path: ['password'],
  });

/**
 * Verifies a one-time code from /api/auth/code. Runs through the cookie-bound
 * ssr client so a successful verifyOtp persists the session cookie on the
 * response. For recovery, the new password is applied to the now-signed-in user.
 */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, 'authverify'), 10, 10 * 60_000)) {
    return NextResponse.json({ error: 'Too many attempts — try again in a few minutes.' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const { purpose, code, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const supabase = await supabaseServer();
  const invalid = NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });

  if (purpose === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
    if (error) return invalid;
  } else {
    // GoTrue versions differ on the accepted type for magiclink OTPs.
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error) {
      const retry = await supabase.auth.verifyOtp({ email, token: code, type: 'magiclink' });
      if (retry.error) return invalid;
    }
  }

  if (purpose === 'recovery' && password) {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
