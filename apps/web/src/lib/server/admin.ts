import { getAppConfig, setAppConfig, adminEmails } from './appconfig';
import { getSession, type SessionInfo } from './auth';

/**
 * Super-admin gating. Admins are listed in app_config 'admin_emails'
 * (comma-separated). No schema change needed — bans are stored in
 * app_config 'banned_emails' too.
 */
export async function requireAdmin(): Promise<SessionInfo | null> {
  const session = await getSession();
  if (!session) return null;
  const admins = await adminEmails();
  return admins.includes(session.email.toLowerCase()) ? session : null;
}

export async function isAdminEmail(email: string): Promise<boolean> {
  return (await adminEmails()).includes(email.toLowerCase());
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
