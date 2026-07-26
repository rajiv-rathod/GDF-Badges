# GDF CertView — Build Playbook

**Product:** MUN CertView, powered by GDF — a free, Credly-style credentialing +
all-in-one conference platform for Model UN.

Phase 0 (scaffold + brand system) is **done** — this repo is the result. Run the
remaining phases in order, one Claude Code session each, and verify each phase
works before starting the next.

---

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Web (organizer dashboard, certificate designer, public verify + profile pages) | **Next.js on Vercel** | Canva-style designer is a web tool — drag-drop field mapping is far easier on web than mobile. |
| Mobile (member app, Android-first) | **React Native + Expo** | Play Store path is smooth; reuses shared logic with web. |
| Backend / DB / Auth / Storage | **Supabase (Postgres)** | Auth + RLS handles organizer/member isolation and the "claim a badge issued to my email" flow. Storage holds rendered PDFs/PNGs. |
| Video | **Self-hosted Jitsi** | JWT-authed rooms via Jitsi iframe (web) + `@jitsi/react-native-sdk` (mobile). |
| Cert rendering | **Headless HTML→PDF (Playwright)** | HTML/CSS templates give true Canva-like design freedom for bulk generation. |
| AI | **Gemini API** | Modular — award citations, delegate-data cleanup, help assistant. |
| Sheets | **SheetJS (xlsx)** | Delegate import/export, bulk issuance from a sheet. |

Start on **managed Supabase free tier**; migrate to self-hosted at Phase 9 if
desired — the code is identical either way.

---

## Data model (the backbone)

- **organizations** — each MUN conference / issuing body is a tenant.
  `id, name, slug, brand_overrides, owner_id`
- **profiles** — extends Supabase auth users.
  `id, full_name, email, role (member|organizer|admin), public_slug, avatar_url`
- **org_members** — organizer-side team. `org_id, user_id, role_in_org (owner|admin|staff)`
- **badge_templates** — **fixed / predetermined** templates.
  `id, org_id (null = global GDF), name, description, image_url, criteria`
- **certificate_templates** — **fully customizable**.
  `id, org_id, name, background_url, layout_json, page_size, created_by`
  - `layout_json` = array of field defs:
    `[{ key, label, x, y, width, font, size, weight, align, color, sample }]`
- **credentials** — the issued thing (badge OR certificate).
  `id, type, org_id, template_id, recipient_email, recipient_user_id (null until claimed),
  recipient_name, fields_json, event_name, issued_at, issued_by,
  status (issued|claimed|revoked), verification_code (unique), signature, asset_url, is_public`
- **delegates** — MUN delegate management for import/export.
  `org_id, name, email, committee, country_portfolio, award`
- **meetings** — Jitsi rooms. `org_id, room_name, host_id, scheduled_at, jwt_config, status`
- **credential_events** — audit log. `credential_id, event (created|claimed|revoked|viewed), at`

**Two mechanisms that are the heart of the product:**

1. **Claim-by-email.** A credential can be issued to an email that has no account
   yet. On signup/login, a Postgres function `claim_pending_credentials(email)`
   links every matching credential to the new `user_id` and flips
   `status → claimed`.

2. **Verification.** `verification_code` is a random unguessable slug → public URL
   `/verify/{code}`. `signature` = a cryptographic signature over the canonical
   credential data so the verify page can prove authenticity. Revocation flips
   `status`; the verify page reflects it live. Aim toward **Open Badges 3.0**
   verifiable-credential semantics: verifiable + tamper-evident + revocable.

---

## Phase prompts (run one at a time in Claude Code)

### Phase 0 — Scaffold + brand system ✅ DONE
Monorepo (apps/web Next.js + Tailwind, apps/mobile Expo, packages/shared),
Supabase client wiring, brand-token system consumed by both apps, on-brand
landing/home screens.

### Phase 1 — Auth, roles, orgs, and claim-by-email
```
Build authentication and multi-tenancy on Supabase.
- Two signup flows: Organizer and Member. profiles table with role.
- Organizations table (each MUN conference = a tenant) + org_members for org teams.
- Postgres RLS so members see only their own + public data, organizers see only
  their org's data.
- The key feature: claim-by-email. Implement a claim_pending_credentials(email)
  Postgres function and trigger it on signup/login so any credential previously
  issued to that email links to the new user_id and flips status to 'claimed'.
  (The credentials table itself comes in Phase 2 — stub the function now and
  wire it fully in Phase 2.)
- On-brand auth screens on both web and mobile.
Deliver: I can sign up as an organizer, create a conference, and sign up as a member.
Include tests for the RLS rules and the claim function.
```

