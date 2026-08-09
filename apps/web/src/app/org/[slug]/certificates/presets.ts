import type { CertElement } from '@gdf/shared';

/**
 * Premade certificate designs. Generated from palette × archetype so the
 * gallery offers 40+ genuinely distinct, polished starting points. Every
 * preset is pure elements (no uploaded background needed), includes a
 * description field (AI-fillable at bulk issue) and a verification stamp
 * bound to the credential's Certificate ID. When an organizer uploads their
 * own background, the designer strips the full-page colour layer so the
 * upload shows through.
 */

export interface CertPreset {
  id: string;
  name: string;
  page_size: 'A4-landscape' | 'A4-portrait' | 'letter-landscape' | 'letter-portrait';
  /** Gallery tile colours. */
  tileBg: string;
  accent: string;
  layout: () => CertElement[];
}

interface Palette {
  id: string;
  name: string;
  bg: string;      // page colour
  ink: string;     // primary text on bg
  soft: string;    // secondary text on bg
  accent: string;  // frames / kicker
  accent2: string; // seals / highlights
  dark: boolean;
}

const PALETTES: Palette[] = [
  { id: 'navy', name: 'GDF Navy', bg: '#0c0a2e', ink: '#fdfafd', soft: '#bdb3d6', accent: '#d73cbe', accent2: '#ff45e1', dark: true },
  { id: 'light', name: 'GDF Light', bg: '#fdfafd', ink: '#1b1440', soft: '#6f6690', accent: '#d73cbe', accent2: '#a52b93', dark: false },
  { id: 'ivory', name: 'Ivory & Gold', bg: '#fbf7ef', ink: '#3b2f1e', soft: '#8a7a5c', accent: '#b08d2f', accent2: '#d4af37', dark: false },
  { id: 'emerald', name: 'Emerald', bg: '#0b2e1f', ink: '#f3f7f2', soft: '#9dbfae', accent: '#d4af37', accent2: '#e7cd6f', dark: true },
  { id: 'royal', name: 'Royal Blue', bg: '#0e1f4d', ink: '#f4f7ff', soft: '#a9bce3', accent: '#7fb2ff', accent2: '#bcd5ff', dark: true },
  { id: 'burgundy', name: 'Burgundy', bg: '#3d0f1f', ink: '#f7e9dd', soft: '#d3a9a9', accent: '#e8a1b0', accent2: '#f4c6cf', dark: true },
  { id: 'slate', name: 'Slate & Amber', bg: '#1e293b', ink: '#f1f5f9', soft: '#94a3b8', accent: '#f59e0b', accent2: '#fbbf24', dark: true },
  { id: 'teal', name: 'Deep Teal', bg: '#073d3d', ink: '#effffb', soft: '#8fc4bc', accent: '#57d1c1', accent2: '#8fe8db', dark: true },
  { id: 'blush', name: 'Blush', bg: '#fdf2f6', ink: '#4a1631', soft: '#a0708a', accent: '#d73cbe', accent2: '#ff45e1', dark: false },
  { id: 'charcoal', name: 'Charcoal Gold', bg: '#17150f', ink: '#f5efdd', soft: '#a89e83', accent: '#caa64b', accent2: '#e5c76b', dark: true },
];

let uid = 0;
const el = (partial: Record<string, unknown>): CertElement => ({ id: `p${uid++}`, ...partial } as unknown as CertElement);

const verif = (color: string): CertElement =>
  el({ type: 'verification', vmode: 'both', x: 60, y: 88, width: 32, font: 'Helvetica', size: 7, weight: 400, align: 'right', color });

const descField = (p: Palette, over: Record<string, unknown> = {}): CertElement =>
  el({
    type: 'field', key: 'description', label: 'Description', x: 18, y: 60, width: 64,
    font: 'Helvetica', size: 11, weight: 400, align: 'center', color: p.soft,
    sample: 'In recognition of exceptional diplomacy, research and leadership demonstrated throughout the conference.',
    ...over,
  });

