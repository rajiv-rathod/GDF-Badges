import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui';
import { HelpAssistant } from '@/components/help-assistant';
import { OnboardingTour } from '@/components/onboarding-tour';
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

  // Engagement funnel: count 'viewed'/'shared' audit events for this org's credentials.
  const { data: orgCredIds } = await admin.from('credentials').select('id').eq('org_id', ctx.org.id);
  const ids = (orgCredIds ?? []).map((c) => c.id);
  let views = 0;
  let shares = 0;
  if (ids.length) {
    const [{ count: v }, { count: s }] = await Promise.all([
      admin.from('credential_events').select('id', { count: 'exact', head: true }).eq('event', 'viewed').in('credential_id', ids),
      admin.from('credential_events').select('id', { count: 'exact', head: true }).eq('event', 'shared').in('credential_id', ids),
    ]);
    views = v ?? 0;
    shares = s ?? 0;
  }

  const stats = [
    { label: 'Credentials issued', value: total },
    { label: 'Awaiting claim', value: issued },
    { label: 'Claimed', value: claimed },
    { label: 'Revoked', value: revoked },
    { label: 'Delegates on roster', value: delegates ?? 0 },
  ];
  const funnel = [
    { label: 'Issued', value: total },
    { label: 'Claimed', value: claimed, rate: total ? Math.round((claimed / total) * 100) : 0 },
    { label: 'Shared', value: shares },
    { label: 'Verify views', value: views },
  ];

  return (
    <>
      <OnboardingTour
        tourId="org"
        steps={[
          { target: 'org-tab-delegates', title: 'Start with your roster', body: 'Import your delegate sheet (XLSX or CSV) once. Every badge and certificate is issued straight from it.', placement: 'bottom' },
          { target: 'org-tab-issue', title: 'Issue badges', body: 'Award fixed GDF badge templates — Participation, Best Delegate, and more — to any delegate on your roster.', placement: 'bottom' },
          { target: 'org-tab-certificates', title: 'Design certificates', body: 'Upload your certificate background, drag fields into place, and bulk-issue signed, verifiable PDFs.', placement: 'bottom' },
          { target: 'org-tab-issued', title: 'Track everything', body: 'See every credential you have issued, remind unclaimed delegates, and revoke instantly if needed.', placement: 'bottom' },
          { target: 'org-branding', title: 'Make it yours', body: 'Add your conference logo and accent colour so credentials carry your brand alongside GDF.', placement: 'top' },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="!p-4 text-center">
            <p className="font-display text-3xl font-bold text-primary-dark">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-surface/70 p-5">
        <p className="text-xs uppercase tracking-wide text-muted">Engagement funnel</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          {funnel.map((f) => (
            <div key={f.label} className="rounded-md border border-border bg-background/60 p-3">
              <p className="font-display text-2xl font-bold">{f.value}</p>
              <p className="text-xs text-muted">
                {f.label}
                {typeof f.rate === 'number' ? <span className="ml-1 font-semibold text-primary-dark">{f.rate}%</span> : null}
              </p>
            </div>
          ))}
        </div>
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
      <div className="mt-8" data-tour="org-branding">
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
