'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { StatusPill } from '@/components/ui';

export interface WalletCredential {
  id: string;
  type: string;
  recipient_name: string;
  event_name: string;
  issued_at: string;
  status: string;
  verification_code: string;
  asset_url: string | null;
  is_public: boolean;
  org_name: string;
  template_name: string;
  template_image: string | null;
}

export function WalletGrid({ credentials }: { credentials: WalletCredential[] }) {
  const [items, setItems] = useState(credentials);
  const [copied, setCopied] = useState('');

  async function toggleVisibility(credential: WalletCredential) {
    const next = !credential.is_public;
    setItems((prev) => prev.map((c) => (c.id === credential.id ? { ...c, is_public: next } : c)));
    const res = await fetch(`/api/credentials/${credential.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_visibility', is_public: next }),
    });
    if (!res.ok) {
      setItems((prev) => prev.map((c) => (c.id === credential.id ? { ...c, is_public: !next } : c)));
    }
  }

  async function copyLink(credential: WalletCredential) {
    await navigator.clipboard.writeText(`${window.location.origin}/verify/${credential.verification_code}`);
    setCopied(credential.id);
    setTimeout(() => setCopied(''), 1500);
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <div key={c.id} className="flex flex-col rounded-lg border border-border bg-surface/50 p-5">
          <div className="flex items-start justify-between gap-3">
            {c.template_image ? (
              <Image src={c.template_image} alt="" width={64} height={64} className="shrink-0" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-primary/50 text-xs font-bold text-accent">
                PDF
              </div>
            )}
            <StatusPill status={c.status} />
          </div>
          <h3 className="mt-3 font-display text-lg font-semibold">{c.template_name}</h3>
          <p className="text-sm text-muted">
            {c.event_name} · {c.org_name}
          </p>
          <p className="mt-1 text-xs text-muted">Issued {c.issued_at.slice(0, 10)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
            <Link className="font-semibold text-accent hover:underline" href={`/verify/${c.verification_code}`}>
              Verify
            </Link>
            {c.asset_url ? (
              <a className="font-semibold text-accent hover:underline" href={c.asset_url} target="_blank" rel="noreferrer">
                Download
              </a>
            ) : null}
            <button className="font-semibold text-muted hover:text-foreground" onClick={() => copyLink(c)}>
              {copied === c.id ? 'Copied!' : 'Copy link'}
            </button>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={c.is_public} onChange={() => toggleVisibility(c)} className="accent-[#d73cbe]" />
              Public
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
