'use client';

import { useEffect, useRef } from 'react';
import styles from './cinematic.module.css';

/**
 * GDF cinematic scroll hero. A sticky stage is scrubbed by a ~3000px scroll
 * rig; a requestAnimationFrame engine writes CSS custom properties onto the
 * stage each frame to drive three beats — hero → issue → verify — with pointer
 * parallax and inertial (lerped) scroll. All layers are CSS/SVG only, so the
 * hero is fully self-contained and on-brand. Honors prefers-reduced-motion.
 */
export function CinematicStage() {
  const rigRef = useRef<HTMLElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const rig = rigRef.current;
    const stage = stageRef.current;
    if (!rig || !stage) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const smoothstep = (e0: number, e1: number, v: number) => {
      const x = clamp((v - e0) / (e1 - e0));
      return x * x * (3 - 2 * x);
    };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const seg = (s: number, a: number, b: number, c: number, d: number) => {
      const enter = smoothstep(a, b, s);
      const exit = smoothstep(c, d, s);
      return { enter, exit, active: enter * (1 - exit) };
    };

    let targetMouseX = 0, targetMouseY = 0, mouseX = 0, mouseY = 0;
    let targetScroll = 0, smoothScroll = 0, initialized = false, raf = false;

    const scrollDistance = () => {
      const r = rig.getBoundingClientRect();
      return clamp(-r.top, 0, rig.offsetHeight - window.innerHeight);
    };

    const set = (k: string, v: string) => stage.style.setProperty(k, v);

    const update = () => {
      raf = false;
      targetScroll = scrollDistance();
      if (!initialized || reduce.matches) {
        smoothScroll = targetScroll;
        initialized = true;
      } else {
        smoothScroll = lerp(smoothScroll, targetScroll, 0.14);
      }
      if (Math.abs(smoothScroll - targetScroll) < 0.08) smoothScroll = targetScroll;
      mouseX = lerp(mouseX, targetMouseX, 0.12);
      mouseY = lerp(mouseY, targetMouseY, 0.12);
      const px = reduce.matches ? 0 : mouseX;
      const py = reduce.matches ? 0 : mouseY;

      const s = smoothScroll;
      const progress = clamp(s / 3000);
      const introExit = smoothstep(120, 760, s);
      const frame2 = seg(s, 620, 1040, 1520, 1880);
      const frame3 = seg(s, 1960, 2360, 2760, 3000);

      set('--px', px.toFixed(4));
      set('--py', py.toFixed(4));

      set('--title-y', `${introExit * -180}px`);
      set('--title-scale', `${1 - introExit * 0.1}`);
      set('--title-op', `${1 - introExit}`);
      set('--intro-y', `${introExit * 84}px`);
      set('--intro-op', `${1 - introExit}`);
      set('--grid-op', `${1 - introExit * 0.5}`);
      set('--clouds-scale', `${1 + progress * 0.16}`);

      // Issue beat — certificate mockup + panel
      set('--cert-op', `${frame2.active}`);
      set('--cert-y', `${40 - frame2.enter * 40 - frame2.exit * 90}px`);
      set('--cert-scale', `${0.92 + frame2.enter * 0.13 - frame2.exit * 0.05}`);
      set('--cert-rot', `${-6 + frame2.enter * 6}deg`);
      set('--panel2-op', `${frame2.active * (1 - frame2.exit)}`);
      set('--panel2-y', `${-frame2.exit * 80 + (1 - frame2.enter) * 44}px`);

      // Verify beat — seal + panel
      set('--seal-op', `${frame3.active}`);
      set('--seal-scale', `${0.72 + frame3.enter * 0.32 - frame3.exit * 0.08}`);
      set('--panel3-op', `${frame3.active * (1 - frame3.exit)}`);
      set('--panel3-y', `${-frame3.exit * 80 + (1 - frame3.enter) * 44}px`);

      set('--shade-a', `${clamp(frame2.active * 0.55 + frame3.active * 0.7)}`);

      if (
        Math.abs(smoothScroll - targetScroll) > 0.08 ||
        Math.abs(mouseX - targetMouseX) > 0.001 ||
        Math.abs(mouseY - targetMouseY) > 0.001
      ) {
        requestTick();
      }
    };

    const requestTick = () => {
      if (!raf) {
        raf = true;
        requestAnimationFrame(update);
      }
    };

    const onScroll = () => requestTick();
    const onResize = () => requestTick();
    const onMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove, { passive: true });
    requestTick();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return (
    <section ref={rigRef} className={styles.rig} aria-label="MUN CertView overview">
      <div ref={stageRef} className={styles.stage}>
        <div className={styles.world}>
          <div className={`${styles.layer} ${styles.clouds}`} aria-hidden />
          <div className={`${styles.layer} ${styles.grid}`} aria-hidden />
          <div className={`${styles.layer} ${styles.bloom}`} aria-hidden />

          {/* Hero title */}
          <h1 className={`${styles.layer} ${styles.title}`}>
            <span className={styles.kicker}>Powered by the Global Diplomacy Forum</span>
            Verify every <span className={styles.accent}>credential.</span>
          </h1>

          {/* Certificate mockup (issue beat) */}
          <div className={`${styles.layer} ${styles.cert}`} aria-hidden>
            <div className={styles.certInner}>
              <div className={`${styles.certBar} ${styles.w1}`} />
              <div className={`${styles.certBar} ${styles.w2}`} />
              <div className={`${styles.certBar} ${styles.w3}`} />
            </div>
            <span className={styles.certId}>ID · GDF-7Q2X…VERIFY</span>
            <div className={styles.certSeal}>GDF</div>
          </div>

          {/* Verify mark (verify beat) */}
          <div className={`${styles.layer} ${styles.verifyMark}`} aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="#d73cbe" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>

          <div className={`${styles.shade}`} aria-hidden />

          {/* Story panels */}
          <div className={`${styles.panel} ${styles.panelIssue}`}>
            <h2>Design once. <em>Issue thousands.</em></h2>
            <p>Upload your certificate, drop in fields, map a delegate sheet, and bulk-issue signed, on-brand credentials in minutes.</p>
          </div>
          <div className={`${styles.panel} ${styles.panelVerify}`}>
            <h2>Signed. Sealed. <em>Verifiable.</em></h2>
            <p>Every credential carries a unique Certificate ID and a cryptographic signature, provable by anyone at a public verify page.</p>
          </div>

          {/* Intro copy + CTAs */}
          <div className={`${styles.layer} ${styles.intro}`}>
            <p>A free, Credly-style credentialing platform built for Model UN — issue verifiable badges &amp; certificates your delegates keep for life.</p>
            <div className={styles.ctaRow}>
              <a href="/signup" className={styles.ctaPrimary}>Issue credentials</a>
              <a href="/login" className={styles.ctaGhost}>Claim your badge</a>
            </div>
          </div>

          <span className={styles.cue} aria-hidden>Scroll</span>
        </div>
      </div>
    </section>
  );
}
