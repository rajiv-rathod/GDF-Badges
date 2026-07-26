# MUN CertView — powered by GDF

A **free**, Credly-style credentialing + all-in-one conference platform for
Model UN, built by the **Global Diplomacy Forum**. Organizers issue verifiable
badges and certificates to delegates; members claim, collect, verify, and share
them — with committee sessions one click away in the GDF meeting app.

## What's implemented

- **Auth + multi-tenancy** — organizer/member signup, each conference is an
  isolated org (Postgres RLS), org staff roles.
- **Claim-by-email** — credentials issued to an email link automatically when
  that address signs up (DB trigger) or logs in (RPC).
- **Credential engine** — Ed25519-signed canonical credentials, unguessable
  verify codes, audit log, revocation, public `/verify/{code}` page, and
  Open Badges 3.0-aligned JSON (`/api/verify/{code}?format=ob3`).
- **Badges** — 5 seeded GDF templates (Participation, Best Delegate,
  Outstanding Delegate, Honourable Mention, Chair); single or bulk issue from
  the delegate roster.
- **Certificate designer (Canva-style)** — upload a background, drag fields on
  a live canvas, save per-org templates; **bulk issue** from an XLSX/CSV sheet
  with column→field mapping, first-row preview, per-row progress, and a signed
  PDF per delegate (rendered with pdf-lib — no headless browser needed).
- **Member wallet + public profile** — wallet with public/private toggles,
  shareable `/u/{slug}` profile, PDF downloads.
- **Organizer dashboard** — roster import/export (XLSX), issued-credentials
  table with filters + revoke, claim analytics.
- **Meetings** — committee sessions run in the external GDF meeting app
  (meet.apextech.llc); "Launch meeting app" buttons throughout.
- **Gemini AI (feature-flagged)** — award-citation drafting, delegate-sheet
  cleanup, organizer help assistant. Absent key = features hidden, nothing breaks.
- **Android app** (`apps/mobile`, Expo) — member wallet: sign in, auto-claim,
  view/share/verify credentials, download PDFs.
- **Integrity tests** — canonicalization, sign/verify round-trip, tamper +
  forged-issuer rejection, revocation and claim semantics (`packages/shared`).

## Repo layout

```
apps/web           Next.js 15 (App Router + Tailwind) — full web app
apps/mobile        Expo (React Native, Android-first) — member app
packages/shared    Brand tokens, types, Supabase factory, credential crypto
supabase/          migrations/0001_init.sql (schema+RLS+functions), seed.sql
scripts/           generate-signing-keys.mjs
docs/              PLAYBOOK.md (original plan), DEPLOYMENT.md (incl. 1 GB VM)
```

## Quick start

Requires Node 20+.

```bash
npm install
npm test                                   # credential integrity tests
node scripts/generate-signing-keys.mjs     # signing keys → .env.local
```

1. Create a free Supabase project; run `supabase/migrations/0001_init.sql`
   then `supabase/seed.sql` in the SQL editor.
2. Copy `apps/web/.env.example` → `apps/web/.env.local` and fill it in.
3. `npm run web` → http://localhost:3000 — sign up as an **Organizer**, create
   a conference, import delegates, and issue.
4. Mobile: copy `apps/mobile/.env.example` → `apps/mobile/.env`, then
   `npm run mobile` (Expo Go) or build an APK with EAS.

Deployment (Vercel + managed Supabase recommended; notes for self-hosting on
a small VM): see `docs/DEPLOYMENT.md`. Go-live runbook: `docs/RELEASE.md`.

## Brand

All colors, fonts, radii, and effects come from
`packages/shared/src/tokens.ts` — extracted from the live
[gdf.social](https://gdf.social) site. Deep midnight navy `#06002e`, GDF
magenta `#d73cbe`, bright pink `#ff45e1`. If a screen looks like a generic
SaaS starter, it's wrong.
