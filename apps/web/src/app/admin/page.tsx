export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { AppNav } from '@/components/nav';
import { requireAdmin, isBanned } from '@/lib/server/admin';
import { getLandingContent } from '@/lib/server/landing';
import { supabaseAdmin } from '@/lib/supabase/server';
import { AdminConsole, type AdminMember, type AdminOrg } from './admin-console';

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect('/dashboard');

  const db = supabaseAdmin();
  const [{ data: profiles }, { data: orgs }, { count: credCount }, { count: delegateCount }] = await Promise.all([
    db.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(500),
    db.from('organizations').select('id, name, slug, owner_id, created_at, mymun_url').order('created_at', { ascending: false }),
    db.from('credentials').select('id', { count: 'exact', head: true }),
    db.from('delegates').select('id', { count: 'exact', head: true }),
  ]);

  const members: AdminMember[] = [];
  for (const p of profiles ?? []) {
    members.push({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      created_at: p.created_at,
      banned: await isBanned(p.email),
    });
  }
  const ownerName = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  const orgList: AdminOrg[] = (orgs ?? []).map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    owner: ownerName.get(o.owner_id) ?? '—',
    created_at: o.created_at,
    mymun_url: o.mymun_url ?? null,
  }));

  const stats = {
    members: members.length,
    organizers: members.filter((m) => m.role !== 'member').length,
    orgs: orgList.length,
    credentials: credCount ?? 0,
    delegates: delegateCount ?? 0,
  };

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <AdminConsole
          adminEmail={admin.email}
          members={members}
          orgs={orgList}
          stats={stats}
          landing={await getLandingContent()}
        />
      </main>
    </>
  );
}
