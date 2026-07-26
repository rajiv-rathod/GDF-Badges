import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

/** Called after login: links any credentials issued to the user's email. */
export async function POST() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc('claim_my_credentials');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ claimed: data ?? 0 });
}
