'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import type { CertificateField } from '@gdf/shared';
import { buttonClass, Card, ErrorBox, inputClass, PageTitle } from '@/components/ui';

interface Template {
  id: string;
  name: string;
  background_url: string;
  layout_json: CertificateField[];
  page_size: string;
}

interface IssuedRow {
  email: string;
  ok: boolean;
  verification_code?: string;
  error?: string;
}

const EMAIL_KEY = '__recipient_email__';
const NAME_KEY = 'recipient_name';

/**
 * The Canva-bulk-create flow: import a sheet → map its columns to the
 * template's fields → preview the first rows → issue one signed certificate
 * per row with live progress.
 */
export function BulkIssue({ orgId, template, aiEnabled }: { orgId: string; template: Template; aiEnabled: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [eventName, setEventName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState(-1);
  const [results, setResults] = useState<IssuedRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const targets = useMemo(() => {
    const fieldKeys = template.layout_json.map((f) => f.key);
    return [EMAIL_KEY, ...(fieldKeys.includes(NAME_KEY) ? [] : [NAME_KEY]), ...fieldKeys];
  }, [template.layout_json]);

  async function onFile(file: File) {
    setError('');
    setResults([]);
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      // raw:false → dates/numbers arrive as their formatted display strings
      // (no Excel serial numbers on certificates); defval keeps blank cells.
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], {
        raw: false,
        defval: '',
      });
      if (parsed.length === 0) throw new Error('That sheet has no data rows.');
      // Union of keys across ALL rows — a column blank in row 1 still counts.
      const cols = [...new Set(parsed.flatMap((r) => Object.keys(r)))];
      setColumns(cols);
      setRows(parsed.map((r) => Object.fromEntries(cols.map((c) => [c, String(r[c] ?? '').trim()]))));

      // Auto-map: column header ≈ field key
      const auto: Record<string, string> = {};
      for (const target of [EMAIL_KEY, NAME_KEY, ...template.layout_json.map((f) => f.key)]) {
        const wanted = target === EMAIL_KEY ? 'email' : target;
        const hit = cols.find((c) => c.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(wanted.replace(/[^a-z0-9]/g, '_').slice(0, 6)));
        if (hit) auto[target] = hit;
      }
      setMapping(auto);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function valuesForRow(row: Record<string, string>): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [target, column] of Object.entries(mapping)) {
      if (target !== EMAIL_KEY && column && row[column] !== undefined) values[target] = row[column];
    }
    if (eventName && !values.event_name && template.layout_json.some((f) => f.key === 'event_name')) {
      values.event_name = eventName;
    }
    return values;
  }

  async function aiClean() {
    setBusy('clean');
    setError('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean_sheet', rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI cleanup failed');
      setRows(data.rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function preview() {
    setBusy('preview');
    setError('');
    try {
      const res = await fetch('/api/certificates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          background_url: template.background_url,
          layout_json: template.layout_json,
          page_size: template.page_size,
          values: rows[0] ? valuesForRow(rows[0]) : {},
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      setPreviewUrl(URL.createObjectURL(await res.blob()));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function issueAll() {
    if (!mapping[EMAIL_KEY]) {
      setError('Map the recipient email column first.');
      return;
    }
    if (!eventName) {
      setError('Enter the event name.');
      return;
    }
    setBusy('issue');
    setError('');
    setResults([]);
    const out: IssuedRow[] = [];
    for (let i = 0; i < rows.length; i++) {
      setProgress(i);
      const row = rows[i];
      const email = row[mapping[EMAIL_KEY]] ?? '';
      const name = row[mapping[NAME_KEY] ?? ''] ?? email.split('@')[0];
      try {
        const res = await fetch('/api/certificates/issue-one', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            org_id: orgId,
            template_id: template.id,
            event_name: eventName,
            recipient_email: email,
            recipient_name: name,
            values: valuesForRow(row),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed');
        out.push({ email, ok: true, verification_code: data.verification_code });
      } catch (err) {
        out.push({ email, ok: false, error: (err as Error).message });
      }
    }
    setProgress(-1);
    setBusy('');
    setResults(out);
  }

  const issued = results.filter((r) => r.ok);

  return (
    <>
      <PageTitle title={`Bulk issue — ${template.name}`} subtitle="Import your sheet, map its columns to the certificate fields, preview, then issue." />
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) onFile(e.target.files[0]);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className={buttonClass.primary} onClick={() => fileInput.current?.click()} disabled={busy !== ''}>
          1 · Import sheet
        </button>
        <input className={`${inputClass} max-w-xs`} placeholder="Event name (appears on credential)" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        {rows.length > 0 && aiEnabled ? (
          <button className={buttonClass.outline} onClick={aiClean} disabled={busy !== ''}>
            {busy === 'clean' ? 'Cleaning…' : '✨ AI clean-up'}
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}

      {rows.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-display font-semibold">2 · Map columns → fields</h2>
            <p className="mt-1 text-xs text-muted">{rows.length} rows loaded.</p>
            <div className="mt-4 grid gap-3">
              {targets.map((target) => (
                <label key={target} className="grid grid-cols-2 items-center gap-3 text-sm">
                  <span className={target === EMAIL_KEY ? 'font-semibold text-accent' : ''}>
                    {target === EMAIL_KEY ? 'Recipient email (required)' : target}
                  </span>
                  <select
                    className={inputClass}
                    value={mapping[target] ?? ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [target]: e.target.value }))}
                  >
                    <option value="">— not mapped —</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button className={buttonClass.outline} onClick={preview} disabled={busy !== ''}>
                {busy === 'preview' ? 'Rendering…' : '3 · Preview first row'}
              </button>
              <button className={buttonClass.primary} onClick={issueAll} disabled={busy !== ''}>
                {busy === 'issue' ? `Issuing ${progress + 1}/${rows.length}…` : `4 · Issue all ${rows.length}`}
              </button>
            </div>
            {busy === 'issue' ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
                <div className="gdf-cta-gradient h-full transition-all" style={{ width: `${((progress + 1) / rows.length) * 100}%` }} />
              </div>
            ) : null}
          </Card>

          <div>
            {previewUrl ? (
              <iframe src={previewUrl} className="aspect-[297/210] w-full rounded-md border border-border bg-white" title="Certificate preview" />
            ) : (
              <Card className="flex aspect-[297/210] items-center justify-center text-sm text-muted">
                Preview appears here
              </Card>
            )}
          </div>
        </div>
      ) : null}

      {results.length > 0 ? (
        <Card className="mt-6">
          <h2 className="font-display font-semibold text-success">
            Issued {issued.length}/{results.length} certificates
          </h2>
          <ul className="mt-3 grid gap-1 text-sm">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between border-b border-border/40 py-1.5">
                <span className={r.ok ? '' : 'text-danger'}>{r.email}</span>
                {r.ok ? (
                  <Link className="font-semibold text-accent hover:underline" href={`/verify/${r.verification_code}`}>
                    Verify link
                  </Link>
                ) : (
                  <span className="text-xs text-danger">{r.error}</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
