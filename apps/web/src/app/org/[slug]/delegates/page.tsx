import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { aiEnabled } from '@/lib/server/gemini';
import { DelegatesManager } from './delegates-manager';

export default async function DelegatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const { data: delegates } = await supabaseAdmin()
    .from('delegates')
    .select('id, name, email, committee, country_portfolio, award')
    .eq('org_id', ctx.org.id)
    .order('name');

  return <DelegatesManager orgId={ctx.org.id} initialDelegates={delegates ?? []} aiEnabled={aiEnabled} />;
}