/** Centered serif design with a double frame. */
function classicLayout(p: Palette): CertElement[] {
  return [
    el({ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: p.bg }),
    el({ type: 'rect', x: 3, y: 4.5, width: 94, height: 91, fill: 'none', stroke: p.accent, strokeWidth: 1.6 }),
    el({ type: 'rect', x: 4.2, y: 6.3, width: 91.6, height: 87.4, fill: 'none', stroke: p.soft, strokeWidth: 0.5 }),
    el({ type: 'text', text: 'CERTIFICATE OF ACHIEVEMENT', x: 10, y: 14, width: 80, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.accent }),
    el({ type: 'text', text: 'proudly presented to', x: 10, y: 26, width: 80, font: 'Times', size: 12, weight: 400, align: 'center', color: p.soft }),
    el({ type: 'field', key: 'recipient_name', label: 'Recipient', x: 8, y: 32, width: 84, font: 'Times', size: 40, weight: 700, align: 'center', color: p.ink, sample: 'Amina Rahman' }),
    el({ type: 'line', x: 35, y: 47, width: 30, height: 0, color: p.accent, thickness: 1 }),
    el({ type: 'field', key: 'award', label: 'Award', x: 14, y: 51, width: 72, font: 'Helvetica', size: 16, weight: 700, align: 'center', color: p.ink, sample: 'Best Delegate — UN Security Council' }),
    descField(p, { y: 59 }),
    el({ type: 'field', key: 'event_name', label: 'Event', x: 15, y: 72, width: 70, font: 'Helvetica', size: 12, weight: 400, align: 'center', color: p.soft, sample: 'GDF International MUN 2026' }),
    el({ type: 'field', key: 'date', label: 'Date', x: 8, y: 88, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: p.soft, sample: 'July 2026' }),
    verif(p.soft),
  ];
}

/** Left-aligned editorial design with an accent sidebar. */
function modernLayout(p: Palette): CertElement[] {
  return [
    el({ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: p.bg }),
    el({ type: 'rect', x: 0, y: 0, width: 5, height: 100, fill: p.accent }),
    el({ type: 'rect', x: 5, y: 0, width: 1.2, height: 100, fill: p.accent2, opacity: 0.55 }),
    el({ type: 'text', text: 'CERTIFICATE', x: 12, y: 14, width: 60, font: 'Helvetica', size: 14, weight: 700, align: 'left', color: p.accent }),
    el({ type: 'text', text: 'awarded to', x: 12, y: 26, width: 60, font: 'Helvetica', size: 11, weight: 400, align: 'left', color: p.soft }),
    el({ type: 'field', key: 'recipient_name', label: 'Recipient', x: 12, y: 31, width: 78, font: 'Helvetica', size: 42, weight: 700, align: 'left', color: p.ink, sample: 'Amina Rahman' }),
    el({ type: 'line', x: 12, y: 47, width: 22, height: 0, color: p.accent, thickness: 2 }),
    el({ type: 'field', key: 'award', label: 'Award', x: 12, y: 52, width: 70, font: 'Helvetica', size: 16, weight: 700, align: 'left', color: p.ink, sample: 'Outstanding Delegate — WHO' }),
    descField(p, { x: 12, y: 60, width: 70, align: 'left' }),
    el({ type: 'field', key: 'event_name', label: 'Event', x: 12, y: 74, width: 60, font: 'Helvetica', size: 12, weight: 400, align: 'left', color: p.soft, sample: 'GDF International MUN 2026' }),
    el({ type: 'field', key: 'date', label: 'Date', x: 12, y: 88, width: 30, font: 'Helvetica', size: 10, weight: 700, align: 'left', color: p.ink, sample: 'July 2026' }),
    verif(p.soft),
  ];
}

/** Centered design crowned by a ring seal. */
function sealLayout(p: Palette): CertElement[] {
  return [
    el({ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: p.bg }),
    el({ type: 'rect', x: 3.5, y: 5, width: 93, height: 90, fill: 'none', stroke: p.soft, strokeWidth: 0.6 }),
    el({ type: 'ellipse', x: 44.5, y: 9, width: 11, height: 15.5, fill: 'none', stroke: p.accent2, strokeWidth: 2 }),
    el({ type: 'ellipse', x: 45.6, y: 10.6, width: 8.8, height: 12.4, fill: 'none', stroke: p.accent, strokeWidth: 0.7 }),
    el({ type: 'text', text: 'GDF', x: 44.5, y: 14.6, width: 11, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.accent2 }),
    el({ type: 'text', text: 'AWARD OF EXCELLENCE', x: 10, y: 30, width: 80, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.accent }),
    el({ type: 'field', key: 'recipient_name', label: 'Recipient', x: 8, y: 37, width: 84, font: 'Times', size: 36, weight: 700, align: 'center', color: p.ink, sample: 'Amina Rahman' }),
    el({ type: 'field', key: 'award', label: 'Award', x: 14, y: 51, width: 72, font: 'Helvetica', size: 15, weight: 400, align: 'center', color: p.ink, sample: 'Best Delegate — General Assembly' }),
    descField(p, { y: 59 }),
    el({ type: 'field', key: 'event_name', label: 'Event', x: 15, y: 72, width: 70, font: 'Helvetica', size: 12, weight: 400, align: 'center', color: p.soft, sample: 'GDF International MUN 2026' }),
    el({ type: 'field', key: 'date', label: 'Date', x: 8, y: 88, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: p.soft, sample: 'July 2026' }),
    verif(p.soft),
  ];
}

