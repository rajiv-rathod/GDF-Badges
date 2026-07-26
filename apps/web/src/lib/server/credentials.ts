import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type CanonicalCredential,
  generateVerificationCode,
  signCredential,
} from '@gdf/shared/server';
import { randomUUID } from 'node:crypto';

function signingKey(): string {
  const key = process.env.CREDENTIAL_SIGNING_KEY;
  if (!key) throw new Error('CREDENTIAL_SIGNING_KEY missing — run node scripts/generate-signing-keys.mjs');
  return key;
}

export interface IssueInput {
  type: 'badge' | 'certificate';
  orgId: string;
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  fields: Record<string, string>;
  eventName: string;
  issuedBy: string;
  assetUrl?: string | null;
}

export interface IssuedResult {
  id: string;
  verification_code: string;
  status: 'issued' | 'claimed';
  recipient_email: string;
}

/**
 * The single trusted issuance path: builds the canonical credential, signs it,
 * inserts the row + audit event, and auto-claims when the recipient already
 * has an account for that email.
 */
export async function issueCredential(admin: SupabaseClient, input: IssueInput): Promise<IssuedResult> {
  const id = randomUUID();
  const verification_code = generateVerificationCode();
  const issued_at = new Date().toISOString();
  const email = input.recipientEmail.trim().toLowerCase();

  const canonical: CanonicalCredential = {
    id,
    type: input.type,
    org_id: input.orgId,
    template_id: input.templateId,
    recipient_email: email,
    recipient_name: input.recipientName.trim(),
    fields_json: input.fields,
    event_name: input.eventName,
    issued_at,
    verification_code,
  };
  const signature = signCredential(canonical, signingKey());

  // Auto-claim if this email already belongs to an account.
  const { data: existing } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle();

  const { error } = await admin.from('credentials').insert({
    ...canonical,
    issued_by: input.issuedBy,
    status: existing ? 'claimed' : 'issued',
    recipient_user_id: existing?.id ?? null,
    signature,
    asset_url: input.assetUrl ?? null,
    is_public: false,
  });
  if (error) throw new Error(`Issuance failed: ${error.message}`);

  const events = [{ credential_id: id, event: 'created' }];
  if (existing) events.push({ credential_id: id, event: 'claimed' });
  await admin.from('credential_events').insert(events);

  return { id, verification_code, status: existing ? 'claimed' : 'issued', recipient_email: email };
}

/** Revocation: status flip + audit event. The signature stays intact (tamper-evidence). */
export async function revokeCredential(admin: SupabaseClient, credentialId: string, orgId: string): Promise<void> {
  const { error } = await admin
    .from('credentials')
    .update({ status: 'revoked' })
    .eq('id', credentialId)
    .eq('org_id', orgId);
  if (error) throw new Error(`Revoke failed: ${error.message}`);
  await admin.from('credential_events').insert({ credential_id: credentialId, event: 'revoked' });
}
