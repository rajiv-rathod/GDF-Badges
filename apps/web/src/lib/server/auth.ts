import type { Profile } from '@gdf/shared';
import { supabaseAdmin, supabaseServer } from '@/lib/supabase/server';

export interface SessionInfo {
  userId: string;
  email: string;
  profile: Profile;
}

/** Current signed-in user + profile, or null. */
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!profile) return null;
  return { userId: user.id, email: user.email ?? profile.email, profile: profile as Profile };
}

export interface OrgContext {
  session: SessionInfo;
  org: { id: string; name: string; slug: string; owner_id: string };
  roleInOrg: 'owner' | 'admin' | 'staff';
}

/** Loads an org by slug and asserts the current user is on its staff. */
export async function requireOrgStaff(slug: string): Promise<OrgContext | null> {
  return requireOrgStaffBy('slug', slug);
}

/** Same check, by org id — used by API routes that receive org_id in the body. */
export async function requireOrgStaffById(orgId: string): Promise<OrgContext | null> {
  return requireOrgStaffBy('id', orgId);
}

async function requireOrgStaffBy(column: 'slug' | 'id', value: string): Promise<OrgContext | null> {
  const session = await getSession();
  if (!session) return null;
  const admin = supabaseAdmin();
  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, owner_id')
    .eq(column, value)
    .single();
  if (!org) return null;
  const { data: membership } = await admin
    .from('org_members')
    .select('role_in_org')
    .eq('org_id', org.id)
    .eq('user_id', session.userId)
    .single();
  if (!membership) return null;
  return { session, org, roleInOrg: membership.role_in_org };
}
