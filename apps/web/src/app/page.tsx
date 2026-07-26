import Image from 'next/image';
import { brand } from '@gdf/shared';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="gdf-globe-grid absolute inset-0" aria-hidden />
      <div className="gdf-hero-glow absolute inset-x-0 top-0 h-[60vh]" aria-hidden />

      <div className="relative mx-auto flex max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Image src="/gdf-logo.svg" alt="GDF — Global Diplomacy Forum" width={240} height={48} priority />
          <span className="rounded-sm border border-border bg-surface/60 px-3 py-1 text-xs uppercase tracking-widest text-muted">
            Free for MUNs
          </span>
        </header>

        <section className="mt-24 max-w-3xl">
          <p className="font-display text-sm uppercase tracking-[0.3em] text-accent">{brand.poweredBy}</p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">
            {brand.name}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            {brand.tagline} Organizers issue verifiable badges and certificates;
            delegates claim, collect, and share them — with conference meetings
            built in.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/signup"
              className="gdf-cta-gradient rounded-md px-7 py-3 font-display font-semibold text-background transition hover:opacity-90"
            >
              Issue credentials
            </a>
            <a
              href="/login"
              className="rounded-md border border-primary px-7 py-3 font-display font-semibold text-foreground transition hover:bg-surface"
            >
              Claim your badge
            </a>
          </div>
        </section>

        <section className="mt-28 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: 'Verifiable by anyone',
              body: 'Every credential carries a unique code and cryptographic signature with a public verify page.',
            },
            {
              title: 'Canva-style certificates',
              body: 'Design once, map a delegate sheet, and bulk-issue signed certificates in minutes.',
            },
            {
              title: 'Your conference, one app',
              body: 'Delegate rosters, awards, and self-hosted video meetings — no third-party tools needed.',
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border border-border bg-surface/50 p-6 backdrop-blur">
              <h2 className="font-display text-lg font-semibold text-accent">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>

        <footer className="mt-28 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted">
          <span>{brand.org} — a free gift to the Model UN community.</span>
          <span className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
