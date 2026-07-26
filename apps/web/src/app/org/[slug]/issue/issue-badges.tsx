'use client';

import Image from 'next/image';
import { useState } from 'react';
import { buttonClass, Card, EmptyState, ErrorBox, inputClass, PageTitle } from '@/components/ui';

interface Template {
  id: string;
  name: string;
  description: string;
  image_url: string;
  org_id: string | null;
}
interface Delegate {
  id: string;
  name: string;
  email: string;
  committee: string;
  country_portfolio: string;
  award: string | null;
}

export function IssueBadges({
  orgId,
  templates,
  delegates,
  aiEnabled,
}: {
  orgId: string;
  templates: Template[];
  delegates: Delegate[];
  aiEnabled: boolean;
}) {
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [eventName, setEventName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [citation, setCitation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function draftCitation() {
    const template = templates.find((t) => t.id === templateId);
    const first = delegates.find((d) => selected.has(d.id));
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'citation',
        name: first?.name ?? manualName ?? 'the delegate',
        award: template?.name ?? 'Participation',
        committee: first?.committee ?? '',
        country: first?.country_portfolio ?? '',
        event_name: eventName,
      }),
    });
    const data = await res.json();
    if (res.ok) setCitation(data.citation);
    else setError(data.error ?? 'Citation drafting failed');
  }

  async function issue() {
    setBusy(true);
    setError('');
    setResult('');
    try {
      const recipients = delegates
        .filter((d) => selected.has(d.id))
        .map((d) => ({
          email: d.email,
          name: d.name,
          fields: {
            ...(d.committee ? { committee: d.committee } : {}),
            ...(d.country_portfolio ? { country: d.country_portfolio } : {}),
            ...(citation ? { citation } : {}),
          },
        }));
      if (manualEmail && manualName) {
        recipients.push({ email: manualEmail, name: manualName, fields: citation ? { citation } : {} });
      }
      if (recipients.length === 0) throw new Error('Pick at least one delegate or enter a recipient manually.');
      if (!eventName) throw new Error('Enter the event name (it appears on the credential).');

      const res = await fetch('/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, template_id: templateId, event_name: eventName, recipients }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Issuance failed');
      setResult(
        `Issued ${data.issued.length} badge${data.issued.length === 1 ? '' : 's'}` +
          (data.failures.length ? ` — ${data.failures.length} failed` : '') +
          '. Recipients can verify at their /verify link and will see it in their wallet when they sign up.',
      );
      setSelected(new Set());
      setManualEmail('');
      setManualName('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Issue badges" subtitle="Badges use fixed GDF templates — pick one, choose recipients, issue." />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h2 className="mb-3 font-display font-semibold">1 · Badge template</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplateId(t.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  templateId === t.id ? 'border-primary bg-primary/10' : 'border-border bg-surface/50 hover:border-primary/50'
                }`}
              >
                <Image src={t.image_url} alt="" width={56} height={56} />
                <p className="mt-2 font-display font-semibold">{t.name}</p>
                <p className="mt-1 text-xs text-muted">{t.description}</p>
              </button>
            ))}
          </div>

          <h2 className="mb-3 mt-8 font-display font-semibold">2 · Event name</h2>
          <input className={inputClass} placeholder="e.g. GDF International MUN 2026" value={eventName} onChange={(e) => setEventName(e.target.value)} />

          {aiEnabled ? (
            <>
              <h2 className="mb-3 mt-8 font-display font-semibold">Optional · Citation</h2>
              <textarea
                className={`${inputClass} min-h-20`}
                placeholder="A short citation to include on the credential"
                value={citation}
                onChange={(e) => setCitation(e.target.value)}
              />
              <button className={`${buttonClass.ghost} mt-2`} onClick={draftCitation} type="button">
                ✨ Draft with AI
              </button>
            </>
          ) : null}
        </div>

        <div>
          <h2 className="mb-3 font-display font-semibold">3 · Recipients</h2>
          {delegates.length === 0 ? (
            <EmptyState title="No roster yet" body="Import delegates first, or add a single recipient below." />
          ) : (
            <Card className="max-h-96 overflow-y-auto !p-3">
              {delegates.map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-surface">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} className="accent-[#d73cbe]" />
                  <span className="flex-1">
                    {d.name} <span className="text-xs text-muted">· {d.email}</span>
                  </span>
                  <span className="text-xs text-muted">{d.committee}</span>
                </label>
              ))}
            </Card>
          )}

          <p className="mt-4 text-sm text-muted">Or add one recipient manually:</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <input className={inputClass} placeholder="Full name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <input className={inputClass} type="email" placeholder="Email" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} />
          </div>

          {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}
          {result ? <p className="mt-4 rounded-sm border border-success/50 bg-success/10 px-4 py-3 text-sm text-success">{result}</p> : null}

          <button className={`${buttonClass.primary} mt-6 w-full`} onClick={issue} disabled={busy}>
            {busy ? 'Issuing…' : `Issue to ${selected.size + (manualEmail && manualName ? 1 : 0)} recipient(s)`}
          </button>
        </div>
      </div>
    </>
  );
}
