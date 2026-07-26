export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { brand } from '@gdf/shared';
import { AppNav } from '@/components/nav';
import { EmptyState, ErrorBox, PageTitle } from '@/components/ui';
import { getSession } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { WalletGrid, type WalletCredential } from './wallet-grid';

export default async function WalletPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const admin = supabaseAdmin();
  let credentials: WalletCredential[] = [];
  let loadError = '';
  try {
    // Link anything issued to this email first, then query strictly by user id
    // (no email pattern matching — emails can contain ILIKE wildcard chars).
    await admin.rpc('claim_pending_credentials', { p_email: session.email, p_user: session.userId });
    const { data, error } = await admin
      .from('credentials')
      .select('id, type, recipient_name, event_name, issued_at, status, verification_code, asset_url, is_public, org_id, template_id, organizations(name)')
      .eq('recipient_user_id', session.userId)
      .order('issued_at', { ascending: false });
    if (error) throw new Error(error.message);

    const badgeIds = (data ?? []).filter((c) => c.type === 'badge').map((c) => c.template_id);
    const { data: templates } = badgeIds.length
      ? await admin.from('badge_templates').select('id, name, image_url').in('id', badgeIds)
      : { data: [] as Array<{ id: string; name: string; image_url: string }> };
    const templateById = new Map((templates ?? []).map((t) => [t.id, t]));

    credentials = (data ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      recipient_name: c.recipient_name,
      event_name: c.event_name,
      issued_at: c.issued_at,
      status: c.status,
      verification_code: c.verification_code,
      asset_url: c.asset_url,
      is_public: c.is_public,
      org_name: (c.organizations as unknown as { name: string } | null)?.name ?? '',
      template_name: templateById.get(c.template_id)?.name ?? (c.type === 'badge' ? 'Badge' : 'Certificate'),
      template_image: templateById.get(c.template_id)?.image_url ?? null,
    }));
  } catch (error) {
    loadError = (error as Error).message;
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <PageTitle
          title="My credentials"
          subtitle={`Signed in as ${session.email} — credentials issued to this email appear here automatically.`}
        />
        {loadError ? (
          <ErrorBox message={`Could not load your credentials: ${loadError}`} />
        ) : credentials.length === 0 ? (
          <EmptyState
            title="No credentials yet"
            body="When a conference issues a badge or certificate to your email, it will show up here — even if it was issued before you signed up."
          />
        ) : (
          <WalletGrid credentials={credentials} />
        )}

        <section className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-surface/80 p-6">
          <div>
            <h2 className="font-display text-lg font-semibold">Conference meetings</h2>
            <p className="mt-1 text-sm text-muted">Committee sessions run in the GDF meeting app.</p>
          </div>
          <a
            href={brand.meetingAppUrl}
            target="_blank"
            rel="noreferrer"
            className="gdf-cta-gradient rounded-sm px-6 py-2.5 font-display font-semibold text-white transition hover:opacity-90"
          >
            Launch meeting app ↗
          </a>
        </section>
      </main>
    </>
  );
}
