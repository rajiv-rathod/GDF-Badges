/**
 * MyMUN identity gate for organizers.
 *
 * Instead of a manual admin-approval step, an organizer proves their
 * conference is real by supplying its public listing on MyMUN
 * (https://mymun.com). We (1) require the link's host to be mymun.com and
 * (2) require it to point at an actual conference path, then (3) attempt a
 * lightweight reachability check so obviously-fake links are rejected. The
 * validated URL is stored on the organization and surfaced in the admin
 * panel as proof of identity. No approval is required — a valid link lets
 * the organizer proceed immediately.
 */

export interface MyMunCheck {
  ok: boolean;
  /** Normalised, canonical URL to persist when ok. */
  url?: string;
  /** Human-readable reason when not ok. */
  error?: string;
  /** True when the host/path passed but the network check was inconclusive. */
  unverifiedReachability?: boolean;
}

const CONF_PATH = /\/(conferences?|c|events?)\//i;

/** Validate the shape of a MyMUN conference link (no network). */
export function parseMyMunUrl(raw: string): MyMunCheck {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, error: 'A MyMUN conference link is required.' };

  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, error: 'That is not a valid URL.' };
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, error: 'The link must be an http(s) URL.' };
  }

  const host = u.hostname.toLowerCase();
  const isMyMun = host === 'mymun.com' || host.endsWith('.mymun.com');
  if (!isMyMun) {
    return { ok: false, error: 'The link must be on mymun.com — paste your conference’s MyMUN page.' };
  }

  // Must point at a specific conference, not just the mymun.com homepage.
  const hasConfPath = CONF_PATH.test(u.pathname) || u.pathname.replace(/\/+$/, '').split('/').filter(Boolean).length >= 1;
  if (!hasConfPath) {
    return { ok: false, error: 'Link to your specific conference page on MyMUN, not the homepage.' };
  }

  // Canonicalise to https and drop tracking query/hash.
  const canonical = `https://${host}${u.pathname.replace(/\/+$/, '')}`;
  return { ok: true, url: canonical };
}

/**
 * Full check: shape + a best-effort reachability probe. We reject on a clear
 * "not found" (404/410) but stay lenient on other statuses and on network
 * errors (MyMUN may rate-limit or block bots) — recording that reachability
 * was inconclusive rather than blocking a legitimate organizer.
 */
export async function verifyMyMunUrl(raw: string): Promise<MyMunCheck> {
  const parsed = parseMyMunUrl(raw);
  if (!parsed.ok || !parsed.url) return parsed;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(parsed.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GDF-CertView/1.0; +https://certview.gdf.social)',
        Accept: 'text/html',
      },
    });
    if (res.status === 404 || res.status === 410) {
      return { ok: false, error: 'That MyMUN conference page does not exist (404). Check the link.' };
    }
    return { ok: true, url: parsed.url };
  } catch {
    // Network/timeout/blocked — accept the well-formed link but flag it.
    return { ok: true, url: parsed.url, unverifiedReachability: true };
  } finally {
    clearTimeout(timer);
  }
}
