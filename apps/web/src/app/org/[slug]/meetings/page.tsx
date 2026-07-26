import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { jitsiConfigured } from '@/lib/server/jitsi';
import { supabaseAdmin } from '@/lib/supabase/server';
import { MeetingsManager } from './meetings-manager';

export default async function MeetingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const { data: meetings } = await supabaseAdmin()
    .from('meetings')
    .select('id, room_name, scheduled_at, status')
    .eq('org_id', ctx.org.id)
    .order('scheduled_at', { ascending: false });

  return <MeetingsManager orgId={ctx.org.id} meetings={meetings ?? []} configured={jitsiConfigured} />;
}
