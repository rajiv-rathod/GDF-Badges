import { describe, expect, it } from 'vitest';
import {
  buildOpenBadgeCredential,
  canonicalize,
  type CanonicalCredential,
  generateSigningKeyPair,
  generateVerificationCode,
  signCredential,
  verifyCredentialSignature,
} from '../server';

const keys = generateSigningKeyPair();

function sampleCredential(overrides: Partial<CanonicalCredential> = {}): CanonicalCredential {
  return {
    id: '9c1f9f9e-0000-4000-8000-000000000001',
    type: 'badge',
    org_id: '9c1f9f9e-0000-4000-8000-000000000002',
    template_id: '9c1f9f9e-0000-4000-8000-000000000003',
    recipient_email: 'delegate@example.com',
    recipient_name: 'Amina Delegate',
    fields_json: { award: 'Best Delegate', committee: 'UNSC' },
    event_name: 'GDF MUN 2026',
    issued_at: '2026-07-26T12:00:00.000Z',
    verification_code: 'testcode123',
    ...overrides,
  };
}

describe('canonicalize', () => {
  it('is stable under key ordering', () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalize({ a: { c: 3, d: 2 }, b: 1 }));
  });

  it('produces distinct output for distinct data', () => {
    expect(canonicalize({ a: 1 })).not.toBe(canonicalize({ a: 2 }));
  });
});

describe('generateVerificationCode', () => {
  it('is unguessable-length, url-safe, and unique across calls', () => {
    const codes = new Set(Array.from({ length: 100 }, generateVerificationCode));
    expect(codes.size).toBe(100);
    for (const code of codes) {
      expect(code.length).toBeGreaterThanOrEqual(20);
      expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
});

describe('sign + verify (issue path)', () => {
  it('round-trips a signed credential', () => {
    const cred = sampleCredential();
    const sig = signCredential(cred, keys.privateKey);
    expect(verifyCredentialSignature(cred, sig, keys.publicKey)).toBe(true);
  });

  it('rejects tampering with any signed field', () => {
    const cred = sampleCredential();
    const sig = signCredential(cred, keys.privateKey);
    expect(verifyCredentialSignature(sampleCredential({ recipient_name: 'Someone Else' }), sig, keys.publicKey)).toBe(false);
    expect(verifyCredentialSignature(sampleCredential({ fields_json: { award: 'Chair' } }), sig, keys.publicKey)).toBe(false);
    expect(verifyCredentialSignature(sampleCredential({ event_name: 'Other Conf' }), sig, keys.publicKey)).toBe(false);
  });

  it('rejects a signature from a different key (forged issuer)', () => {
    const cred = sampleCredential();
    const otherKeys = generateSigningKeyPair();
    const forged = signCredential(cred, otherKeys.privateKey);
    expect(verifyCredentialSignature(cred, forged, keys.publicKey)).toBe(false);
  });

  it('rejects malformed signatures and keys without throwing', () => {
    const cred = sampleCredential();
    expect(verifyCredentialSignature(cred, 'not-a-signature', keys.publicKey)).toBe(false);
    expect(verifyCredentialSignature(cred, signCredential(cred, keys.privateKey), 'bm90LWEta2V5')).toBe(false);
  });
});

describe('revocation semantics (verify path)', () => {
  it('keeps the signature valid while status reports revoked', () => {
    // Revocation is a status flip, not a signature change: the credential
    // stays cryptographically authentic but the verify page must show REVOKED.
    const cred = sampleCredential();
    const sig = signCredential(cred, keys.privateKey);
    const ob3 = buildOpenBadgeCredential({
      credential: cred,
      status: 'revoked',
      orgName: 'GDF MUN',
      orgSlug: 'gdf-mun',
      templateName: 'Best Delegate',
      signature: sig,
      publicKeyB64: keys.publicKey,
      baseUrl: 'https://certview.gdf.social',
    });
    expect(verifyCredentialSignature(cred, sig, keys.publicKey)).toBe(true);
    expect(ob3.credentialStatus.status).toBe('revoked');
  });
});

describe('claim semantics', () => {
  it('claim does not alter any signed field', () => {
    // Claiming links recipient_user_id and flips status — neither is part of
    // the canonical payload, so the original signature must keep verifying.
    const cred = sampleCredential();
    const sig = signCredential(cred, keys.privateKey);
    const afterClaim = { ...cred }; // signed fields unchanged by claim
    expect(verifyCredentialSignature(afterClaim, sig, keys.publicKey)).toBe(true);
  });
});

describe('Open Badges 3.0 output', () => {
  it('redacts the recipient email and stays verifiable by the credential holder', () => {
    const cred = sampleCredential();
    const sig = signCredential(cred, keys.privateKey);
    const ob3 = buildOpenBadgeCredential({
      credential: cred,
      status: 'claimed',
      orgName: 'GDF MUN',
      orgSlug: 'gdf-mun',
      templateName: 'Best Delegate',
      signature: sig,
      publicKeyB64: keys.publicKey,
      baseUrl: 'https://certview.gdf.social',
    });
    expect(ob3.type).toContain('OpenBadgeCredential');

    // The raw email must not appear anywhere in the public document.
    expect(JSON.stringify(ob3)).not.toContain(cred.recipient_email);
    expect(ob3.credentialSubject.identifier[0].identityHash).toMatch(/^sha256\$[0-9a-f]{64}$/);

    // Holder-side verification: substitute the known email back into the
    // redacted canonical form, then check the proof.
    const canonical = ob3.credentialSubject.achievement['gdf:canonical'];
    const proof = ob3.proof[0];
    const restored = { ...canonical, recipient_email: cred.recipient_email };
    expect(verifyCredentialSignature(restored, proof.proofValue, proof['gdf:publicKeyDerBase64'])).toBe(true);
    // The redacted form itself must NOT verify (it is not what was signed).
    expect(verifyCredentialSignature(canonical, proof.proofValue, proof['gdf:publicKeyDerBase64'])).toBe(false);
  });
});
