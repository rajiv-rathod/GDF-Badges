#!/usr/bin/env node
// One-time setup: prints the Ed25519 signing key pair for credential issuance.
// Run:  node scripts/generate-signing-keys.mjs
// Put the values in apps/web/.env.local (see apps/web/.env.example).
import { generateKeyPairSync } from 'node:crypto';

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
console.log('CREDENTIAL_SIGNING_KEY=' + privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'));
console.log('NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY=' + publicKey.export({ format: 'der', type: 'spki' }).toString('base64'));
