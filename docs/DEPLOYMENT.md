# Deployment — including the 1 GB / 2-core Oracle free instance

## Recommended topology (uses ~0 MB extra on your VM)

| Piece | Where | Cost |
|---|---|---|
| Web app (`apps/web`) | **Vercel** free tier | free |
| Database / auth / storage | **Managed Supabase** free tier | free |
| Video | **Your existing Jitsi** on the Oracle VM | already running |
| Android app | Play Store via **EAS Build** | free tier |

Your 1 GB instance already runs Jitsi — which wants most of that RAM for
itself under real meeting load. Vercel + managed Supabase are free at MUN
scale, and the code is identical if you later self-host. This is the setup we
recommend; everything below is the fallback.

### Setup steps (either topology)

1. **Supabase**: create a project → SQL editor → run
   `supabase/migrations/0001_init.sql`, then `supabase/seed.sql`.
   In Auth → Providers, enable Email. (Optional: disable "Confirm email"
   for instant signups at conferences.)
2. **Keys**: `node scripts/generate-signing-keys.mjs` → copy both values.
3. **Web env**: fill `apps/web/.env.local` from `apps/web/.env.example`
   (Supabase URL, anon key, service-role key, signing keys; Jitsi + Gemini
   optional).
4. **Vercel**: import the repo, set Root Directory to `apps/web`, add the
   same env vars, deploy.
5. **Mobile**: fill `apps/mobile/.env` and run
   `npx eas build -p android --profile preview` (APK for testing) or
   `--profile production` (AAB for Play Store), then `npx eas submit -p android`.

## All-on-the-VM fallback (web app self-hosted next to Jitsi)

Fits in 1 GB **only** with care. Do NOT try to self-host Supabase on this box
— the Supabase docker stack wants 2 GB+ by itself; keep the managed free tier.

1. **Add swap first** (protects Jitsi when Node spikes):
   ```bash
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
2. **Build elsewhere** — `next build` needs >1 GB. Build on your laptop or in
   GitHub Actions, then copy the output (the repo builds `standalone` output):
   ```bash
   npm install && npm run build:web
   rsync -a apps/web/.next/standalone/ vm:/opt/certview/
   rsync -a apps/web/.next/static/ vm:/opt/certview/apps/web/.next/static/
   rsync -a apps/web/public/ vm:/opt/certview/apps/web/public/
   ```
3. **Run capped** (~150–250 MB resident):
   ```bash
   cd /opt/certview && NODE_OPTIONS=--max-old-space-size=256 \
     PORT=3001 node apps/web/server.js
   ```
   Put it behind your existing reverse proxy (Caddy/nginx already serving
   Jitsi) with a `certview.` subdomain, and wrap it in a systemd unit with
   `Restart=always`.
4. Certificate PDFs render with **pdf-lib** (a few MB per render — this is why
   the app doesn't use headless-browser rendering), so bulk-issuing hundreds
   of certificates is fine on this box.

## Jitsi JWT setup (both topologies)

Your prosody needs token auth enabled (`authentication = "token"`, app_id +
app_secret). Set the same values as `JITSI_APP_ID` / `JITSI_JWT_SECRET`, and
`JITSI_DOMAIN=meet.yourdomain`. Members join through `/meet/{id}` in-app;
staff get moderator tokens automatically.
