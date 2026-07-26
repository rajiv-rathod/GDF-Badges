/**
 * Server-only credential integrity logic. Imported as '@gdf/shared/server'
 * from Next.js route handlers / server code ONLY — it uses node:crypto and
 * must never be bundled into the browser or the mobile app.
 *
 * Signing scheme: Ed25519 over a canonical JSON serialization of the
 * credential's immutable fields. Keys are stored as base64-encoded DER
 * (PKCS#8 private / SPKI public) in environment variables.
 */
import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign, verify } from 'node:crypto';

/** The immutable fields covered by the signature. */
export interface CanonicalCredential {
  id: string;
  type: 'badge' | 'certificate';
  org_id: string;
  template_id: string;
  recipient_email: string;
  recipient_name: string;
  fields_json: Record<string, string>;
  event_name: string;
  issued_at: string;
  verification_code: string;
}

/** Deterministic JSON: object keys sorted recursively, no whitespace. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') + '}';
}

/** Unguessable public slug for /verify/{code}. 16 random bytes, base64url. */
export function generateVerificationCode(): string {
  return randomBytes(16).toString('base64url');
}

/** One-time setup helper (see scripts/generate-signing-keys.mjs). */
export function generateSigningKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
  };
}

export function signCredential(credential: CanonicalCredential, privateKeyB64: string): string {
  const key = createPrivateKey({ key: Buffer.from(privateKeyB64, 'base64'), format: 'der', type: 'pkcs8' });
  return sign(null, Buffer.from(canonicalize(credential)), key).toString('base64url');
}

export function verifyCredentialSignature(
  credential: CanonicalCredential,
  signature: string,
  publicKeyB64: string,
): boolean {
  try {
    const key = createPublicKey({ key: Buffer.from(publicKeyB64, 'base64'), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(canonicalize(credential)), key, Buffer.from(signature, 'base64url'));
  } catch {
    return false;
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Open Badges 3.0-aligned verifiable credential JSON.
 *
 * Privacy: the recipient's email never appears in this public document — the
 * identity is a salted-format sha256 hash (per the OB3 IdentityObject hashing
 * convention) and `gdf:canonical.recipient_email` is redacted the same way.
 *
 * Independent verification: take `gdf:canonical`, replace `recipient_email`
 * with the recipient's actual lowercased email (known to the credential
 * holder), canonicalize, and check `proof.proofValue` against the issuer's
 * published Ed25519 key. The `gdf:` prefixed cryptosuite name signals this is
 * GDF's canonical-JSON scheme, not the W3C eddsa-rdfc-2022 suite.
 */
export function buildOpenBadgeCredential(options: {
  credential: CanonicalCredential;
  status: 'issued' | 'claimed' | 'revoked';
  orgName: string;
  orgSlug: string;
  templateName: string;
  signature: string;
  publicKeyB64: string;
  baseUrl: string;
}) {
  const { credential, status, orgName, orgSlug, templateName, signature, publicKeyB64, baseUrl } = options;
  const emailHash = `sha256$${sha256Hex(credential.recipient_email.toLowerCase())}`;
  const redactedCanonical: CanonicalCredential = { ...credential, recipient_email: emailHash };
  return {
    '@context': [
      'https://www.w3.org/ns/credentials/v2',
      'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json',
    ],
    id: `${baseUrl}/verify/${credential.verification_code}`,
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: {
      id: `${baseUrl}/org/${orgSlug}`,
      type: ['Profile'],
      name: orgName,
    },
    validFrom: credential.issued_at,
    credentialStatus: {
      id: `${baseUrl}/api/verify/${credential.verification_code}`,
      type: 'GdfStatusEndpoint',
      status,
    },
    credentialSubject: {
      type: ['AchievementSubject'],
      identifier: [{ type: 'IdentityObject', hashed: true, identityHash: emailHash, identityType: 'emailAddress' }],
      name: credential.recipient_name,
      achievement: {
        id: `${baseUrl}/api/verify/${credential.verification_code}`,
        type: ['Achievement'],
        name: templateName,
        description: `${templateName} — ${credential.event_name}`,
        criteria: { narrative: credential.event_name },
        'gdf:canonical': redactedCanonical,
      },
    },
    proof: [
      {
        type: 'DataIntegrityProof',
        cryptosuite: 'gdf-eddsa-jcs-2026',
        created: credential.issued_at,
        proofPurpose: 'assertionMethod',
        verificationMethod: `${baseUrl}/api/issuer-key`,
        'gdf:publicKeyDerBase64': publicKeyB64,
        proofValue: signature,
      },
    ],
  };
}
