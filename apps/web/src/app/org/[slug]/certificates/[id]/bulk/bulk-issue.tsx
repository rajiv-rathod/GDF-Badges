'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { parseWorkbook, type ParsedWorkbook } from '@/lib/sheet';
import { buttonClass, Card, ErrorBox, inputClass, PageTitle } from '@/components/ui';

/** layout_json is a mixed element list — only `field` elements are mappable. */
interface LayoutElement {
  key?: string;
  label?: string;
  type?: string;
}

interface Template {
  id: string;
  name: string;
  background_url: string;
  layout_json: LayoutElement[];
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
/** Sentinel in the mapping select: this target uses a typed fixed value. */
const FIXED = '__fixed_value__';

/**
 * The Canva-bulk-create flow: import a sheet → map its columns to the
 * template's fields (or give a field a custom fixed value that applies to
 * every row) → preview → issue one signed certificate per row.
 * Mappings, fixed values, event name and skills are remembered per template.
 */
export function BulkIssue({ orgId, template, aiEnabled }: { orgId: string; template: Template; aiEnabled: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fixed, setFixed] = useState<Record<string, string>>({});
  const [eventName, setEventName] = useState('');
  const [skills, setSkills] = useState('');
  const [expires, setExpires] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [aiDesc, setAiDesc] = useState<string[]>([]);
  const [progress, setProgress] = useState(-1);
  const [results, setResults] = useState<IssuedRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const workbookRef = useRef<ParsedWorkbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheet, setSheet] = useState('');

  // Only data fields have keys — shapes/text/verification elements don't.
  const fieldKeys = useMemo(
    () =>
      template.layout_json
        .filter((f) => (f.type === 'field' || !f.type) && typeof f.key === 'string' && f.key)
        .map((f) => f.key as string),
    [template.layout_json],
  );

  const targets = useMemo(
    () => [EMAIL_KEY, ...(fieldKeys.includes(NAME_KEY) ? [] : [NAME_KEY]), ...fieldKeys],
    [fieldKeys],
  );

