/**
 * Fixed-window in-memory rate limiter. Suitable for the single-instance
 * deployments this app targets (Vercel region instance / one small VM).
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt < now) {
    if (windows.size > 10_000) windows.clear();
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export function clientKey(request: Request, scope: string): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return `${scope}:${ip}`;
}
