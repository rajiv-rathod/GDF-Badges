import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Best-effort share tracking. Logs a 'shared' credential_event so issuers see
 * a share count in analytics. If the event-type enum doesn't yet include
 * 'shared' (its migration hasn't run), the insert fails silently — sharing
 * itself is a client-side redirect and never depends on this.
 */
export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    if (typeof code !== 'string' || !code) return NextResponse.json({ ok: false });
    const admin = supabaseAdmin();
    const { data } = await admin.from('credentials').select('id').eq('verification_code', code).maybeSingle();
    if (data?.id) await admin.from('credential_events').insert({ credential_id: data.id, event: 'shared' });
  } catch {
    // ignore — share tracking is non-critical
  }
  return NextResponse.json({ ok: true });
}
