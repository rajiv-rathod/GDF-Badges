import Image from 'next/image';
import { brand } from '@gdf/shared';
import { Reveal } from '@/components/reveal';
import { getLandingContent } from '@/lib/server/landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const c = await getLandingContent();

  return (
    <main className="relative overflow-hidden">
      {c.banner ? (
        <div className="gdf-cta-gradient px-6 py-2 text-center text-sm font-semibold text-white">{c.banner}</div>
      ) : null}

      <div className="gdf-globe-grid absolute inset-0 h-screen" aria-hidden />
      <div className="gdf-hero-glow absolute inset-x-0 top-0 h-[60vh]" aria-hidden />

      <div className="relative mx-auto flex max-w-5xl flex-col px-6 py-10">
        <header className="flex items-center justify-between">
          <Image src="/gdf-logo.svg" alt="GDF — Global Diplomacy Forum" width={240} height={54} priority />
          <span className="rounded-sm border border-border bg-surface/70 px-3 py-1 text-xs uppercase tracking-widest text-muted">
            Free for MUNs
          </span>
        </header>

        {/* Hero */}
        <section className="mt-24 max-w-3xl">
          <Reveal>
            <p className="font-display text-sm uppercase tracking-[0.3em] text-primary-dark">{brand.poweredBy}</p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 font-display text-5xl font-bold leading-tight sm:text-6xl">{c.headline}</h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-lg text-muted">{c.subhead}</p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href="/signup" className="gdf-cta-gradient rounded-md px-7 py-3 font-display font-semibold text-white transition hover:opacity-90">
                Issue credentials
              </a>
              <a href="/login" className="rounded-md border border-primary px-7 py-3 font-display font-semibold text-primary-dark transition hover:bg-primary/10">
                Claim your badge
              </a>
              <a href={brand.meetingAppUrl} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-surface/70 px-7 py-3 font-display font-semibold text-foreground transition hover:border-primary">
                Launch meeting app ↗
              </a>
            </div>
          </Reveal>
        </section>

        {/* Feature cards */}
        <section className="mt-28 grid gap-6 sm:grid-cols-3">
          {[
            { title: 'Verifiable by anyone', body: 'Every credential carries a unique certificate ID and cryptographic signature with a public verify page.' },
            { title: 'Canva-style certificates', body: 'Design once, map a delegate sheet, and bulk-issue signed certificates in minutes.' },
            { title: 'Your conference, one place', body: 'Delegate rosters, awards, analytics — and committee sessions in the GDF meeting app.' },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="h-full rounded-lg border border-border bg-surface/80 p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-md">
                <h2 className="font-display text-lg font-semibold text-primary-dark">{f.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        {/* About */}
        <section className="mt-32 max-w-3xl">
          <Reveal>
            <h2 className="font-display text-3xl font-bold">{c.about_title}</h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted">{c.about_body}</p>
          </Reveal>
          <Reveal delay={160}>
            <dl className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { k: 'Issue', v: 'Badges & fully-custom certificates, in bulk from any spreadsheet.' },
                { k: 'Claim', v: 'Delegates get an email and collect everything in one wallet.' },
                { k: 'Verify', v: 'Anyone confirms authenticity at a public, tamper-evident link.' },
              ].map((s) => (
                <div key={s.k} className="border-t-2 border-primary/40 pt-4">
                  <dt className="font-display text-lg font-semibold">{s.k}</dt>
                  <dd className="mt-1 text-sm text-muted">{s.v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>

        {/* CTA */}
        <Reveal className="mt-32">
          <div className="gdf-cta-gradient flex flex-col items-center gap-4 rounded-2xl px-8 py-14 text-center text-white">
            <h2 className="font-display text-3xl font-bold">Run a conference? Start issuing today.</h2>
            <p className="max-w-lg text-white/90">Free forever for the Model UN community. No credit card, no limits.</p>
            <a href="/signup" className="mt-2 rounded-md bg-white px-8 py-3 font-display font-semibold text-primary-dark transition hover:bg-white/90">
              Create your free account
            </a>
          </div>
        </Reveal>

        <footer className="mt-24 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm text-muted">
          <span>
            {brand.org} — a free gift to the Model UN community ·{' '}
            <a href={`mailto:${brand.supportEmail}`} className="hover:text-foreground">{brand.supportEmail}</a>
          </span>
          <span className="flex gap-4">
            <a href="/privacy" className="hover:text-foreground">Privacy</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
