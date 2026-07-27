# CLAUDE.md — MUN CertView (powered by GDF)

## What we're building
A free, Credly-style credentialing + all-in-one conference platform for Model UN.
Organizers issue verifiable badges and certificates to delegates; members claim,
collect, verify, and share them. Conferences also run their own video meetings
(self-hosted Jitsi) inside the app. Free for MUNs — this is GDF's gift to the
MUN community, not a paid product.

## Non-negotiables
- **Branding is GDF, never generic.** No purple gradients, no default template look.
  Use the BRAND TOKENS below for every color, surface, and effect. If a screen
  looks like a generic SaaS starter, it's wrong.
- **Two clear personas:** Organizers (issue) and Members (receive/claim/share).
- **Badges use fixed templates. Certificates are fully custom** (Canva-style field
  mapping, see Phase 3 in docs/PLAYBOOK.md).
- **Every credential is verifiable:** unique code, cryptographic signature, public
  verify page, revocable. Aim at Open Badges 3.0 semantics.
- **Multi-tenant:** each conference is an org; data is isolated with Postgres RLS.

## Stack
- Monorepo: apps/web (Next.js, Vercel), apps/mobile (React Native + Expo, Android-first),
  packages/shared (types, credential logic, brand tokens).
- Backend: Supabase (Postgres, Auth, Storage, RLS, Edge Functions).
- Cert rendering: pdf-lib (chosen over headless-browser rendering for low-memory hosts).
- Video: external GDF meeting app at https://meet.apextech.llc — the web app links
  out to it ("Launch meeting app"); no in-app video.
- AI: Gemini API (modular, feature-flagged).
- Sheets: SheetJS (xlsx) for delegate import/export.

## BRAND TOKENS
Sourced from the official GDF brand assets supplied by the team (dotted-halftone
circle logo, light gradient background, brand PDF). Canonical definitions live
in `packages/shared/src/tokens.ts` — that file is the single source of truth;
the values below are the reference copy.

- primary:        #d73cbe   /* GDF magenta */
- primary-dark:   #a52b93   /* hover/pressed + AA link color on light */
- accent:         #ff45e1   /* bright pink highlight (gradients/seals only) */
- background:     #fdfafd   /* near-white base — GDF's brand background is LIGHT */
- surface:        #ffffff   /* raised card surface */
- text:           #1b1440   /* deep navy-violet primary text */
- muted:          #6f6690   /* violet-grey secondary text */
- font-display:   "Lastica"         /* licensed — drop files in apps/web/public/fonts */
- font-body:      "TT Interphases"  /* licensed — same; Space Grotesk/Inter are the open fallbacks */
- logo:           dotted-halftone circle GDF mark — packages/shared/assets/gdf-logo.svg
                  (web copy: apps/web/public/gdf-logo.svg)
- effects:        soft blurred pink/violet/blue gradient clouds over near-white
                  (`.gdf-backdrop`), subtle magenta dot-grid echoing the halftone
                  logo, magenta→pink gradient reserved for CTAs and credential
                  seals only — never full-page gradients.
- support email:  rajiv@gdf.social
> The typefaces are commercially licensed and NOT committed to the repo — see
> apps/web/public/fonts/README.md. Do NOT invent a new palette.

## Conventions
- TypeScript everywhere. Zod for validation. Server logic in Supabase Edge Functions
  or Next.js route handlers — never trust the client for issuance/verification.
- All credential-affecting writes go through server functions with RLS + signature checks.
- Accessible, mobile-first UI. Every list has empty/loading/error states.
- Write a short test for every credential-integrity function (issue, sign, verify, revoke, claim).

## Definition of done (per feature)
Runs locally, has loading/empty/error states, is on-brand, and — if it touches
credentials — has a passing integrity test.

## Build phases
The full phase-by-phase build plan (data model + prompts for Phases 0–9) is in
`docs/PLAYBOOK.md`. Phase 0 (this scaffold) is complete; run the remaining
phases in order and verify each before moving on.