### Phase 2 — Credentials core + badges + verification
```
Build the credential engine.
- credentials table + credential_events audit log per the data model in this repo.
- badge_templates (fixed templates; seed 4–5 GDF-branded MUN badge templates:
  Participation, Best Delegate, Outstanding Delegate, Honourable Mention, Chair).
- Issuance: an organizer issues a badge to a recipient (by email). Generate a unique
  verification_code and a cryptographic signature over the canonical credential data
  (server-side only). Wire the Phase-1 claim function to real credentials.
- Public verification: /verify/{code} page (web) that fetches via a security-definer
  function, shows the credential, its authenticity/signature status, and issuer — and
  clearly shows REVOKED if revoked. Log a 'viewed' event.
- Revocation: organizer can revoke; verify page reflects it immediately.
Deliver: organizer issues a badge → member (or a stranger) can verify it at a public URL.
Tests for issue, sign, verify, revoke, and claim.
```

### Phase 3 — Certificate designer + bulk generation (the Canva-style piece)
```
This is the flagship feature. Build a certificate design + bulk-issue tool on web.

DESIGNER (organizer):
- Upload a background image/PDF for the certificate.
- Drag to place named fields on top of it (e.g. recipient_name, award, event_name,
  date, committee, signature). Each field stores key, x, y, width, font, size,
  weight, align, color, and a sample value. Live preview.
- Save as a certificate_template with layout_json. Certificates are FULLY custom
  (unlike badges). Support multiple templates per org.

BULK GENERATION:
- Organizer imports a delegate sheet (CSV/XLSX via SheetJS).
- Column-mapping UI: map each sheet column to a template field key
  (e.g. "Full Name" column -> recipient_name field). Exactly the Canva bulk-create feel.
- For each row: render the template via Playwright (HTML/CSS matching the layout_json)
  to a PDF, store it in Supabase Storage, and create a signed, verifiable credential
  of type 'certificate' issued to that row's email.
- Preview the first 3 before committing the full batch. Show progress.

Deliver: an organizer designs a certificate, imports 20 delegates, maps fields, and
bulk-issues 20 verifiable certificates — each with its own asset + verify URL. Test the
render + issuance path.
```

### Phase 4 — Member profile + shareable public pages
```
Build the member side.
- Member dashboard: all their claimed badges + certificates (issued-but-unclaimed
  ones show up automatically via the email match).
- Public, shareable profile at /u/{public_slug} showing their public credentials,
  each linking to its verify page. Per-credential public/private toggle.
- Download certificate PDF; copy shareable link for any single credential.
On-brand, responsive. Deliver: a member logs in, sees credentials issued to their email,
makes some public, and shares a working profile link.
```

### Phase 5 — Organizer dashboard + delegate management
```
Build the organizer control center on web.
- delegates table + import/export (XLSX) — the MUN delegate list per conference.
- Views: issue in bulk from delegates, issued-credentials list with status filters,
  revoke, resend/notify.
- Basic issuance analytics (issued / claimed / revoked counts).
Deliver: an organizer manages a full conference roster and its credentials end to end.
```

### Phase 6 — Android app (member-facing)
```
Build the Expo Android app for members (mirror of Phase 4, native).
- Auth (reuse Supabase), claim-by-email on login.
- View badges + certificates, verify, view/share public profile, download cert.
- On-brand GDF native UI using the shared tokens.
Deliver: an installable Android build (APK/AAB) where a member logs in, sees, verifies,
and shares their credentials. Give me the exact Expo build + Play Store submission steps.
```

### Phase 7 — Jitsi conference meetings
```
Integrate our self-hosted Jitsi.
- meetings table. Organizers create JWT-authed rooms scoped to their conference;
  only authorized org members can create/moderate.
- Web: embed via Jitsi iframe with the JWT. Mobile: @jitsi/react-native-sdk.
- Members join their conference's meetings from inside the app — no Zoom/Google needed.
I'll provide the Jitsi domain, app_id, and JWT secret. Deliver: an organizer starts a
meeting and a member joins it, both inside the app.
```

### Phase 8 — Gemini AI (modular, feature-flagged)
```
Add Gemini behind a feature flag.
- Auto-draft award citations / certificate wording from delegate context.
- Delegate-sheet cleanup (fix casing, split names, dedupe) before bulk issue.
- A help assistant for organizers ("how do I map fields?").
Keep each behind a flag; nothing breaks if the API key is absent. Deliver: at least the
citation generator and sheet cleanup working in the issue flow.
```

### Phase 9 — Hardening, Open Badges, ship
```
Production pass:
- Align credentials to Open Badges 3.0 (verifiable credential JSON, issuer profile,
  independently verifiable signature).
- Rate-limit issuance/verification, add revocation lists, audit review.
- Optional: migrate Supabase to self-hosted (code unchanged).
- Play Store: finalize listing, privacy policy, AAB, submission.
Deliver: a shippable v1 with an Open-Badges-compliant, verifiable credential system.
```

---

## Before each later phase (checklist)

1. Brand tokens are canonical in `packages/shared/src/tokens.ts` — sourced from gdf.social.
2. Supabase: create a managed project and fill `.env.local` (web) / `.env` (mobile)
   from the `.env.example` files.
3. Have ready: Jitsi domain + JWT secret (Phase 7), Gemini API key (Phase 8),
   Google Play developer account (Phase 6).
4. If Claude Code drifts off-brand or off-spec, point it back at `CLAUDE.md`.
