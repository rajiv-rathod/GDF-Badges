'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { buttonClass, Card, EmptyState, ErrorBox, PageTitle } from '@/components/ui';

interface DelegateRow {
  id?: string;
  name: string;
  email: string;
  committee: string;
  country_portfolio: string;
  award: string | null;
}

/** Best-effort mapping of arbitrary sheet headers onto delegate fields. */
function guessRows(sheetRows: Array<Record<string, unknown>>): DelegateRow[] {
  const find = (row: Record<string, unknown>, patterns: RegExp[]) => {
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
      award: find(row, [/award|prize|position/]) || null,
    }))
    .filter((r) => r.email.includes('@'));
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
  const [pending, setPending] = useState<DelegateRow[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function onFile(file: File) {
    setError('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer());
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]]);
      const guessed = guessRows(rows);
      if (guessed.length === 0) throw new Error('No rows with an email column found in that sheet.');
      setPending(guessed);
      setNotice(`${guessed.length} delegates parsed — review below, then import.`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function aiClean() {
    setBusy('clean');
    setError('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clean_sheet',
          rows: pending.map((r) => ({ ...r, award: r.award ?? '' })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'AI cleanup failed');
      setPending(
        (data.rows as Array<Record<string, string>>).map((r) => ({
          name: r.name ?? '',
          email: r.email ?? '',
          committee: r.committee ?? '',
          country_portfolio: r.country_portfolio ?? '',
          award: r.award || null,
        })),
      );
      setNotice('Sheet cleaned by AI — review and import.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function importPending() {
    setBusy('import');
    setError('');
    const res = await fetch('/api/delegates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, delegates: pending }),
    });
    const data = await res.json();
    setBusy('');
    if (!res.ok) {
      setError(data.error ?? 'Import failed');
      return;
    }
    setNotice(`Imported ${data.imported} delegates${data.failures?.length ? `, ${data.failures.length} failed` : ''}.`);
    setPending([]);
    router.refresh();
  }

  function exportSheet() {
    const sheet = XLSX.utils.json_to_sheet(
      initialDelegates.map(({ name, email, committee, country_portfolio, award }) => ({
        Name: name,
        Email: email,
        Committee: committee,
        'Country / Portfolio': country_portfolio,
        Award: award ?? '',
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Delegates');
    XLSX.writeFile(workbook, 'delegates.xlsx');
  }

  async function removeDelegate(id: string) {
    await fetch('/api/delegates', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, id }),
    });
    router.refresh();
  }

  return (
    <>
      <PageTitle title="Delegates" subtitle="Import your conference roster once — badges and certificates issue straight from it." />
      <div className="flex flex-wrap gap-3">
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <button className={buttonClass.primary} onClick={() => fileInput.current?.click()}>
          Import sheet (XLSX / CSV)
        </button>
        {initialDelegates.length > 0 ? (
          <button className={buttonClass.outline} onClick={exportSheet}>
            Export XLSX
          </button>
        ) : null}
      </div>

      {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}
      {notice ? <p className="mt-4 rounded-sm border border-primary/50 bg-primary/10 px-4 py-2 text-sm">{notice}</p> : null}

      {pending.length > 0 ? (
        <Card className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display font-semibold">Ready to import ({pending.length})</h2>
            <div className="flex gap-2">
              {aiEnabled ? (
                <button className={buttonClass.outline} onClick={aiClean} disabled={busy !== ''}>
                  {busy === 'clean' ? 'Cleaning…' : '✨ AI clean-up'}
                </button>
              ) : null}
              <button className={buttonClass.primary} onClick={importPending} disabled={busy !== ''}>
                {busy === 'import' ? 'Importing…' : 'Import all'}
              </button>
            </div>
          </div>
          <TableView rows={pending.slice(0, 50)} />
          {pending.length > 50 ? <p className="mt-2 text-xs text-muted">Showing first 50 of {pending.length}.</p> : null}
        </Card>
      ) : null}

      <div className="mt-8">
        {initialDelegates.length === 0 && pending.length === 0 ? (
          <EmptyState title="No delegates yet" body="Import an XLSX or CSV sheet with Name, Email, Committee, Country, and Award columns." />
        ) : initialDelegates.length > 0 ? (
          <Card>
            <h2 className="font-display font-semibold">Roster ({initialDelegates.length})</h2>
            <TableView rows={initialDelegates} onRemove={removeDelegate} />
          </Card>
        ) : null}
      </div>
    </>
  );
}

function TableView({ rows, onRemove }: { rows: DelegateRow[]; onRemove?: (id: string) => void }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Committee</th>
            <th className="py-2 pr-4">Country / Portfolio</th>
            <th className="py-2 pr-4">Award</th>
            {onRemove ? <th /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b border-border/40">
              <td className="py-2 pr-4">{r.name}</td>
              <td className="py-2 pr-4 text-muted">{r.email}</td>
              <td className="py-2 pr-4">{r.committee}</td>
              <td className="py-2 pr-4">{r.country_portfolio}</td>
              <td className="py-2 pr-4">{r.award ?? ''}</td>
              {onRemove && r.id ? (
                <td className="py-2 text-right">
                  <button className="text-xs text-danger hover:underline" onClick={() => onRemove(r.id!)}>
                    Remove
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
