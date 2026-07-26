'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not create the conference');
      return;
    }
    router.push(`/org/${data.org.slug}`);
    router.refresh();
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold">Create a conference</h2>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className={inputClass}
          placeholder="e.g. GDF International MUN 2026"
          value={name}
          required
          minLength={2}
          onChange={(e) => setName(e.target.value)}
        />
        <button className={buttonClass.primary} disabled={busy}>
          {busy ? 'Creating…' : 'Create'}
        </button>
      </form>
      {error ? <div className="mt-3"><ErrorBox message={error} /></div> : null}
    </Card>
  );
}