  // ---- persistence: settings survive reloads, per template ("permanent") ----
  const storeKey = `gdf_bulk_${template.id}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storeKey) ?? 'null');
      if (saved) {
        if (saved.mapping) setMapping(saved.mapping);
        if (saved.fixed) setFixed(saved.fixed);
        if (saved.eventName) setEventName(saved.eventName);
        if (saved.skills) setSkills(saved.skills);
        if (saved.expires) setExpires(saved.expires);
      }
    } catch {
      /* ignore corrupt saved state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(storeKey, JSON.stringify({ mapping, fixed, eventName, skills, expires }));
    } catch {
      /* storage may be unavailable — fine */
    }
  }, [storeKey, mapping, fixed, eventName, skills, expires]);

  function loadSheet(name: string) {
    try {
      const { columns: cols, rows: parsed } = workbookRef.current!.getSheet(name);
      if (parsed.length === 0) throw new Error(`Sheet "${name}" has no data rows.`);
      setSheet(name);
      setColumns(cols);
      setRows(parsed);
      setAiDesc([]); // drafted descriptions are positional — stale after any row change
      // Auto-map by fuzzy header match — never overwrite an existing choice
      // (saved mappings and fixed values are kept).
      setMapping((prev) => {
        const auto: Record<string, string> = { ...prev };
        for (const target of targets) {
          if (auto[target]) continue;
          const wanted = (target === EMAIL_KEY ? 'email' : target).toLowerCase().replace(/[^a-z0-9]/g, '_');
          const hit = cols.find((c) => c.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(wanted.slice(0, 6)));
          if (hit) auto[target] = hit;
        }
        return auto;
      });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onFile(file: File) {
    setError('');
    setResults([]);
    try {
      const wb = await parseWorkbook(file);
      workbookRef.current = wb;
      setSheetNames(wb.sheetNames);
      loadSheet(wb.sheetNames[0]);
    } catch {
      setError('Could not read that file. Supported: .xlsx, .xls, .csv, .tsv, .ods');
    }
  }

  function valuesForRow(row: Record<string, string>, index: number): Record<string, string> {
    const values: Record<string, string> = {};
    for (const [target, column] of Object.entries(mapping)) {
      if (target === EMAIL_KEY) continue;
      if (column === FIXED) {
        if (fixed[target]?.trim()) values[target] = fixed[target].trim();
      } else if (column && row[column] !== undefined) {
        values[target] = row[column];
      }
    }
    if (eventName && !values.event_name && fieldKeys.includes('event_name')) {
      values.event_name = eventName;
    }
    // AI-drafted description fills the gap when nothing is mapped/typed for it.
    if (!values.description && aiDesc[index] && fieldKeys.includes('description')) {
      values.description = aiDesc[index];
    }
    return values;
  }

  async function aiDescriptions() {
    setBusy('desc');
    setError('');
    try {
      const items = rows.map((row, i) => {
        const v = valuesForRow(row, i);
        const nameCol = mapping[NAME_KEY];
        return {
          name: (nameCol === FIXED ? fixed[NAME_KEY] : nameCol ? row[nameCol] : '') || 'the delegate',
          award: v.award ?? '',
          committee: v.committee ?? row['Committee'] ?? '',
          country: v.country ?? row['Country'] ?? '',
        };
      });
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'descriptions', rows: items, event_name: eventName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI description drafting failed');
      setAiDesc(data.descriptions);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
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
      setAiDesc([]); // row order/count may have changed — re-draft descriptions
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
          values: rows[0] ? valuesForRow(rows[0], 0) : {},
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
    if (!mapping[EMAIL_KEY] || mapping[EMAIL_KEY] === FIXED) {
      setError('Map the recipient email to a sheet column first.');
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
      const nameCol = mapping[NAME_KEY];
      const name =
        (nameCol === FIXED ? fixed[NAME_KEY] : nameCol ? row[nameCol] : '') || email.split('@')[0];
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
            values: valuesForRow(row, i),
            skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
            expires: expires || undefined,
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
        accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods"
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
        {sheetNames.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Sheet
            <select className={`${inputClass} max-w-48`} value={sheet} onChange={(e) => loadSheet(e.target.value)} disabled={busy !== ''}>
              {sheetNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        ) : null}
        <input className={`${inputClass} max-w-xs`} placeholder="Event name (appears on credential)" value={eventName} onChange={(e) => setEventName(e.target.value)} />
        {rows.length > 0 && aiEnabled ? (
          <button className={buttonClass.outline} onClick={aiClean} disabled={busy !== ''}>
            {busy === 'clean' ? 'Cleaning…' : '✨ AI clean-up'}
          </button>
        ) : null}
        {rows.length > 0 && aiEnabled && fieldKeys.includes('description') ? (
          <button className={buttonClass.outline} onClick={aiDescriptions} disabled={busy !== ''}>
            {busy === 'desc' ? 'Drafting…' : aiDesc.length ? '✨ Re-draft descriptions' : '✨ AI descriptions'}
          </button>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input className={`${inputClass} max-w-md`} placeholder="Skills (comma-separated, applied to all)" value={skills} onChange={(e) => setSkills(e.target.value)} />
          <label className="flex items-center gap-2 text-sm text-muted">
            Expires
            <input className={`${inputClass} max-w-40`} type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </label>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted">
        Any spreadsheet works — .xlsx, .xls, .csv, .tsv or .ods. Your mappings, fixed values and event name are remembered for this template.
      </p>

      {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}

      {rows.length > 0 ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-display font-semibold">2 · Map columns → fields</h2>
            <p className="mt-1 text-xs text-muted">
              {rows.length} rows loaded. Pick a sheet column per field — or choose <em>Custom value</em> to type one value that applies to every certificate.
            </p>
            <div className="mt-4 grid gap-3">
              {targets.map((target) => (
                <div key={target} className="grid grid-cols-2 items-center gap-3 text-sm">
                  <span className={target === EMAIL_KEY ? 'font-semibold text-primary-dark' : ''}>
                    {target === EMAIL_KEY ? 'Recipient email (required)' : target}
                  </span>
                  <div className="grid gap-1.5">
                    <select
                      className={inputClass}
                      value={mapping[target] ?? ''}
                      onChange={(e) => setMapping((m) => ({ ...m, [target]: e.target.value }))}
                    >
                      <option value="">— not mapped —</option>
                      {target !== EMAIL_KEY ? <option value={FIXED}>✏️ Custom value (same for all rows)</option> : null}
                      {columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    {mapping[target] === FIXED ? (
                      <input
                        className={inputClass}
                        placeholder="Type the value used on every certificate"
                        value={fixed[target] ?? ''}
                        onChange={(e) => setFixed((f) => ({ ...f, [target]: e.target.value }))}
                      />
                    ) : null}
                  </div>
                </div>
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
                  <Link className="font-semibold text-primary-dark hover:underline" href={`/verify/${r.verification_code}`}>
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
