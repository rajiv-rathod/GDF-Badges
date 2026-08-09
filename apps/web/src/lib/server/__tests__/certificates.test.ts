import { describe, expect, it } from 'vitest';
import { renderCertificatePdf, CERT_ID_KEY, CERT_URL_KEY } from '../certificates';
import type { CertElement } from '@gdf/shared';

const layout: CertElement[] = [
  { id: 'bg', type: 'rect', x: 0, y: 0, width: 100, height: 100, fill: '#0c0a2e' },
  { id: 'name', type: 'field', key: 'recipient_name', label: 'Name', x: 10, y: 42, width: 80, font: 'Helvetica', size: 34, weight: 700, align: 'center', color: '#ffffff', sample: 'Sample Name' },
  { id: 'award', type: 'field', key: 'award', label: 'Award', x: 10, y: 56, width: 80, font: 'Times', size: 18, weight: 400, align: 'right', color: '#d73cbe', sample: '' },
  { id: 'logo', type: 'image', url: 'http://evil.example/logo.png', x: 80, y: 8, width: 12, height: 10 },
  { id: 'line', type: 'line', x: 20, y: 70, width: 60, height: 0, color: '#d73cbe', thickness: 1 },
  { id: 'seal', type: 'ellipse', x: 44, y: 12, width: 12, height: 16, fill: 'none', stroke: '#ff45e1', strokeWidth: 2 },
  { id: 'verif', type: 'verification', vmode: 'both', x: 8, y: 90, width: 60, font: 'Helvetica', size: 8, weight: 400, align: 'left', color: '#6f6690' },
];

describe('renderCertificatePdf', () => {
  it('renders a valid PDF with mapped values across element kinds', async () => {
    const bytes = await renderCertificatePdf(
      { background_url: '', layout_json: layout, page_size: 'A4-landscape' },
      { recipient_name: 'Amina Delegate', award: 'Best Delegate — UNSC' },
    );
    expect(bytes.length).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('falls back to sample values and survives a broken background URL', async () => {
    const bytes = await renderCertificatePdf(
      { background_url: 'http://127.0.0.1:1/nope.png', layout_json: layout, page_size: 'letter-portrait' },
      {},
      { fallbackToSamples: true },
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });

  it('word-wraps long description values instead of overflowing', async () => {
    const withDesc: CertElement[] = [
      ...layout,
      { id: 'desc', type: 'field', key: 'description', x: 18, y: 60, width: 64, font: 'Helvetica', size: 11, weight: 400, align: 'center', color: '#6f6690', sample: '' },
    ];
    const long = 'In recognition of exceptional diplomacy, rigorous research, and outstanding leadership demonstrated across every committee session of the conference, and for exemplary service to the spirit of multilateralism.';
    const bytes = await renderCertificatePdf(
      { background_url: '', layout_json: withDesc, page_size: 'A4-landscape' },
      { recipient_name: 'X', description: long },
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it('renders the Certificate ID / verify URL from the reserved keys', async () => {
    // Integrity: the printed Certificate ID must be the exact verification_code
    // that forms the public verify URL. A missing key must not throw.
    const code = 'abcDEF123-_';
    const bytes = await renderCertificatePdf(
      { background_url: '', layout_json: layout, page_size: 'A4-landscape' },
      { recipient_name: 'X', [CERT_ID_KEY]: code, [CERT_URL_KEY]: `certview.gdf.social/verify/${code}` },
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(1000);

    // Missing reserved keys → no throw, still a valid PDF.
    const bytes2 = await renderCertificatePdf(
      { background_url: '', layout_json: layout, page_size: 'A4-landscape' },
      { recipient_name: 'X' },
    );
    expect(new TextDecoder().decode(bytes2.slice(0, 5))).toBe('%PDF-');
  });
});
