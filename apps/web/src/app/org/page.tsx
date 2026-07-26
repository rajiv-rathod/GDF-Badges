export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { EmptyState, PageTitle } from '@/components/ui';
import { getSession } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { CreateOrgForm } from './create-org';

export default async function OrgListPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const admin = supabaseAdmin();
  const { data: memberships } = await admin
    .from('org_members')
    .select('role_in_org, organizations(id, name, slug)')
    .eq('user_id', session.userId);

  const orgs = (memberships ?? [])
    .map((m) => ({ role: m.role_in_org, org: m.organizations as unknown as { id: string; name: string; slug: string } | null }))
    .filter((m) => m.org);

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <PageTitle title="Your conferences" subtitle="Each conference is its own issuing organization with isolated data." />
        {orgs.length === 0 ? (
          <EmptyState
            title="No conferences yet"
            body="Create your first conference below to start issuing badges and certificates to delegates."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {orgs.map(({ org, role }) => (
              <li key={org!.id}>
                <Link
                  href={`/org/${org!.slug}`}
                  className="block rounded-lg border border-border bg-surface/50 p-5 transition hover:border-primary"
                >
                  <p className="font-display text-lg font-semibold">{org!.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted">{role}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10">
          <CreateOrgForm />
        </div>
      </main>
    </>
  );
}
