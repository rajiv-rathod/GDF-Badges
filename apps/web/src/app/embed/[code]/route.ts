import { supabaseAdmin } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Embeddable badge chip served as an SVG at /embed/{code}.svg — a small
 * verified card an earner can drop on any website (like Credly's embed).
 * Clicking the wrapping <a> (in the embed snippet) opens the verify page.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const raw = (await params).code;
  const code = raw.replace(/\.svg$/, '');
  const admin = supabaseAdmin();
  const { data } = await admin.rpc('get_credential_by_code', { p_code: code });

  const esc = (s: string) => String(s ?? '').replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]!));
  const title = esc(data?.template_name ?? 'Credential');
  const org = esc(data?.org_name ?? '');
  const name = esc(data?.recipient_name ?? '');
  const revoked = data?.status === 'revoked';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120" role="img" aria-label="${title} — ${org}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d73cbe"/><stop offset="1" stop-color="#ff45e1"/></linearGradient></defs>
  <rect width="320" height="120" rx="14" fill="#ffffff" stroke="#ece1f0"/>
  <circle cx="46" cy="60" r="30" fill="none" stroke="url(#g)" stroke-width="3"/>
  <ellipse cx="46" cy="60" rx="30" ry="12" fill="none" stroke="url(#g)" stroke-width="1.5"/>
  <ellipse cx="46" cy="60" rx="12" ry="30" fill="none" stroke="url(#g)" stroke-width="1.5"/>
  <text x="92" y="42" font-family="Helvetica,Arial,sans-serif" font-size="15" font-weight="700" fill="#1b1440">${title.slice(0, 24)}</text>
  <text x="92" y="63" font-family="Helvetica,Arial,sans-serif" font-size="12" fill="#6f6690">${name.slice(0, 30)}</text>
  <text x="92" y="82" font-family="Helvetica,Arial,sans-serif" font-size="11" fill="#6f6690">${org.slice(0, 30)}</text>
  <text x="92" y="102" font-family="Helvetica,Arial,sans-serif" font-size="10" font-weight="700" fill="${revoked ? '#d11f38' : '#1f8a4c'}">${revoked ? '✕ REVOKED' : '✓ VERIFIED · certview.gdf.social'}</text>
</svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' },
  });
}
