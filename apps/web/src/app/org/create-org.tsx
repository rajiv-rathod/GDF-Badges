'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function CreateOrgForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [mymunUrl, setMymunUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/orgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mymun_url: mymunUrl }),
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
      <p className="mt-1 text-sm text-muted">
        To issue verifiable credentials, your conference must be listed on{' '}
        <a href="https://mymun.com" target="_blank" rel="noreferrer" className="text-primary-dark hover:underline">
          MyMUN
        </a>
        . Paste your conference&apos;s public MyMUN page to verify your identity — no approval needed.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Conference name</label>
          <input
            className={inputClass}
            placeholder="e.g. GDF International MUN 2026"
            value={name}
            required
            minLength={2}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">MyMUN conference link</label>
          <input
            className={inputClass}
            type="url"
            inputMode="url"
            placeholder="https://www.mymun.com/conferences/your-conference"
            value={mymunUrl}
            required
            onChange={(e) => setMymunUrl(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">
            Find your conference on mymun.com and copy the page URL. This proves the conference is real.
          </p>
        </div>
        <button className={`${buttonClass.primary} sm:self-start`} disabled={busy}>
          {busy ? 'Verifying…' : 'Verify & create'}
        </button>
      </form>
      {error ? <div className="mt-3"><ErrorBox message={error} /></div> : null}
    </Card>
  );
}
