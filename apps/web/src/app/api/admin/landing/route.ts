import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/server/admin';
import { setAppConfig } from '@/lib/server/appconfig';

const schema = z.object({
  headline: z.string().max(200).optional(),
  subhead: z.string().max(600).optional(),
  about_title: z.string().max(200).optional(),
  about_body: z.string().max(4000).optional(),
  banner: z.string().max(400).optional(),
});

/** Admin-editable landing-page content, stored in app_config as JSON. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  await setAppConfig('landing_content', JSON.stringify(parsed.data));
  return NextResponse.json({ ok: true });
}
