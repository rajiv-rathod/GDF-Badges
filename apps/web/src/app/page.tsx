import Image from 'next/image';
import { brand } from '@gdf/shared';
import { CinematicStage } from '@/components/cinematic-stage';
import { FeatureSlider } from '@/components/feature-slider';
import { Reveal } from '@/components/reveal';
import { getLandingContent } from '@/lib/server/landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const c = await getLandingContent();

  return (
    <main className="relative overflow-x-clip">
      {c.banner ? (
        <div className="gdf-cta-gradient px-6 py-2 text-center text-sm font-semibold text-white">{c.banner}</div>
      ) : null}

      {/* Floating brand header over the cinematic stage */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <Image src="/gdf-logo.svg" alt="GDF — Global Diplomacy Forum" width={200} height={45} priority className="pointer-events-auto" />
        <div className="pointer-events-auto flex items-center gap-3">
          <span className="hidden rounded-full border border-border bg-surface/70 px-3 py-1 text-xs uppercase tracking-widest text-muted backdrop-blur sm:inline">
            Free for MUNs
          </span>
          <a href="/login" className="rounded-full border border-primary/40 bg-surface/70 px-4 py-1.5 text-sm font-display font-semibold text-primary-dark backdrop-blur transition hover:bg-primary/10">
            Sign in
          </a>
        </div>
      </header>

      {/* Cinematic scroll hero */}
      <CinematicStage />

      <div className="relative mx-auto flex max-w-5xl flex-col px-6 pb-10">
        {/* Feature slider */}
        <section className="mt-24">
          <FeatureSlider />
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
            <a href="/data-collection" className="hover:text-foreground">Data collection</a>
            <a href="/terms" className="hover:text-foreground">Terms</a>
          </span>
        </footer>
      </div>
    </main>
  );
}
