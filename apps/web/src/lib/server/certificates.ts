import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage, type Color } from 'pdf-lib';
import type { CertificateTemplate } from '@gdf/shared';
import { supabaseUrl } from './config';

/**
 * Certificate rendering with pdf-lib: a background image (optional) plus a
 * layered set of elements — text, data fields, images/logos, shapes and a
 * verification stamp — positioned by percentage of the page (y from the top).
 * Chosen over headless-browser rendering deliberately: the production target
 * is a 1 GB RAM host where Chromium is not an option.
 *
 * Reserved value keys, injected by the issue path so a certificate's printed
 * ID always matches its public verify URL:
 *   __certificate_id__  → the credential verification_code
 *   __verify_url__      → {origin}/verify/{verification_code}
 */

const PAGE_SIZES: Record<CertificateTemplate['page_size'], [number, number]> = {
  'A4-landscape': [PageSizes.A4[1], PageSizes.A4[0]],
  'A4-portrait': [PageSizes.A4[0], PageSizes.A4[1]],
  'letter-landscape': [PageSizes.Letter[1], PageSizes.Letter[0]],
  'letter-portrait': [PageSizes.Letter[0], PageSizes.Letter[1]],
};

export const CERT_ID_KEY = '__certificate_id__';
export const CERT_URL_KEY = '__verify_url__';

function hexToRgb(hex: string): Color {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return rgb(0.1, 0.08, 0.25);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function pickFont(fontName: string, weight: number): StandardFonts {
  const serif = /times|serif|garamond/i.test(fontName || '');
  const bold = (weight ?? 400) >= 600;
  if (serif) return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

/**
 * SSRF guard: images (backgrounds and logo/image elements) may only come from
 * this deployment's own public Supabase storage — where /api/upload puts them.
 * Anything else — internal IPs, metadata endpoints, arbitrary hosts — is ignored.
 */
export function isAllowedBackgroundUrl(url: string): boolean {
  const base = supabaseUrl();
  if (!base) return false;
  return typeof url === 'string' && url.startsWith(`${base.replace(/\/$/, '')}/storage/v1/object/public/assets/`);
}

/** Loosely-typed layout element as stored in layout_json (mixed kinds). */
type RawEl = Record<string, unknown>;

function num(v: unknown, d = 0): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : d;
}
function str(v: unknown, d = ''): string {
  return typeof v === 'string' ? v : v == null ? d : String(v);
}
function elType(el: RawEl): string {
  // Elements without an explicit type are legacy text fields.
  return str(el.type, 'field') || 'field';
}

/** Greedy word-wrap so long values (e.g. AI descriptions) fit their box. */
function wrapLines(font: PDFFont, text: string, size: number, maxW: number, maxLines = 10): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(candidate, size) > maxW) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
      if (out.length >= maxLines) return out;
    }
    out.push(line);
    if (out.length >= maxLines) return out;
  }
  return out;
}

function drawTextValue(page: PDFPage, font: PDFFont, el: RawEl, value: string, pw: number, ph: number) {
  if (!value) return;
  const size = num(el.size, 16);
  const align = str(el.align, 'left');
  const boxX = (num(el.x) / 100) * pw;
  const boxW = (num(el.width, 40) / 100) * pw;
  const color = hexToRgb(str(el.color, '#1b1440'));
  const lines = wrapLines(font, value, size, boxW);
  lines.forEach((line, i) => {
    const textW = font.widthOfTextAtSize(line, size);
    let x = boxX;
    if (align === 'center') x = boxX + (boxW - textW) / 2;
    if (align === 'right') x = boxX + boxW - textW;
    const y = ph - (num(el.y) / 100) * ph - size - i * size * 1.25;
    page.drawText(line, { x, y, size, font, color });
  });
}

async function drawImageEl(doc: PDFDocument, page: PDFPage, el: RawEl, pw: number, ph: number) {
  const url = str(el.url);
  if (!isAllowedBackgroundUrl(url)) return;
  try {
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const w = (num(el.width, 20) / 100) * pw;
    const h = (num(el.height, 20) / 100) * ph;
    const x = (num(el.x) / 100) * pw;
    const y = ph - (num(el.y) / 100) * ph - h;
    page.drawImage(image, { x, y, width: w, height: h, opacity: num(el.opacity, 1) });
  } catch {
    /* skip unfetchable image */
  }
}

