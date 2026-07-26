import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { jitsiConfigured } from '@/lib/server/jitsi';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  org_id: z.string().uuid(),
  room_name: z.string().min(2).max(120),
  scheduled_at: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  if (!jitsiConfigured) {
    return NextResponse.json({ error: 'Meetings are not configured (set JITSI_* env vars)' }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { data, error } = await supabaseAdmin()
    .from('meetings')
    .insert({
      org_id: ctx.org.id,
      room_name: parsed.data.room_name,
      host_id: ctx.session.userId,
      scheduled_at: parsed.data.scheduled_at ?? new Date().toISOString(),
      status: 'scheduled',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
