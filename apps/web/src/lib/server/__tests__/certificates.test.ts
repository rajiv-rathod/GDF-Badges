import { describe, expect, it } from 'vitest';
import { renderCertificatePdf } from '../certificates';
import type { CertificateField } from '@gdf/shared';

const layout: CertificateField[] = [
  { key: 'recipient_name', label: 'Name', x: 10, y: 42, width: 80, font: 'Helvetica', size: 34, weight: 700, align: 'center', color: '#06002e', sample: 'Sample Name' },
  { key: 'award', label: 'Award', x: 10, y: 56, width: 80, font: 'Times', size: 18, weight: 400, align: 'right', color: '#d73cbe', sample: '' },
];

describe('renderCertificatePdf', () => {
  it('renders a valid PDF with mapped values (no background)', async () => {
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
    );
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
  });
});
