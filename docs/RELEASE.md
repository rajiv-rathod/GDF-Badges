# Go-live runbook — ship MUN CertView today

Work through this top to bottom. Steps marked **[you]** need your accounts and
cannot be done by anyone else.

## 1. Backend (~5 min) **[you]**

1. Create a project at https://supabase.com (free tier).
2. SQL editor → paste + run `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
3. Auth → Providers → Email: enabled. For conference-day instant signups,
   turn OFF "Confirm email" (optional).
4. Settings → API: copy the Project URL, `anon` key, and `service_role` key.

## 2. Signing keys (~1 min)

```bash
node scripts/generate-signing-keys.mjs
```
Keep `CREDENTIAL_SIGNING_KEY` secret. Losing it means re-issuing credentials —
store it in a password manager too.

## 3. Web deploy (~10 min) **[you]**

Vercel → New Project → import this repo → Root Directory: `apps/web`.
Environment variables (from `apps/web/.env.example`):

| Var | Required | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | step 1 |
| `CREDENTIAL_SIGNING_KEY` | ✅ | step 2 |
| `NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY` | ✅ | step 2 |
| `RESEND_API_KEY` | optional | resend.com — enables issue emails |
| `EMAIL_FROM` | optional | verified sender |
| `JITSI_DOMAIN` / `JITSI_APP_ID` / `JITSI_JWT_SECRET` | optional | your Jitsi |
| `GEMINI_API_KEY` | optional | AI features |

Deploy → smoke test: sign up as Organizer → create conference → issue a badge
to a second email → open the verify link in an incognito window → shows
✓ VERIFIED. Then revoke it → refresh → shows REVOKED.

## 4. Android app (~30 min + review time) **[you]**

Requires a Google Play developer account ($25 one-time) and a free Expo account.

```bash
cd apps/mobile
cp .env.example .env       # fill with Supabase URL/key + your web URL (local dev)
npx eas login
```

EAS builds do NOT read your local `.env` (it is gitignored) — the build
profiles are pinned to EAS environments, so create the variables once for
each environment (they are public client values, plaintext is fine):

```bash
for ENV in preview production; do
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOURPROJECT.supabase.co" --visibility plaintext
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --visibility plaintext
  npx eas env:create --environment $ENV --name EXPO_PUBLIC_WEB_URL --value "https://YOUR-WEB-DOMAIN" --visibility plaintext
done

npx eas build -p android --profile preview      # APK to sideload-test today
npx eas build -p android --profile production   # AAB for Play Store
npx eas submit -p android                       # after the app exists in Play Console
```

Play Console → Create app:
- **App name:** MUN CertView — powered by GDF
- **Short description (80):** Collect, verify & share your Model UN badges and certificates. Free, by GDF.
- **Full description:** MUN CertView is the free credential wallet for the Model
  UN community, built by the Global Diplomacy Forum. Receive verifiable badges
  and certificates from conferences, claim everything issued to your email the
  moment you sign up, share your public delegate profile, and let anyone verify
  your awards with a tamper-evident cryptographic check. No ads, no fees — a
  gift to the MUN community.
- **Category:** Education · **Privacy policy URL:** `https://<your-web-domain>/privacy`
- **Data safety form:** collects name + email (account), not shared, encrypted
  in transit, deletable on request.
- Content rating questionnaire: no objectionable content → Everyone.

Google review typically takes 1–3 days for a first submission. To put the app
in delegates' hands *today*, distribute the **preview APK** directly (EAS gives
a QR/download link) while the Play review runs.

## 5. Jitsi meetings (optional, ~10 min) **[you]**

On your Jitsi VM, enable JWT auth in prosody (`authentication = "token"`,
set `app_id`/`app_secret`), restart prosody + jicofo, then set the three
`JITSI_*` vars in Vercel and redeploy.

## 6. Day-one checklist

- [ ] Verify page shows ✓ VERIFIED for a real credential (incognito)
- [ ] Revoked credential shows REVOKED
- [ ] Bulk-issue 3 test certificates from a sheet; PDFs download
- [ ] Claim-by-email: issue to an address with no account → sign up with it → credential is in the wallet
- [ ] `/privacy` and `/terms` load (Play Store requires the privacy URL)
- [ ] Custom domain + HTTPS on Vercel (Settings → Domains)
- [ ] `CREDENTIAL_SIGNING_KEY` backed up in a password manager
