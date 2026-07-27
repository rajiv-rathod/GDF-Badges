'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function BrandingForm({
  orgId,
  initialLogo,
  initialAccent,
  initialTagline,
}: {
  orgId: string;
  initialLogo: string | null;
  initialAccent: string;
  initialTagline: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState(initialLogo);
  const [accent, setAccent] = useState(initialAccent || '#d73cbe');
  const [tagline, setTagline] = useState(initialTagline);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function upload(file: File) {
    setBusy('logo');
    setError('');
    const form = new FormData();
    form.set('org_id', orgId);
    form.set('file', file);
    const res = await fetch('/api/orgs/branding', { method: 'POST', body: form });
    const data = await res.json();
    setBusy('');
    if (!res.ok) setError(data.error ?? 'Upload failed');
    else {
      setLogo(data.logo_url);
      setMsg('Logo saved — it now appears on your credentials and verify pages.');
      router.refresh();
    }
  }

  async function saveMeta() {
    setBusy('meta');
    setError('');
    const res = await fetch('/api/orgs/branding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, accent, tagline }),
    });
    setBusy('');
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'Save failed');
    else setMsg('Branding saved.');
  }

  return (
    <Card>
      <h2 className="font-display font-semibold">Conference branding</h2>
      <p className="mt-1 text-sm text-muted">Your logo appears on issued credentials and their public verify pages.</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Conference logo" className="h-14 w-auto rounded-sm border border-border bg-white object-contain p-1" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-dashed border-border text-xs text-muted">No logo</div>
        )}
        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => { if (e.target.files?.[0]) upload(e.target.files[0]); e.target.value = ''; }} />
        <button className={buttonClass.outline} onClick={() => fileInput.current?.click()} disabled={busy !== ''}>
          {busy === 'logo' ? 'Uploading…' : logo ? 'Replace logo' : 'Upload logo'}
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted">Accent</span>
          <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-16 cursor-pointer rounded-sm border border-border bg-background" />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs uppercase tracking-wide text-muted">Tagline (optional)</span>
          <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="e.g. Excellence in diplomacy since 2018" />
        </label>
        <button className={buttonClass.primary} onClick={saveMeta} disabled={busy !== ''}>{busy === 'meta' ? 'Saving…' : 'Save'}</button>
      </div>
      {error ? <div className="mt-3"><ErrorBox message={error} /></div> : null}
      {msg ? <p className="mt-3 text-sm text-success">{msg}</p> : null}
    </Card>
  );
}
