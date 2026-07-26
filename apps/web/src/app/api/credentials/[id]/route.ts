import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, requireOrgStaffById } from '@/lib/server/auth';
import { revokeCredential } from '@/lib/server/credentials';
import { supabaseAdmin } from '@/lib/supabase/server';

const schema = z.object({
  action: z.enum(['revoke', 'set_visibility']),
  is_public: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: credential } = await admin
    .from('credentials')
    .select('id, org_id, recipient_user_id, status')
    .eq('id', id)
    .maybeSingle();
  if (!credential) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (parsed.data.action === 'revoke') {
    const ctx = await requireOrgStaffById(credential.org_id);
    if (!ctx) return NextResponse.json({ error: 'Only the issuing organization can revoke' }, { status: 403 });
    await revokeCredential(admin, credential.id, credential.org_id);
    return NextResponse.json({ ok: true, status: 'revoked' });
  }

  // set_visibility: only the recipient controls whether it appears on their public profile
  const session = await getSession();
  if (!session || session.userId !== credential.recipient_user_id) {
    return NextResponse.json({ error: 'Only the credential holder can change visibility' }, { status: 403 });
  }
  const { error } = await admin
    .from('credentials')
    .update({ is_public: parsed.data.is_public ?? false })
    .eq('id', credential.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, is_public: parsed.data.is_public ?? false });
}
