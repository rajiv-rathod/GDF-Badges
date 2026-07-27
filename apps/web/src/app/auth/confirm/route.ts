import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Email-confirmation landing. Supabase sends users here after they click the
 * link. Handles both auth flows:
 *  - PKCE:        ?code=...            → exchangeCodeForSession
 *  - OTP/verify:  ?token_hash=&type=  → verifyOtp
 * On success we claim any pending credentials and send them to their wallet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const next = url.searchParams.get('next') ?? '/dashboard';

  const supabase = await supabaseServer();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) {
    // Link credentials issued to this email before the account existed.
    try {
      await supabase.rpc('claim_my_credentials');
    } catch {
      // non-fatal — the wallet page also claims on load
    }
    return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL('/login?confirmed=error', url.origin));
}
