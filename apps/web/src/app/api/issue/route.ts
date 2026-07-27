import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOrgStaffById } from '@/lib/server/auth';
import { issueCredential } from '@/lib/server/credentials';
import { sendCredentialEmail } from '@/lib/server/email';
import { appUrl } from '@/lib/server/appconfig';
import { clientKey, rateLimit } from '@/lib/server/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  org_id: z.string().uuid(),
  template_id: z.string().uuid(),
  event_name: z.string().min(1).max(200),
  // Credly-style enrichment, applied to the whole batch and folded into the
  // signed fields_json so it's tamper-evident like everything else.
  skills: z.array(z.string().max(60)).max(20).optional(),
  evidence: z.string().max(2000).optional(),
  expires: z.string().max(40).optional(), // ISO date; empty = never expires
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

/** Fold batch-level skills/evidence/expiry into a recipient's signed fields. */
function enrich(fields: Record<string, string>, input: { skills?: string[]; evidence?: string; expires?: string }) {
  const out = { ...fields };
  const skills = (input.skills ?? []).map((s) => s.trim()).filter(Boolean);
  if (skills.length) out.skills = skills.join(', ');
  if (input.evidence?.trim()) out.evidence = input.evidence.trim();
  if (input.expires?.trim()) out.expires = input.expires.trim();
  return out;
}

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
    .select('id, org_id, name')
    .eq('id', parsed.data.template_id)
    .maybeSingle();
  if (!template || (template.org_id !== null && template.org_id !== ctx.org.id)) {
    return NextResponse.json({ error: 'Unknown badge template' }, { status: 400 });
  }
  const origin = await appUrl();

  const results = [];
  const failures = [];
  for (const recipient of parsed.data.recipients) {
    try {
      const issued = await issueCredential(admin, {
        type: 'badge',
        orgId: ctx.org.id,
        // template.id (from the DB row) — not the client string — so the
        // signed value matches storage exactly
        templateId: template.id,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        fields: enrich(recipient.fields, parsed.data),
        eventName: parsed.data.event_name,
        issuedBy: ctx.session.userId,
      });
      results.push(issued);
      // Best-effort notification — never fails the issuance.
      void sendCredentialEmail({
        to: issued.recipient_email,
        recipientName: recipient.name,
        templateName: template.name ?? 'Badge',
        eventName: parsed.data.event_name,
        orgName: ctx.org.name,
        certificateId: issued.verification_code,
        verifyUrl: `${origin}/verify/${issued.verification_code}`,
        claimUrl: `${origin}/signup`,
        alreadyClaimed: issued.status === 'claimed',
      });
    } catch (error) {
      failures.push({ email: recipient.email, error: (error as Error).message });
    }
  }
  return NextResponse.json({ issued: results, failures });
}
