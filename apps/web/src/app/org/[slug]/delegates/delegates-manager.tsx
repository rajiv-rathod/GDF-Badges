'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { parseWorkbook, type ParsedWorkbook } from '@/lib/sheet';
import { buttonClass, Card, EmptyState, ErrorBox, PageTitle } from '@/components/ui';

interface DelegateRow {
  id?: string;
  name: string;
  email: string;
  committee: string;
  country_portfolio: string;
  award: string | null;
}

type EditRow = {
  id?: string;
  rid: string; // stable client row id
  name: string;
  email: string;
  committee: string;
  country_portfolio: string;
  award: string;
};

const COLS: { key: keyof Omit<EditRow, 'rid' | 'id'>; label: string; w: string; type?: string }[] = [
  { key: 'name', label: 'Name', w: 'min-w-[160px]' },
  { key: 'email', label: 'Email', w: 'min-w-[200px]', type: 'email' },
  { key: 'committee', label: 'Committee', w: 'min-w-[150px]' },
  { key: 'country_portfolio', label: 'Country / Portfolio', w: 'min-w-[160px]' },
  { key: 'award', label: 'Award / Reward', w: 'min-w-[170px]' },
];

const rid = () => Math.random().toString(36).slice(2, 9);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

function toEdit(d: DelegateRow): EditRow {
  return { id: d.id, rid: rid(), name: d.name, email: d.email, committee: d.committee, country_portfolio: d.country_portfolio, award: d.award ?? '' };
}

/** Best-effort mapping of arbitrary sheet headers onto delegate fields. */
function guessRows(sheetRows: Array<Record<string, string>>): DelegateRow[] {
  const find = (row: Record<string, string>, patterns: RegExp[]) => {
    for (const key of Object.keys(row)) {
      if (patterns.some((p) => p.test(key.toLowerCase().trim()))) return String(row[key] ?? '').trim();
    }
    return '';
  };
  return sheetRows
    .map((row) => ({
      name: find(row, [/name/]),
      email: find(row, [/mail/]),
      committee: find(row, [/committee|council/]),
      country_portfolio: find(row, [/country|portfolio|delegation/]),
      award: find(row, [/award|prize|reward|position/]) || null,
    }))
    .filter((r) => r.email.includes('@') || r.name);
}

