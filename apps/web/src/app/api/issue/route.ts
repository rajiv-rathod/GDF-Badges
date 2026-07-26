import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { issueCredential } from '@/lib/server/credentials';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  org_id: z.string().uuid(),
  template_id: z.string().uuid(),
  event_name: z.string().min(1).max(200),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().min(1).max(200),
        fields: z.record(z.string()).default({}),
      }),
    )
    .min(1)
    .max(500),
});

/** Issue badges (single or bulk) to recipients by email. */
export async function POST(request: Request) {
  if (!rateLimit(clientKey(request, 'issue'), 30, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });

  const ctx = await requireOrgStaffById(parsed.data.org_id);
  if (!ctx) return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 });

  const admin = supabaseAdmin();
  const { data: template } = await admin
    .from('badge_templates')
    .select('id, org_id')
    .eq('id', parsed.data.template_id)
    .maybeSingle();
  if (!template || (template.org_id !== null && template.org_id !== ctx.org.id)) {
    return NextResponse.json({ error: 'Unknown badge template' }, { status: 400 });
  }

  const results = [];
  const failures = [];
  for (const recipient of parsed.data.recipients) {
    try {
      results.push(
        await issueCredential(admin, {
          type: 'badge',
          orgId: ctx.org.id,
          templateId: parsed.data.template_id,
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          fields: recipient.fields,
          eventName: parsed.data.event_name,
          issuedBy: ctx.session.userId,
        }),
      );
    } catch (error) {
      failures.push({ email: recipient.email, error: (error as Error).message });
    }
  }
  return NextResponse.json({ issued: results, failures });
}
