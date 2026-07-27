'use client';

import { useState } from 'react';

/**
 * Credly-style sharing for a credential: one-click "Add to LinkedIn profile"
 * (Licenses & Certifications), social share, copy link, and a website embed
 * snippet. Fires a best-effort share log so issuers can see share counts.
 */
export function ShareBar({
  code,
  templateName,
  orgName,
  issuedAt,
  compact = false,
}: {
  code: string;
  templateName: string;
  orgName: string;
  issuedAt: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);

  const base = 'https://certview.gdf.social';
  const verifyUrl = `${base}/verify/${code}`;
  const embedUrl = `${base}/embed/${code}`;
  const d = new Date(issuedAt);
  const embedSnippet = `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${embedUrl}.svg" alt="${templateName} — ${orgName}" width="320" height="120" style="border:0"/></a>`;

  function log() {
    // best-effort; ignores failure (share counting activates once its migration runs)
    navigator.sendBeacon?.('/api/share', new Blob([JSON.stringify({ code })], { type: 'application/json' }));
  }

  const linkedInAdd =
    'https://www.linkedin.com/profile/add?' +
    new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: templateName,
      organizationName: orgName,
      issueYear: String(d.getUTCFullYear()),
      issueMonth: String(d.getUTCMonth() + 1),
      certUrl: verifyUrl,
      certId: code,
    }).toString();

  const shares: Array<{ label: string; href: string }> = [
    { label: 'Add to LinkedIn', href: linkedInAdd },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}` },
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I earned ${templateName} from ${orgName}!`)}&url=${encodeURIComponent(verifyUrl)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}` },
    { label: 'Email', href: `mailto:?subject=${encodeURIComponent(`My ${templateName} credential`)}&body=${encodeURIComponent(`Verify it here: ${verifyUrl}`)}` },
  ];

  async function copy(text: string, tag: string) {
    await navigator.clipboard.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(''), 1500);
  }

  const btn =
    'inline-flex items-center rounded-sm border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary-dark transition hover:border-primary';

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'flex flex-col gap-3'}>
      <div className="flex flex-wrap gap-2">
        {shares.map((s) => (
          <a key={s.label} href={s.href} target="_blank" rel="noreferrer" onClick={log} className={btn}>
            {s.label}
          </a>
        ))}
        <button className={btn} onClick={() => { copy(verifyUrl, 'link'); log(); }}>
          {copied === 'link' ? 'Copied!' : 'Copy link'}
        </button>
        {!compact ? (
          <button className={btn} onClick={() => setShowEmbed((v) => !v)}>
            {showEmbed ? 'Hide embed' : 'Embed'}
          </button>
        ) : null}
      </div>
      {showEmbed ? (
        <div className="rounded-md border border-border bg-background/60 p-3">
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Paste this on any website</p>
          <code className="block max-w-full overflow-x-auto whitespace-pre rounded-sm bg-surface p-2 text-xs">{embedSnippet}</code>
          <button className={`${btn} mt-2`} onClick={() => copy(embedSnippet, 'embed')}>
            {copied === 'embed' ? 'Copied!' : 'Copy embed code'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