export function DelegatesManager({
  orgId,
  initialDelegates,
  aiEnabled,
}: {
  orgId: string;
  initialDelegates: DelegateRow[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<EditRow[]>(() => initialDelegates.map(toEdit));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const workbookRef = useRef<ParsedWorkbook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState('');
  const [dirty, setDirty] = useState(false);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.name.trim() && emailOk(r.email)).length;
    const bad = rows.filter((r) => r.email.trim() && !emailOk(r.email)).length;
    return { valid, bad, total: rows.length };
  }, [rows]);

  function setCell(id: string, key: keyof EditRow, val: string) {
    setRows((list) => list.map((r) => (r.rid === id ? { ...r, [key]: val } : r)));
    setDirty(true);
  }

  function addRow() {
    setRows((l) => [...l, { rid: rid(), name: '', email: '', committee: '', country_portfolio: '', award: '' }]);
    setDirty(true);
  }

  async function deleteRow(r: EditRow) {
    if (r.id) {
      await fetch('/api/delegates', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, id: r.id }) });
    }
    setRows((l) => l.filter((x) => x.rid !== r.rid));
  }

  // Merge parsed sheet rows into the grid (upsert by email; append new).
  function mergeParsed(parsed: DelegateRow[], sheetName: string) {
    setRows((list) => {
      const next = list.map((r) => ({ ...r }));
      const byEmail = new Map(next.map((r) => [r.email.trim().toLowerCase(), r]));
      let added = 0;
      let updated = 0;
      for (const p of parsed) {
        const key = p.email.trim().toLowerCase();
        const existing = key ? byEmail.get(key) : undefined;
        if (existing) {
          existing.name = p.name || existing.name;
          existing.committee = p.committee || existing.committee;
          existing.country_portfolio = p.country_portfolio || existing.country_portfolio;
          existing.award = p.award ?? existing.award;
          updated += 1;
        } else {
          const e = toEdit(p);
          byEmail.set(key, e);
          next.push(e);
          added += 1;
        }
      }
      setNotice(`Imported "${sheetName}": ${added} new, ${updated} updated — edit anything below, then Save.`);
      return next;
    });
    setDirty(true);
  }

  function loadSheet(name: string) {
    try {
      const { rows: sheetRows } = workbookRef.current!.getSheet(name);
      const guessed = guessRows(sheetRows);
      if (guessed.length === 0) throw new Error(`No usable rows found in "${name}".`);
      setActiveSheet(name);
      mergeParsed(guessed, name);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onFile(file: File) {
    setError('');
    try {
      const wb = await parseWorkbook(file);
      workbookRef.current = wb;
      setSheetNames(wb.sheetNames);
      loadSheet(wb.sheetNames[0]);
    } catch {
      setError('Could not read that file. Supported: .xlsx, .xls, .csv, .tsv, .ods');
    }
  }

  async function aiClean() {
    setBusy('clean');
    setError('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clean_sheet', rows: rows.map((r) => ({ name: r.name, email: r.email, committee: r.committee, country_portfolio: r.country_portfolio, award: r.award })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI cleanup failed');
      setRows((prev) =>
        (data.rows as Array<Record<string, string>>).map((r, i) => ({
          id: prev[i]?.id,
          rid: prev[i]?.rid ?? rid(),
          name: r.name ?? '',
          email: r.email ?? '',
          committee: r.committee ?? '',
          country_portfolio: r.country_portfolio ?? '',
          award: r.award ?? '',
        })),
      );
      setNotice('Cleaned by AI — review and Save.');
      setDirty(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function save() {
    const payload = rows
      .filter((r) => r.name.trim() && emailOk(r.email))
      .map((r) => ({ name: r.name.trim(), email: r.email.trim(), committee: r.committee.trim(), country_portfolio: r.country_portfolio.trim(), award: r.award.trim() || null }));
    if (payload.length === 0) {
      setError('Add at least one row with a name and a valid email before saving.');
      return;
    }
    setBusy('save');
    setError('');
    const res = await fetch('/api/delegates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ org_id: orgId, delegates: payload }) });
    const data = await res.json();
    setBusy('');
    if (!res.ok) {
      setError(data.error ?? 'Save failed');
      return;
    }
    setNotice(`Saved ${data.imported} delegates${data.failures?.length ? `, ${data.failures.length} failed` : ''}.`);
    setDirty(false);
    router.refresh();
  }

  function exportSheet() {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map(({ name, email, committee, country_portfolio, award }) => ({ Name: name, Email: email, Committee: committee, 'Country / Portfolio': country_portfolio, Award: award })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Delegates');
    XLSX.writeFile(workbook, 'delegates.xlsx');
  }

  return (
    <>
      <PageTitle title="Delegates" subtitle="Import a sheet or edit the roster live — like a spreadsheet. Add rows, fill in awards, then save. Badges & certificates issue straight from it." />

      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileInput} type="file" accept=".xlsx,.xls,.xlsm,.csv,.tsv,.ods" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
        <button className={buttonClass.outline} onClick={() => fileInput.current?.click()}>Import sheet</button>
        {sheetNames.length > 1 ? (
          <label className="flex items-center gap-2 text-sm text-muted">
            Sheet
            <select className="rounded-sm border border-border bg-background/70 px-3 py-2 text-foreground" value={activeSheet} onChange={(e) => loadSheet(e.target.value)}>
              {sheetNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ) : null}
        <button className={buttonClass.ghost} onClick={addRow}>+ Add row</button>
        {aiEnabled ? <button className={buttonClass.outline} onClick={aiClean} disabled={busy !== '' || rows.length === 0}>{busy === 'clean' ? 'Cleaning…' : '✨ AI clean-up'}</button> : null}
        <button className={buttonClass.outline} onClick={exportSheet} disabled={rows.length === 0}>Export XLSX</button>
        <div className="ml-auto flex items-center gap-3">
          {dirty ? <span className="text-xs font-semibold text-primary-dark">Unsaved changes</span> : null}
          <button className={buttonClass.primary} onClick={save} disabled={busy !== ''}>{busy === 'save' ? 'Saving…' : 'Save roster'}</button>
        </div>
      </div>

      {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}
      {notice ? <p className="mt-4 rounded-sm border border-primary/50 bg-primary/10 px-4 py-2 text-sm">{notice}</p> : null}

      <Card className="mt-6 !p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-display font-semibold">Roster spreadsheet</h2>
          <p className="text-xs text-muted">
            {stats.valid} ready{stats.bad ? ` · ${stats.bad} with invalid email` : ''} · {stats.total} rows
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Empty roster" body="Import a sheet (XLSX/CSV) or click “+ Add row” to start typing delegates directly." />
          </div>
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="w-10 border-b border-border px-2 py-2 text-left">#</th>
                  {COLS.map((c) => (
                    <th key={c.key} className={`border-b border-border px-2 py-2 text-left ${c.w}`}>{c.label}</th>
                  ))}
                  <th className="w-10 border-b border-border px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const badEmail = r.email.trim() !== '' && !emailOk(r.email);
                  return (
                    <tr key={r.rid} className="hover:bg-primary/5">
                      <td className="border-b border-border/40 px-2 py-1 text-xs text-muted">{i + 1}</td>
                      {COLS.map((c) => (
                        <td key={c.key} className="border-b border-l border-border/40 p-0">
                          <input
                            value={(r[c.key] as string) ?? ''}
                            type={c.type ?? 'text'}
                            onChange={(e) => setCell(r.rid, c.key, e.target.value)}
                            className={`w-full bg-transparent px-2 py-1.5 outline-none focus:bg-primary/10 ${c.key === 'email' && badEmail ? 'text-danger' : ''}`}
                            placeholder={c.label}
                          />
                        </td>
                      ))}
                      <td className="border-b border-l border-border/40 px-1 text-center">
                        <button className="text-xs text-danger hover:opacity-70" title="Delete row" onClick={() => deleteRow(r)}>✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
          <button className={buttonClass.ghost} onClick={addRow}>+ Add row</button>
          <button className={buttonClass.primary} onClick={save} disabled={busy !== ''}>{busy === 'save' ? 'Saving…' : 'Save roster'}</button>
        </div>
      </Card>
    </>
  );
}
