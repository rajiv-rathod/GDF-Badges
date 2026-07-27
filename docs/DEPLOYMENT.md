# Deployment

## Recommended topology (current production setup)

| Piece | Where | Cost |
|---|---|---|
| Web app (`apps/web`) | **Vercel** free tier — Root Directory `apps/web` | free |
| Database / auth / storage | **Managed Supabase** free tier | free |
| Video | **GDF meeting app** at https://meet.apextech.llc (external) | — |
| Android app | Play Store via **EAS Build** (later) | free tier |

Full step-by-step: `docs/RELEASE.md`.

### Vercel settings that matter

- **Root Directory: `apps/web`** — this is a monorepo; leaving it blank makes
  Vercel misdetect the framework and the build fails.
- Framework preset: Next.js (auto once root dir is right). Leave build/install
  commands at their defaults.
- Env vars: the five required ones from `apps/web/.env.example`
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIAL_SIGNING_KEY`,
  `NEXT_PUBLIC_CREDENTIAL_PUBLIC_KEY`), plus optional `RESEND_API_KEY` /
  `EMAIL_FROM` / `GEMINI_API_KEY`.
- Supabase's new-format API keys work directly: `sb_publishable_…` is the anon
  key, `sb_secret_…` is the service-role key.

## Self-hosting fallback (small VM, ~1 GB RAM)

The app builds with `output: standalone`, so it can run on a small VM:

1. Add 2 GB of swap (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`).
2. Build elsewhere (`next build` needs >1 GB), rsync `.next/standalone`,
   `.next/static`, and `public/` to the VM.
3. Run capped: `NODE_OPTIONS=--max-old-space-size=256 PORT=3001 node apps/web/server.js`
   behind your reverse proxy, wrapped in a systemd unit with `Restart=always`.
4. Keep Supabase managed — the self-hosted Supabase docker stack needs 2 GB+ by
   itself and does not fit on a 1 GB host.

Certificate PDFs render with pdf-lib (a few MB per render — deliberately no
headless browser), so bulk issuance is fine on small hosts.
