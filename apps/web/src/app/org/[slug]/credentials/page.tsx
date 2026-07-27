import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { CredentialsTable } from './credentials-table';

export default async function OrgCredentialsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const { data } = await supabaseAdmin()
    .from('credentials')
    .select('id, type, recipient_name, recipient_email, event_name, issued_at, status, verification_code, asset_url')
    .eq('org_id', ctx.org.id)
    .order('issued_at', { ascending: false })
    .limit(500);

  return <CredentialsTable credentials={data ?? []} orgId={ctx.org.id} />;
}
