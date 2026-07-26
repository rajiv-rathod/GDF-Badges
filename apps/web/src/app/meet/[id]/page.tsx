import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { EmptyState } from '@/components/ui';
import { getSession } from '@/lib/server/auth';
import { jitsiConfigured, jitsiDomain, mintJitsiJwt } from '@/lib/server/jitsi';
import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MeetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect('/login');

  const notAvailable = (title: string, body: string) => (
    <>
      <AppNav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <EmptyState title={title} body={body} />
      </main>
    </>
  );

  if (!jitsiConfigured) {
    return notAvailable('Meetings not configured', 'The organizer has not enabled video meetings yet.');
  }

  const admin = supabaseAdmin();
  const { data: meeting } = await admin
    .from('meetings')
    .select('id, org_id, room_name, status, organizations(slug, name)')
    .eq('id', id)
    .maybeSingle();
  if (!meeting || meeting.status === 'ended') {
    return notAvailable('Meeting unavailable', 'This meeting does not exist or has already ended.');
  }

  // Authorization: org staff moderate; anyone holding a credential from the org may join.
  const { data: staff } = await admin
    .from('org_members')
    .select('user_id')
    .eq('org_id', meeting.org_id)
    .eq('user_id', session.userId)
    .maybeSingle();
  let authorized = Boolean(staff);
  if (!authorized) {
    await admin.rpc('claim_pending_credentials', { p_email: session.email, p_user: session.userId });
    const { data: credential } = await admin
      .from('credentials')
      .select('id')
      .eq('org_id', meeting.org_id)
      .neq('status', 'revoked')
      .eq('recipient_user_id', session.userId)
      .limit(1)
      .maybeSingle();
    authorized = Boolean(credential);
  }
  if (!authorized) {
    return notAvailable('Not authorized', 'Only conference staff and delegates holding a credential from this conference can join.');
  }

  const org = meeting.organizations as unknown as { slug: string; name: string } | null;
  const room = `${org?.slug ?? 'gdf'}-${meeting.id.slice(0, 8)}`;
  const jwt = await mintJitsiJwt({
    room,
    name: session.profile.full_name || session.email,
    email: session.email,
    moderator: Boolean(staff),
  });
  const src = `https://${jitsiDomain()}/${encodeURIComponent(room)}?jwt=${jwt}#config.prejoinConfig.enabled=false`;

  return (
    <div className="flex h-screen flex-col">
      <AppNav />
      <div className="border-b border-border bg-surface/40 px-6 py-2 text-sm">
        <span className="font-display font-semibold">{meeting.room_name}</span>
        <span className="text-muted"> · {org?.name}</span>
      </div>
      <iframe
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="w-full flex-1 border-0 bg-background"
        title={meeting.room_name}
      />
    </div>
  );
}