/** Horizontal bands top and bottom, airy center. */
function bandLayout(p: Palette): CertElement[] {
  return [
    el({ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: p.bg }),
    el({ type: 'rect', x: 0, y: 0, width: 100, height: 7, fill: p.accent }),
    el({ type: 'rect', x: 0, y: 7, width: 100, height: 1.4, fill: p.accent2, opacity: 0.6 }),
    el({ type: 'rect', x: 0, y: 95, width: 100, height: 5, fill: p.accent, opacity: 0.9 }),
    el({ type: 'text', text: 'CERTIFICATE OF PARTICIPATION', x: 10, y: 16, width: 80, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.accent }),
    el({ type: 'text', text: 'this certifies that', x: 10, y: 28, width: 80, font: 'Times', size: 12, weight: 400, align: 'center', color: p.soft }),
    el({ type: 'field', key: 'recipient_name', label: 'Recipient', x: 8, y: 33, width: 84, font: 'Times', size: 38, weight: 700, align: 'center', color: p.ink, sample: 'Amina Rahman' }),
    el({ type: 'field', key: 'award', label: 'Award', x: 14, y: 48, width: 72, font: 'Helvetica', size: 15, weight: 400, align: 'center', color: p.ink, sample: 'participated as Delegate of France' }),
    descField(p, { y: 56 }),
    el({ type: 'line', x: 30, y: 70, width: 40, height: 0, color: p.soft, thickness: 0.6 }),
    el({ type: 'field', key: 'event_name', label: 'Event', x: 15, y: 73, width: 70, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.ink, sample: 'GDF International MUN 2026' }),
    el({ type: 'field', key: 'date', label: 'Date', x: 8, y: 87, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: p.soft, sample: 'July 2026' }),
    verif(p.soft),
  ];
}

const ARCHETYPES: Array<{ id: string; name: string; build: (p: Palette) => CertElement[] }> = [
  { id: 'classic', name: 'Classic', build: classicLayout },
  { id: 'modern', name: 'Modern', build: modernLayout },
  { id: 'seal', name: 'Seal', build: sealLayout },
  { id: 'band', name: 'Band', build: bandLayout },
];

function buildPresets(): CertPreset[] {
  const out: CertPreset[] = [];
  for (const arch of ARCHETYPES) {
    for (const p of PALETTES) {
      out.push({
        id: `${arch.id}-${p.id}`,
        name: `${arch.name} · ${p.name}`,
        page_size: 'A4-landscape',
        tileBg: p.bg,
        accent: p.accent,
        layout: () => {
          uid = 0;
          return arch.build(p);
        },
      });
    }
  }
  // Minimal — a clean white starter kept from the original set.
  out.push({
    id: 'minimal',
    name: 'Minimal · White',
    page_size: 'A4-landscape',
    tileBg: '#ffffff',
    accent: '#1b1440',
    layout: () => {
      uid = 0;
      const p = PALETTES[1];
      return [
        el({ type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' }),
        el({ type: 'text', text: 'CERTIFICATE OF ACHIEVEMENT', x: 10, y: 20, width: 80, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: p.soft }),
        el({ type: 'field', key: 'recipient_name', label: 'Recipient', x: 8, y: 32, width: 84, font: 'Helvetica', size: 44, weight: 700, align: 'center', color: p.ink, sample: 'Amina Rahman' }),
        el({ type: 'field', key: 'award', label: 'Award', x: 14, y: 50, width: 72, font: 'Helvetica', size: 16, weight: 400, align: 'center', color: '#4b4368', sample: 'Best Delegate — UN Security Council' }),
        descField(p, { y: 58 }),
        el({ type: 'field', key: 'event_name', label: 'Event', x: 15, y: 71, width: 70, font: 'Helvetica', size: 12, weight: 400, align: 'center', color: p.soft, sample: 'GDF International MUN 2026' }),
        el({ type: 'line', x: 20, y: 83, width: 60, height: 0, color: '#d9d3e6', thickness: 0.8 }),
        el({ type: 'field', key: 'date', label: 'Date', x: 8, y: 87, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: p.soft, sample: 'July 2026' }),
        verif(p.soft),
      ];
    },
  });
  return out;
}

export const CERT_PRESETS: CertPreset[] = buildPresets();

/** The default starting layout for a brand-new blank template. */
export function blankLayout(): CertElement[] {
  return CERT_PRESETS.find((p) => p.id === 'minimal')!.layout();
}
