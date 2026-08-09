import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type CanonicalCredential,
  generateVerificationCode,
  signCredential,
} from '@gdf/shared/server';
import { randomUUID } from 'node:crypto';
import { getSigningPrivateKey } from './signing';

/** Escape ILIKE wildcards so emails match literally (% and _ are wildcards otherwise). */
export function escapeIlike(value: string): string {
  return value.replace(/([\\%_])/g, '\\$1');
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
    // Lowercased so the signed values byte-match what Postgres stores and
    // what verification reconstructs (uuid columns normalize to lowercase).
    org_id: input.orgId.toLowerCase(),
    template_id: input.templateId.toLowerCase(),
    recipient_email: email,
    recipient_name: input.recipientName.trim(),
    fields_json: input.fields,
    event_name: input.eventName,
    issued_at,
    verification_code,
  };
  const signature = signCredential(canonical, await getSigningPrivateKey());

  // Auto-claim if this email already belongs to an account (wildcards escaped
  // so an address like a_b@x.org can never match a different account).
  const { data: existing } = await admin.from('profiles').select('id').ilike('email', escapeIlike(email)).maybeSingle();

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

/** Reserved fields_json key holding the pre-correction name (signed, so the disclosure is tamper-evident). */
export const NAME_HISTORY_KEY = '__original_name';

/**
 * Recipient name correction ("fix my name"). Rebuilds the canonical credential
 * with the new name and re-signs it, so the verify page stays VERIFIED — but
 * bounded so it cannot become a re-attestation loophole:
 *   - only the claimed recipient, and only while not revoked;
 *   - ONE correction per credential, ever;
 *   - the original name is kept in the signed fields (NAME_HISTORY_KEY) and
 *     disclosed on the public verify page;
 *   - a 'renamed' audit event is recorded.
 * issued_at is re-serialized with toISOString(), which byte-matches the
 * verify RPC's to_char(... 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') format.
 */
export async function renameCredential(
  admin: SupabaseClient,
  credentialId: string,
  userId: string,
  newName: string,
): Promise<{ verification_code: string }> {
  const name = newName.trim();
  if (name.length < 2 || name.length > 200) throw new Error('Enter the corrected full name (2–200 characters).');

  const { data: row, error: readError } = await admin
    .from('credentials')
    .select('id, type, org_id, template_id, recipient_email, recipient_user_id, recipient_name, fields_json, event_name, issued_at, status, verification_code')
    .eq('id', credentialId)
    .maybeSingle();
  if (readError || !row) throw new Error('Credential not found');
  if (row.recipient_user_id !== userId) throw new Error('Only the credential holder can fix the name');
  if (row.status === 'revoked') throw new Error('This credential has been revoked and can no longer be changed');

  const fields = { ...(row.fields_json as Record<string, string>) };
  if (typeof fields[NAME_HISTORY_KEY] === 'string') {
    throw new Error('The name on this credential has already been corrected once. Ask the issuing conference to re-issue it if it is still wrong.');
  }
  fields[NAME_HISTORY_KEY] = row.recipient_name;
  if (typeof fields.recipient_name === 'string') fields.recipient_name = name;

  const canonical: CanonicalCredential = {
    id: row.id,
    type: row.type as CanonicalCredential['type'],
    org_id: String(row.org_id).toLowerCase(),
    template_id: String(row.template_id).toLowerCase(),
    recipient_email: row.recipient_email,
    recipient_name: name,
    fields_json: fields,
    event_name: row.event_name,
    issued_at: new Date(row.issued_at).toISOString(),
    verification_code: row.verification_code,
  };
  const signature = signCredential(canonical, await getSigningPrivateKey());

  const { error } = await admin
    .from('credentials')
    .update({ recipient_name: name, fields_json: fields, signature })
    .eq('id', row.id);
  if (error) throw new Error(`Rename failed: ${error.message}`);
  await admin.from('credential_events').insert({ credential_id: row.id, event: 'renamed' });
  return { verification_code: row.verification_code };
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
