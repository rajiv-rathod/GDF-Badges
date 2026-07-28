'use client';

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export interface TourStep {
  /** Value of the `data-tour` attribute on the element to highlight. */
  target: string;
  title: string;
  body: string;
  /** Preferred tooltip placement; falls back automatically if it won't fit. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8; // spotlight breathing room around the target
const GAP = 14; // distance from target to tooltip
const CARD_W = 320;

function versionKey(tourId: string) {
  return `gdf_tour_${tourId}_v1`;
}

/**
 * Polished first-run walkthrough. Dims the page, spotlights each anchored
 * element (found by its `data-tour` attribute), and floats an on-brand
 * tooltip with Back / Next controls. Runs once per user per tour (persisted
 * in localStorage) and can be replayed via the `gdf:tour:<id>` window event.
 */
export function OnboardingTour({ tourId, steps }: { tourId: string; steps: TourStep[] }) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);

  // Decide whether to auto-run on first paint (avoids a flash for returners).
  useEffect(() => {
    let seen = true;
    try {
      seen = !!window.localStorage.getItem(versionKey(tourId));
    } catch {
      seen = false;
    }
    if (!seen) {
      // Small delay so the target layout has settled after hydration.
      const t = setTimeout(() => {
        setIndex(0);
        setActive(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [tourId]);

  // Allow an explicit replay from anywhere (e.g. a "Take the tour" button).
  useEffect(() => {
    const onReplay = () => {
      setIndex(0);
      setActive(true);
    };
    window.addEventListener(`gdf:tour:${tourId}`, onReplay);
    return () => window.removeEventListener(`gdf:tour:${tourId}`, onReplay);
  }, [tourId]);

  const finish = useCallback(() => {
    setActive(false);
    setReady(false);
    try {
      window.localStorage.setItem(versionKey(tourId), '1');
    } catch {
      /* ignore private-mode failures */
    }
  }, [tourId]);

  const measure = useCallback(() => {
    if (!active) return;
    const step = steps[index];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) {
      // Target not on this page — skip it so the tour never dead-ends.
      if (index < steps.length - 1) setIndex((i) => i + 1);
      else finish();
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    setReady(true);
  }, [active, index, steps, finish]);

  // Scroll the target into view when the step changes, then measure.
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(measure, 320);
    return () => clearTimeout(t);
  }, [active, index, steps, measure]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, measure]);

  // Keyboard controls.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  function next() {
    if (index < steps.length - 1) {
      setReady(false);
      setIndex((i) => i + 1);
    } else finish();
  }
  function back() {
    if (index > 0) {
      setReady(false);
      setIndex((i) => i - 1);
    }
  }

  if (!active || !rect || !ready) return null;
  const step = steps[index];
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };

  // Choose a placement with room; default below, flip above if needed.
  const spaceBelow = vh - (rect.top + rect.height);
  const placeBelow = step.placement === 'bottom' || (step.placement !== 'top' && spaceBelow > 220);
  let cardTop = placeBelow ? hole.top + hole.height + GAP : hole.top - GAP - 190;
  let cardLeft = rect.left + rect.width / 2 - CARD_W / 2;
  cardLeft = Math.max(16, Math.min(cardLeft, vw - CARD_W - 16));
  cardTop = Math.max(16, Math.min(cardTop, vh - 210));

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite" role="dialog" aria-modal="true">
      {/* Blocking backdrop (transparent — the shadow on the spotlight darkens it). */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Spotlight: a rounded window punched out of a full-screen dark shadow. */}
      <div
        className="pointer-events-none absolute rounded-xl transition-all duration-300 ease-out"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 9999px rgba(11,6,32,0.72)',
          outline: '2px solid #ff45e1',
          outlineOffset: '2px',
        }}
      />
      {/* Soft pulsing ring for extra polish. */}
      <div
        className="pointer-events-none absolute animate-pulse rounded-xl"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          boxShadow: '0 0 0 4px rgba(215,60,190,0.35)',
        }}
      />
      {/* Transparent click-through advancer over the highlighted element. */}
      <button
        aria-label="Next step"
        onClick={next}
        className="absolute cursor-pointer rounded-xl"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, background: 'transparent' }}
      />

      {/* Tooltip card. */}
      <div
        className="absolute w-[320px] rounded-xl border border-primary/30 bg-surface p-5 shadow-2xl transition-all duration-300 ease-out"
        style={{ top: cardTop, left: cardLeft }}
      >
        <div className="flex items-center justify-between">
          <span className="gdf-cta-gradient rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-background">
            Step {index + 1} / {steps.length}
          </span>
          <button onClick={finish} className="text-xs font-semibold text-muted hover:text-foreground">
            Skip tour
          </button>
        </div>
        <h3 className="mt-3 font-display text-lg font-bold text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 ? (
              <button
                onClick={back}
                className="rounded-sm border border-border px-3 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground"
              >
                Back
              </button>
            ) : null}
            <button
              onClick={next}
              className="gdf-cta-gradient rounded-sm px-4 py-1.5 text-sm font-display font-semibold text-background transition hover:opacity-90"
            >
              {index === steps.length - 1 ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
