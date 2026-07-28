import { getAppConfig, setAppConfig } from './appconfig';
import { getSession, type SessionInfo } from './auth';

/**
 * Super-admin gating. The super-admin panel is locked to a single account:
 * the platform owner. This is enforced in code (not just config) so the
 * allow-list can never be widened by editing app_config — nobody else can be
 * granted admin access. Organizer/staff roles are a separate, org-scoped
 * concept and are unaffected. Bans are stored in app_config 'banned_emails'.
 */
export const SOLE_ADMIN_EMAIL = 'rajiv@gdf.social';

export async function requireAdmin(): Promise<SessionInfo | null> {
  const session = await getSession();
  if (!session) return null;
  return session.email.toLowerCase() === SOLE_ADMIN_EMAIL ? session : null;
}

export async function isAdminEmail(email: string): Promise<boolean> {
  return email.trim().toLowerCase() === SOLE_ADMIN_EMAIL;
}

async function bannedSet(): Promise<Set<string>> {
  const raw = (await getAppConfig('banned_emails')) ?? '';
  return new Set(raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export async function isBanned(email: string): Promise<boolean> {
  return (await bannedSet()).has(email.toLowerCase());
}

export async function setBanned(email: string, banned: boolean): Promise<void> {
  const set = await bannedSet();
  const key = email.toLowerCase();
  if (banned) set.add(key);
  else set.delete(key);
  await setAppConfig('banned_emails', [...set].join(','));
}
