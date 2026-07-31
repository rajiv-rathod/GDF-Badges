'use client';

import { useRef, useState } from 'react';

interface Feature {
  kicker: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {path.split('|').map((d, i) => <path key={i} d={d} />)}
  </svg>
);

const FEATURES: Feature[] = [
  { kicker: 'Fixed templates', title: 'Badges', body: 'Award Participation, Best Delegate and more from polished GDF badge templates.', icon: icon('M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z|M9 12l2 2 4-4') },
  { kicker: 'Canva-style', title: 'Certificates', body: 'Upload a background, drag fields, add logos, shapes and colours, then bulk-issue signed PDFs.', icon: icon('M4 4h16v16H4z|M8 9h8|M8 13h5') },
  { kicker: 'Collect & share', title: 'Wallet', body: 'Delegates gather every credential in one place and share a public profile link.', icon: icon('M3 7h18v12H3z|M3 7l2-3h14l2 3|M16 13h.01') },
  { kicker: 'Tamper-evident', title: 'Verification', body: 'A unique Certificate ID and Ed25519 signature anyone can check at a public page.', icon: icon('M12 3l7 4v5c0 5-3 8-7 9-4-1-7-4-7-9V7z|M9 12l2 2 4-4') },
  { kicker: 'Track engagement', title: 'Analytics', body: 'See issued, claimed, shared and verified counts across your whole conference.', icon: icon('M4 20V4|M4 20h16|M8 16v-4|M12 16V8|M16 16v-7') },
  { kicker: 'Run committees', title: 'Meetings', body: 'Launch straight into live committee sessions in the GDF meeting app.', icon: icon('M15 10l5-3v10l-5-3z|M3 6h12v12H3z') },
];

export function FeatureSlider() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  function move(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.8, 380);
    el.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }

  return (
    <div className="relative">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm uppercase tracking-[0.3em] text-primary-dark">Everything in one place</p>
          <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">One platform, every credential</h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            aria-label="Previous"
            onClick={() => move(-1)}
            disabled={atStart}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg text-foreground transition enabled:hover:border-primary disabled:opacity-40"
          >
            ←
          </button>
          <button
            aria-label="Next"
            onClick={() => move(1)}
            disabled={atEnd}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-lg text-foreground transition enabled:hover:border-primary disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="group relative flex min-h-[236px] w-[300px] flex-none snap-start flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
          >
            <div className="gdf-cta-gradient flex h-12 w-12 items-center justify-center rounded-xl text-white [&_svg]:h-6 [&_svg]:w-6">
              {f.icon}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">{f.kicker}</p>
            <h3 className="mt-1 font-display text-xl font-bold text-primary-dark">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
