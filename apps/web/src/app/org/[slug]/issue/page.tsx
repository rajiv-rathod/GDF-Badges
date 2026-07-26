import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { aiEnabled } from '@/lib/server/gemini';
import { IssueBadges } from './issue-badges';

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const admin = supabaseAdmin();
  const [{ data: templates }, { data: delegates }] = await Promise.all([
    admin
      .from('badge_templates')
      .select('id, name, description, image_url, org_id')
      .or(`org_id.is.null,org_id.eq.${ctx.org.id}`)
      .order('name'),
    admin
      .from('delegates')
      .select('id, name, email, committee, country_portfolio, award')
      .eq('org_id', ctx.org.id)
      .order('name'),
  ]);

  return (
    <IssueBadges orgId={ctx.org.id} templates={templates ?? []} delegates={delegates ?? []} aiEnabled={aiEnabled} />
  );
}
