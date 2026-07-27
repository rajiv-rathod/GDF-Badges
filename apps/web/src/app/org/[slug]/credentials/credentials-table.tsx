'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClass, EmptyState, PageTitle, StatusPill } from '@/components/ui';

interface Row {
  id: string;
  type: string;
  recipient_name: string;
  recipient_email: string;
  event_name: string;
  issued_at: string;
  status: string;
  verification_code: string;
  asset_url: string | null;
}

const FILTERS = ['all', 'issued', 'claimed', 'revoked'] as const;

export function CredentialsTable({ credentials, orgId }: { credentials: Row[]; orgId: string }) {
  const [rows, setRows] = useState(credentials);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [copied, setCopied] = useState('');
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState('');

  const unclaimed = rows.filter((r) => r.status === 'issued').length;

  async function remindUnclaimed() {
    setReminding(true);
    setRemindMsg('');
    const res = await fetch('/api/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    });
    const data = await res.json().catch(() => ({}));
    setReminding(false);
    setRemindMsg(res.ok ? `Reminder emailed to ${data.sent}/${data.pending} unclaimed recipients.` : (data.error ?? 'Failed'));
  }

  const visible = rows.filter((r) => filter === 'all' || r.status === filter);

  async function revoke(row: Row) {
    if (!window.confirm(`Revoke this ${row.type} for ${row.recipient_name}? The verify page will show REVOKED immediately.`)) return;
    const res = await fetch(`/api/credentials/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
    });
    if (res.ok) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'revoked' } : r)));
    } else {
      const data = await res.json().catch(() => ({}));
      window.alert(`Revoke failed: ${data.error ?? res.statusText}`);
    }
  }

  async function copyLink(row: Row) {
    await navigator.clipboard.writeText(`${window.location.origin}/verify/${row.verification_code}`);
    setCopied(row.id);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <>
      <PageTitle title="Issued credentials" subtitle="Everything this conference has issued — share links, track claims, revoke." />
      {unclaimed > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface/70 px-4 py-3">
          <span className="text-sm text-muted">{unclaimed} credential{unclaimed === 1 ? '' : 's'} awaiting claim.</span>
          <button className={buttonClass.outline} onClick={remindUnclaimed} disabled={reminding}>
            {reminding ? 'Sending…' : 'Remind unclaimed'}
          </button>
          {remindMsg ? <span className="text-sm text-success">{remindMsg}</span> : null}
        </div>
      ) : null}
      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold capitalize transition ${
              filter === f ? 'border-primary bg-primary/15' : 'border-border text-muted hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState title="Nothing here" body={filter === 'all' ? 'No credentials issued yet — start from the Issue badges or Certificates tab.' : `No ${filter} credentials.`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/60">
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3">
                    {r.recipient_name}
                    <span className="block text-xs text-muted">{r.recipient_email}</span>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.type}</td>
                  <td className="px-4 py-3">{r.event_name}</td>
                  <td className="px-4 py-3 text-muted">{r.issued_at.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link className="font-semibold text-primary-dark hover:underline" href={`/verify/${r.verification_code}`}>
                        Verify
                      </Link>
                      <button className="font-semibold text-muted hover:text-foreground" onClick={() => copyLink(r)}>
                        {copied === r.id ? 'Copied!' : 'Copy link'}
                      </button>
                      {r.status !== 'revoked' ? (
                        <button className={buttonClass.danger} onClick={() => revoke(r)}>
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