export async function renderCertificatePdf(
  template: Pick<CertificateTemplate, 'background_url' | 'layout_json' | 'page_size'>,
  values: Record<string, string>,
  options: { fallbackToSamples?: boolean } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [pw, ph] = PAGE_SIZES[template.page_size] ?? PAGE_SIZES['A4-landscape'];
  const page = doc.addPage([pw, ph]);

  // Base: the uploaded background image, or a clean white page. Templates that
  // want a coloured backdrop include a full-page rectangle element.
  page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(1, 1, 1) });
  if (template.background_url && isAllowedBackgroundUrl(template.background_url)) {
    try {
      const res = await fetch(template.background_url);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(image, { x: 0, y: 0, width: pw, height: ph });
    } catch {
      /* fall through to white */
    }
  }

  const fonts = new Map<StandardFonts, PDFFont>();
  const getFont = async (name: string, weight: number) => {
    const which = pickFont(name, weight);
    if (!fonts.has(which)) fonts.set(which, await doc.embedFont(which));
    return fonts.get(which)!;
  };

  const elements = (template.layout_json as unknown as RawEl[]) ?? [];
  for (const el of elements) {
    const type = elType(el);
    if (type === 'image') {
      await drawImageEl(doc, page, el, pw, ph);
    } else if (type === 'rect') {
      const w = (num(el.width, 20) / 100) * pw;
      const h = (num(el.height, 10) / 100) * ph;
      const x = (num(el.x) / 100) * pw;
      const y = ph - (num(el.y) / 100) * ph - h;
      const noFill = el.fill === 'none' || el.fill === '';
      page.drawRectangle({
        x, y, width: w, height: h,
        color: noFill ? undefined : hexToRgb(str(el.fill, '#d73cbe')),
        opacity: num(el.opacity, 1),
        borderColor: el.stroke ? hexToRgb(str(el.stroke)) : undefined,
        borderWidth: el.stroke ? num(el.strokeWidth, 1) : 0,
      });
    } else if (type === 'ellipse') {
      const w = (num(el.width, 20) / 100) * pw;
      const h = (num(el.height, 10) / 100) * ph;
      const cx = (num(el.x) / 100) * pw + w / 2;
      const cy = ph - (num(el.y) / 100) * ph - h / 2;
      const noFill = el.fill === 'none' || el.fill === '';
      page.drawEllipse({
        x: cx, y: cy, xScale: w / 2, yScale: h / 2,
        color: noFill ? undefined : hexToRgb(str(el.fill, '#d73cbe')),
        opacity: num(el.opacity, 1),
        borderColor: el.stroke ? hexToRgb(str(el.stroke)) : undefined,
        borderWidth: el.stroke ? num(el.strokeWidth, 1) : 0,
      });
    } else if (type === 'line') {
      const x1 = (num(el.x) / 100) * pw;
      const y1 = ph - (num(el.y) / 100) * ph;
      const x2 = x1 + (num(el.width, 30) / 100) * pw;
      const y2 = ph - (num(el.y) / 100) * ph - (num(el.height, 0) / 100) * ph;
      page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: num(el.thickness, 1.5), color: hexToRgb(str(el.color, '#1b1440')) });
    } else {
      // text-like: field | text | verification
      let value = '';
      if (type === 'verification') {
        const id = values[CERT_ID_KEY] ?? (options.fallbackToSamples ? 'GDF-PREVIEW-CODE' : '');
        const url = values[CERT_URL_KEY] ?? (options.fallbackToSamples ? 'certview.gdf.social/verify/GDF-PREVIEW-CODE' : '');
        const mode = str(el.vmode, 'both');
        if (mode === 'id') value = id ? `Certificate ID: ${id}` : '';
        else if (mode === 'url') value = url;
        else value = [id ? `Certificate ID: ${id}` : '', url].filter(Boolean).join('\n');
      } else if (type === 'text') {
        value = str(el.text);
      } else {
        const key = str(el.key);
        value = values[key] ?? (options.fallbackToSamples ? str(el.sample) : '') ?? '';
      }
      if (!value) continue;
      const font = await getFont(str(el.font, 'Helvetica'), num(el.weight, 400));
      drawTextValue(page, font, el, value, pw, ph);
    }
  }

  return doc.save();
}
