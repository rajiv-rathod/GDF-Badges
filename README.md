# MUN CertView — powered by GDF

A **free**, Credly-style credentialing + all-in-one conference platform for
Model UN, built by the **Global Diplomacy Forum**. Organizers issue verifiable
badges and certificates to delegates; members claim, collect, verify, and share
them — with self-hosted video meetings built in.

> **Status:** Phase 0 complete (scaffold + GDF brand system).
> The full build plan is in [`docs/PLAYBOOK.md`](docs/PLAYBOOK.md); project
> conventions and brand tokens are in [`CLAUDE.md`](CLAUDE.md).

## Repo layout

```
apps/web         Next.js (App Router + Tailwind) — organizer dashboard, designer,
                 public verify + profile pages. Deploys to Vercel.
apps/mobile      Expo (React Native, Android-first) — member app.
packages/shared  Brand tokens, data-model types, Supabase client factory.
docs/PLAYBOOK.md Phase-by-phase build plan (Phases 0–9) + data model.
```

## Getting started

Requires Node 20+.

```bash
npm install            # installs all workspaces from the repo root
```

**Web** (http://localhost:3000):

```bash
npm run web
```

**Mobile** (Expo dev server — scan the QR with Expo Go on Android):

```bash
npm run mobile
```

**Supabase:** create a project at supabase.com, then copy
`apps/web/.env.example → apps/web/.env.local` and
`apps/mobile/.env.example → apps/mobile/.env` and fill in your project URL +
anon key. (Not needed to run the Phase 0 screens.)

## Brand

All colors, fonts, radii, and effects come from
`packages/shared/src/tokens.ts` — the single source of truth for both apps,
extracted from the live [gdf.social](https://gdf.social) site. Deep midnight
navy `#06002e`, GDF magenta `#d73cbe`, bright pink `#ff45e1`. If a screen looks
like a generic SaaS starter, it's wrong.
