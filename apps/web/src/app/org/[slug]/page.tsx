import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui';
import { HelpAssistant } from '@/components/help-assistant';
import { BrandingForm } from './branding-form';
import { requireOrgStaff } from '@/lib/server/auth';
import { aiEnabled } from '@/lib/server/gemini';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function OrgOverviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const admin = supabaseAdmin();
  const { data: orgRow } = await admin.from('organizations').select('brand_overrides').eq('id', ctx.org.id).single();
  const brand = (orgRow?.brand_overrides as { logo_url?: string; accent?: string; tagline?: string } | null) ?? {};
  const count = async (status?: string) => {
    let q = admin.from('credentials').select('id', { count: 'exact', head: true }).eq('org_id', ctx.org.id);
    if (status) q = q.eq('status', status);
    const { count: n } = await q;
    return n ?? 0;
  };
  const [total, issued, claimed, revoked, { count: delegates }] = await Promise.all([
    count(),
    count('issued'),
    count('claimed'),
    count('revoked'),
    admin.from('delegates').select('id', { count: 'exact', head: true }).eq('org_id', ctx.org.id),
  ]);

  const stats = [
    { label: 'Credentials issued', value: total },
    { label: 'Awaiting claim', value: issued },
    { label: 'Claimed', value: claimed },
    { label: 'Revoked', value: revoked },
    { label: 'Delegates on roster', value: delegates ?? 0 },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4 text-center">
            <p className="font-display text-3xl font-bold text-primary-dark">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</p>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: `/org/${slug}/delegates`, title: 'Import your roster', body: 'Upload the delegate sheet (XLSX/CSV) once — issue everything from it.' },
          { href: `/org/${slug}/issue`, title: 'Issue badges', body: 'Fixed GDF badge templates: Participation, Best Delegate, and more.' },
          { href: `/org/${slug}/certificates`, title: 'Design certificates', body: 'Upload your background, drag the fields, bulk-issue signed PDFs.' },
        ].map((c) => (
          <Link key={c.href} href={c.href} className="rounded-lg border border-border bg-surface/50 p-5 transition hover:border-primary">
            <p className="font-display font-semibold text-primary-dark">{c.title}</p>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
          </Link>
        ))}
      </div>
      <div className="mt-8">
        <BrandingForm
          orgId={ctx.org.id}
          initialLogo={brand.logo_url ?? null}
          initialAccent={brand.accent ?? '#d73cbe'}
          initialTagline={brand.tagline ?? ''}
        />
      </div>
      {aiEnabled ? <HelpAssistant /> : null}
    </>
  );
}
