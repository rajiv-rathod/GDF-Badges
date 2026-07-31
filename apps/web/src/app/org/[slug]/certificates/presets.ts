import type { CertElement } from '@gdf/shared';

/**
 * Premade certificate designs. Each preset is a ready-to-edit layout built
 * entirely from elements (no uploaded background required) — organizers pick
 * one, then customise colours, fields, logos and text in the designer. Every
 * preset includes a verification stamp bound to the credential's Certificate
 * ID so the printed ID always matches the public verify URL.
 */

export interface CertPreset {
  id: string;
  name: string;
  page_size: 'A4-landscape' | 'A4-portrait' | 'letter-landscape' | 'letter-portrait';
  accent: string;
  layout: () => CertElement[];
}

const NAVY = '#0c0a2e';
const INK = '#1b1440';
const MAGENTA = '#d73cbe';
const PINK = '#ff45e1';
const PAPER = '#fdfafd';
const MUTED = '#6f6690';

const verif = (over: Partial<CertElement> = {}): CertElement =>
  ({ id: 'verif', type: 'verification', vmode: 'both', x: 8, y: 90, width: 60, font: 'Helvetica', size: 8, weight: 400, align: 'left', color: MUTED, ...over } as CertElement);

export const CERT_PRESETS: CertPreset[] = [
  {
    id: 'classic-navy',
    name: 'Classic Navy',
    page_size: 'A4-landscape',
    accent: MAGENTA,
    layout: () => [
      { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: NAVY },
      { id: 'frame', type: 'rect', x: 3, y: 4.5, width: 94, height: 91, fill: 'none', stroke: MAGENTA, strokeWidth: 2 },
      { id: 'kicker', type: 'text', text: 'CERTIFICATE OF ACHIEVEMENT', x: 10, y: 18, width: 80, font: 'Helvetica', size: 13, weight: 700, align: 'center', color: PINK },
      { id: 'name', type: 'field', key: 'recipient_name', label: 'Recipient', x: 10, y: 36, width: 80, font: 'Times', size: 40, weight: 700, align: 'center', color: PAPER, sample: 'Amina Rahman' },
      { id: 'award', type: 'field', key: 'award', label: 'Award', x: 15, y: 52, width: 70, font: 'Helvetica', size: 18, weight: 400, align: 'center', color: '#e9d6f2', sample: 'Best Delegate — UN Security Council' },
      { id: 'event', type: 'field', key: 'event_name', label: 'Event', x: 15, y: 62, width: 70, font: 'Helvetica', size: 13, weight: 400, align: 'center', color: '#bdb3d6', sample: 'GDF International MUN 2026' },
      { id: 'date', type: 'field', key: 'date', label: 'Date', x: 12, y: 84, width: 30, font: 'Helvetica', size: 11, weight: 400, align: 'left', color: '#bdb3d6', sample: 'July 2026' },
      verif({ color: '#8f86ad', align: 'right', x: 58, y: 84, width: 30 }),
    ],
  },
  {
    id: 'elegant-light',
    name: 'Elegant Light',
    page_size: 'A4-landscape',
    accent: MAGENTA,
    layout: () => [
      { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: PAPER },
      { id: 'frame', type: 'rect', x: 4, y: 6, width: 92, height: 88, fill: 'none', stroke: INK, strokeWidth: 1 },
      { id: 'frame2', type: 'rect', x: 5.2, y: 8, width: 89.6, height: 84, fill: 'none', stroke: MAGENTA, strokeWidth: 0.6 },
      { id: 'kicker', type: 'text', text: 'Certificate of Participation', x: 10, y: 20, width: 80, font: 'Times', size: 20, weight: 400, align: 'center', color: MAGENTA },
      { id: 'pre', type: 'text', text: 'This certifies that', x: 10, y: 34, width: 80, font: 'Helvetica', size: 11, weight: 400, align: 'center', color: MUTED },
      { id: 'name', type: 'field', key: 'recipient_name', label: 'Recipient', x: 10, y: 40, width: 80, font: 'Times', size: 42, weight: 700, align: 'center', color: INK, sample: 'Amina Rahman' },
      { id: 'line', type: 'line', x: 35, y: 55, width: 30, height: 0, color: MAGENTA, thickness: 1 },
      { id: 'award', type: 'field', key: 'award', label: 'Award', x: 15, y: 60, width: 70, font: 'Helvetica', size: 15, weight: 400, align: 'center', color: '#4b4368', sample: 'participated as Delegate of France' },
      { id: 'event', type: 'field', key: 'event_name', label: 'Event', x: 15, y: 68, width: 70, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: INK, sample: 'GDF International MUN 2026' },
      { id: 'date', type: 'field', key: 'date', label: 'Date', x: 12, y: 84, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: MUTED, sample: 'July 2026' },
      verif({ align: 'right', x: 58, y: 84, width: 30 }),
    ],
  },
  {
    id: 'modern-magenta',
    name: 'Modern Magenta',
    page_size: 'A4-landscape',
    accent: MAGENTA,
    layout: () => [
      { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: PAPER },
      { id: 'sidebar', type: 'rect', x: 0, y: 0, width: 6, height: 100, fill: MAGENTA },
      { id: 'topbar', type: 'rect', x: 0, y: 0, width: 100, height: 3, fill: PINK },
      { id: 'kicker', type: 'text', text: 'CERTIFICATE', x: 12, y: 22, width: 76, font: 'Helvetica', size: 15, weight: 700, align: 'left', color: MAGENTA },
      { id: 'name', type: 'field', key: 'recipient_name', label: 'Recipient', x: 12, y: 34, width: 76, font: 'Helvetica', size: 44, weight: 700, align: 'left', color: INK, sample: 'Amina Rahman' },
      { id: 'award', type: 'field', key: 'award', label: 'Award', x: 12, y: 52, width: 70, font: 'Helvetica', size: 17, weight: 400, align: 'left', color: '#4b4368', sample: 'Outstanding Delegate — WHO Committee' },
      { id: 'event', type: 'field', key: 'event_name', label: 'Event', x: 12, y: 60, width: 70, font: 'Helvetica', size: 13, weight: 400, align: 'left', color: MUTED, sample: 'GDF International MUN 2026' },
      { id: 'date', type: 'field', key: 'date', label: 'Date', x: 12, y: 84, width: 40, font: 'Helvetica', size: 11, weight: 700, align: 'left', color: INK, sample: 'July 2026' },
      verif({ align: 'right', x: 58, y: 84, width: 30 }),
    ],
  },
  {
    id: 'minimal',
    name: 'Minimal',
    page_size: 'A4-landscape',
    accent: INK,
    layout: () => [
      { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' },
      { id: 'kicker', type: 'text', text: 'CERTIFICATE OF ACHIEVEMENT', x: 10, y: 26, width: 80, font: 'Helvetica', size: 12, weight: 700, align: 'center', color: MUTED },
      { id: 'name', type: 'field', key: 'recipient_name', label: 'Recipient', x: 10, y: 40, width: 80, font: 'Helvetica', size: 46, weight: 700, align: 'center', color: INK, sample: 'Amina Rahman' },
      { id: 'award', type: 'field', key: 'award', label: 'Award', x: 15, y: 56, width: 70, font: 'Helvetica', size: 16, weight: 400, align: 'center', color: '#4b4368', sample: 'Best Delegate — UN Security Council' },
      { id: 'event', type: 'field', key: 'event_name', label: 'Event', x: 15, y: 64, width: 70, font: 'Helvetica', size: 12, weight: 400, align: 'center', color: MUTED, sample: 'GDF International MUN 2026' },
      { id: 'line', type: 'line', x: 20, y: 78, width: 60, height: 0, color: '#d9d3e6', thickness: 0.8 },
      { id: 'date', type: 'field', key: 'date', label: 'Date', x: 12, y: 82, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: MUTED, sample: 'July 2026' },
      verif({ align: 'right', x: 58, y: 82, width: 30 }),
    ],
  },
  {
    id: 'award-seal',
    name: 'Award Seal',
    page_size: 'A4-landscape',
    accent: PINK,
    layout: () => [
      { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: NAVY },
      { id: 'frame', type: 'rect', x: 3.5, y: 5, width: 93, height: 90, fill: 'none', stroke: '#4a3d6b', strokeWidth: 1 },
      { id: 'seal', type: 'ellipse', x: 44, y: 14, width: 12, height: 17, fill: 'none', stroke: PINK, strokeWidth: 2 },
      { id: 'sealTxt', type: 'text', text: 'GDF', x: 44, y: 20, width: 12, font: 'Helvetica', size: 13, weight: 700, align: 'center', color: PINK },
      { id: 'kicker', type: 'text', text: 'AWARD OF EXCELLENCE', x: 10, y: 38, width: 80, font: 'Helvetica', size: 13, weight: 700, align: 'center', color: PINK },
      { id: 'name', type: 'field', key: 'recipient_name', label: 'Recipient', x: 10, y: 48, width: 80, font: 'Times', size: 38, weight: 700, align: 'center', color: PAPER, sample: 'Amina Rahman' },
      { id: 'award', type: 'field', key: 'award', label: 'Award', x: 15, y: 63, width: 70, font: 'Helvetica', size: 15, weight: 400, align: 'center', color: '#e9d6f2', sample: 'Best Delegate — General Assembly' },
      { id: 'event', type: 'field', key: 'event_name', label: 'Event', x: 15, y: 71, width: 70, font: 'Helvetica', size: 12, weight: 400, align: 'center', color: '#bdb3d6', sample: 'GDF International MUN 2026' },
      { id: 'date', type: 'field', key: 'date', label: 'Date', x: 12, y: 86, width: 30, font: 'Helvetica', size: 10, weight: 400, align: 'left', color: '#bdb3d6', sample: 'July 2026' },
      verif({ color: '#8f86ad', align: 'right', x: 58, y: 86, width: 30 }),
    ],
  },
];

/** The default starting layout for a brand-new blank template. */
export function blankLayout(): CertElement[] {
  return CERT_PRESETS[3].layout(); // Minimal
}
