import { PDFDocument, PageSizes, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { CertificateField, CertificateTemplate } from '@gdf/shared';
import { supabaseUrl } from './config';

/**
 * Certificate rendering with pdf-lib: background image + positioned text per
 * layout_json. Chosen over headless-browser rendering deliberately — the
 * production target is a 1 GB RAM host, where Chromium is not an option.
 * Field x/y/width are percentages of the page; y measured from the top.
 */

const PAGE_SIZES: Record<CertificateTemplate['page_size'], [number, number]> = {
  'A4-landscape': [PageSizes.A4[1], PageSizes.A4[0]],
  'A4-portrait': [PageSizes.A4[0], PageSizes.A4[1]],
  'letter-landscape': [PageSizes.Letter[1], PageSizes.Letter[0]],
  'letter-portrait': [PageSizes.Letter[0], PageSizes.Letter[1]],
};

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return rgb(0.98, 0.98, 0.976);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function pickFont(field: CertificateField): StandardFonts {
  const serif = /times|serif|garamond/i.test(field.font);
  const bold = field.weight >= 600;
  if (serif) return bold ? StandardFonts.TimesRomanBold : StandardFonts.TimesRoman;
  return bold ? StandardFonts.HelveticaBold : StandardFonts.Helvetica;
}

function drawField(page: PDFPage, font: PDFFont, field: CertificateField, value: string, pw: number, ph: number) {
  const size = field.size;
  const boxX = (field.x / 100) * pw;
  const boxW = (field.width / 100) * pw;
  const textW = font.widthOfTextAtSize(value, size);
  let x = boxX;
  if (field.align === 'center') x = boxX + (boxW - textW) / 2;
  if (field.align === 'right') x = boxX + boxW - textW;
  // layout y is % from the top; PDF origin is bottom-left
  const y = ph - (field.y / 100) * ph - size;
  page.drawText(value, { x, y, size, font, color: hexToRgb(field.color) });
}

/**
 * SSRF guard: backgrounds may only come from this deployment's own public
 * Supabase storage (which is where /api/upload puts them). Anything else —
 * internal IPs, metadata endpoints, arbitrary hosts — is ignored.
 */
export function isAllowedBackgroundUrl(url: string): boolean {
  const base = supabaseUrl();
  if (!base) return false;
  return url.startsWith(`${base.replace(/\/$/, '')}/storage/v1/object/public/assets/`);
}

export async function renderCertificatePdf(
  template: Pick<CertificateTemplate, 'background_url' | 'layout_json' | 'page_size'>,
  values: Record<string, string>,
  options: { fallbackToSamples?: boolean } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const [pw, ph] = PAGE_SIZES[template.page_size] ?? PAGE_SIZES['A4-landscape'];
  const page = doc.addPage([pw, ph]);

  if (template.background_url && isAllowedBackgroundUrl(template.background_url)) {
    try {
      const res = await fetch(template.background_url);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
      page.drawImage(image, { x: 0, y: 0, width: pw, height: ph });
    } catch {
      page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(6 / 255, 0, 46 / 255) });
    }
  } else {
    // On-brand fallback: deep navy field with a magenta frame
    page.drawRectangle({ x: 0, y: 0, width: pw, height: ph, color: rgb(6 / 255, 0, 46 / 255) });
    page.drawRectangle({
      x: 18, y: 18, width: pw - 36, height: ph - 36,
      borderColor: rgb(215 / 255, 60 / 255, 190 / 255), borderWidth: 2,
    });
  }

  const fonts = new Map<StandardFonts, PDFFont>();
  for (const field of template.layout_json as CertificateField[]) {
    // Samples are designer placeholders — only previews may fall back to them;
    // a real issued certificate renders mapped values only.
    const value = values[field.key] ?? (options.fallbackToSamples ? field.sample : '') ?? '';
    if (!value) continue;
    const which = pickFont(field);
    if (!fonts.has(which)) fonts.set(which, await doc.embedFont(which));
    drawField(page, fonts.get(which)!, field, value, pw, ph);
  }
  return doc.save();
}
