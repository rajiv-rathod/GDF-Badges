'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, ErrorBox, inputClass, PageTitle, StatusPill } from '@/components/ui';

export interface LandingContent {
  headline: string;
  subhead: string;
  about_title: string;
  about_body: string;
  banner: string;
}

export interface AdminMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  banned: boolean;
}
export interface AdminOrg {
  id: string;
  name: string;
  slug: string;
  owner: string;
  created_at: string;
}
interface Stats {
  members: number;
  organizers: number;
  orgs: number;
  credentials: number;
  delegates: number;
}

const TABS = ['Overview', 'Members', 'Organizers', 'Email blast', 'Landing page'] as const;
type Tab = (typeof TABS)[number];

export function AdminConsole({
  adminEmail,
  members,
  orgs,
  stats,
  landing,
}: {
  adminEmail: string;
  members: AdminMember[];
  orgs: AdminOrg[];
  stats: Stats;
  landing: LandingContent;
}) {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <>
      <PageTitle title="Admin console" subtitle={`Signed in as ${adminEmail} — full control of MUN CertView.`} />
      <div className="mb-6 flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-t-md px-4 py-2 text-sm font-semibold transition ${
              tab === t ? 'border-b-2 border-primary text-foreground' : 'text-muted hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <Overview stats={stats} />}
      {tab === 'Members' && <Members members={members} />}
      {tab === 'Organizers' && <Organizers orgs={orgs} />}
      {tab === 'Email blast' && <Broadcast stats={stats} />}
      {tab === 'Landing page' && <Landing landing={landing} />}
    </>
  );
}

function Overview({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Members', value: stats.members },
    { label: 'Organizers', value: stats.organizers },
    { label: 'Conferences', value: stats.orgs },
    { label: 'Credentials issued', value: stats.credentials },
    { label: 'Delegates on rosters', value: stats.delegates },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <Card key={c.label} className="!p-4 text-center">
          <p className="font-display text-3xl font-bold text-primary-dark">{c.value}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}

function Members({ members }: { members: AdminMember[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  async function act(body: Record<string, unknown>, optimistic: (m: AdminMember[]) => AdminMember[]) {
    setError('');
    const prev = rows;
    setRows(optimistic(rows));
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setRows(prev);
      setError((await res.json().catch(() => ({}))).error ?? 'Action failed');
    } else if (body.action === 'delete') {
      router.refresh();
    }
  }

  const visible = rows.filter(
    (m) => !q || m.email.toLowerCase().includes(q.toLowerCase()) || m.full_name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <input className={`${inputClass} mb-4 max-w-sm`} placeholder="Search members…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error ? <div className="mb-4"><ErrorBox message={error} /></div> : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => (
              <tr key={m.id} className="border-t border-border/50">
                <td className="px-4 py-3">
                  {m.full_name || '—'}
                  <span className="block text-xs text-muted">{m.email}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="rounded-sm border border-border bg-background px-2 py-1 text-xs"
                    value={m.role}
                    onChange={(e) => act({ action: 'set_role', user_id: m.id, role: e.target.value }, (list) => list.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)))}
                  >
                    <option value="member">member</option>
                    <option value="organizer">organizer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-muted">{m.created_at.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs">
                    {m.banned ? (
                      <>
                        <StatusPill status="revoked" />
                        <button className={buttonClass.ghost} onClick={() => act({ action: 'unban', email: m.email }, (l) => l.map((x) => (x.id === m.id ? { ...x, banned: false } : x)))}>Unban</button>
                      </>
                    ) : (
                      <button className={buttonClass.danger} onClick={() => act({ action: 'ban', email: m.email }, (l) => l.map((x) => (x.id === m.id ? { ...x, banned: true } : x)))}>Ban</button>
                    )}
                    <button
                      className={buttonClass.danger}
                      onClick={() => window.confirm(`Permanently delete ${m.email}? This removes their account and credentials.`) && act({ action: 'delete', user_id: m.id }, (l) => l.filter((x) => x.id !== m.id))}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Organizers({ orgs }: { orgs: AdminOrg[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function addOrganizer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    const res = await fetch('/api/admin/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_organizer', ...form }),
    });
    setBusy(false);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'Failed');
    else {
      setMsg(`Organizer ${form.email} created.`);
      setForm({ email: '', password: '', full_name: '' });
      router.refresh();
    }
  }

  return (
    <>
      <Card className="mb-6">
        <h2 className="font-display font-semibold">Add an organizer</h2>
        <form onSubmit={addOrganizer} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input className={inputClass} placeholder="Full name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className={inputClass} type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inputClass} type="password" placeholder="Temp password (8+)" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className={buttonClass.primary} disabled={busy}>{busy ? 'Creating…' : 'Create organizer'}</button>
        </form>
        {error ? <div className="mt-3"><ErrorBox message={error} /></div> : null}
        {msg ? <p className="mt-3 text-sm text-success">{msg}</p> : null}
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface">
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Conference</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-border/50">
                <td className="px-4 py-3">{o.name}<span className="block text-xs text-muted">/{o.slug}</span></td>
                <td className="px-4 py-3">{o.owner}</td>
                <td className="px-4 py-3 text-muted">{o.created_at.slice(0, 10)}</td>
              </tr>
            ))}
            {orgs.length === 0 ? <tr><td className="px-4 py-6 text-center text-muted" colSpan={3}>No conferences yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Broadcast({ stats }: { stats: Stats }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'members' | 'delegates' | 'all'>('all');
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  async function post(payload: Record<string, unknown>, label: string) {
    setBusy(label);
    setError('');
    setResult('');
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, body_html: body, audience, ...payload }),
    });
    const data = await res.json();
    setBusy('');
    if (!res.ok) setError(data.error ?? 'Send failed');
    else if (payload.test_to) setResult(`Test sent to ${data.tested} (${data.ok ? 'delivered to SMTP' : 'SMTP rejected'}).`);
    else setResult(`Sent to ${data.sent}/${data.recipients} recipients${data.failed ? `, ${data.failed} failed` : ''}.`);
  }

  return (
    <Card className="max-w-2xl">
      <h2 className="font-display font-semibold">Email all members</h2>
      <p className="mt-1 text-sm text-muted">
        Sends via your mailcow SMTP. Audience counts: members {stats.members}, delegates {stats.delegates}.
      </p>
      <div className="mt-4 grid gap-3">
        <input className={inputClass} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className={`${inputClass} min-h-40`} placeholder="Message (HTML allowed — e.g. <p>Hello delegates!</p>)" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Audience
            <select className={`${inputClass} max-w-40`} value={audience} onChange={(e) => setAudience(e.target.value as typeof audience)}>
              <option value="all">Everyone</option>
              <option value="members">Members (accounts)</option>
              <option value="delegates">Delegates (rosters)</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputClass} max-w-xs`} type="email" placeholder="Send a test to…" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button className={buttonClass.outline} disabled={!subject || !body || !testTo || busy !== ''} onClick={() => post({ test_to: testTo }, 'test')}>
            {busy === 'test' ? 'Sending…' : 'Send test'}
          </button>
        </div>
        {error ? <ErrorBox message={error} /> : null}
        {result ? <p className="rounded-sm border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">{result}</p> : null}
        <button
          className={buttonClass.primary}
          disabled={!subject || !body || busy !== ''}
          onClick={() => window.confirm('Send this email to the whole selected audience?') && post({}, 'blast')}
        >
          {busy === 'blast' ? 'Sending…' : 'Send to everyone'}
        </button>
      </div>
    </Card>
  );
}

function Landing({ landing }: { landing: LandingContent }) {
  const router = useRouter();
  const [form, setForm] = useState(landing);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setBusy(true);
    setMsg('');
    const res = await fetch('/api/admin/landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setBusy(false);
    setMsg(res.ok ? 'Saved — the landing page is updated.' : 'Save failed');
    if (res.ok) router.refresh();
  }

  const field = (k: keyof LandingContent, label: string, textarea = false) => (
    <label className="grid gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {textarea ? (
        <textarea className={`${inputClass} min-h-24`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      ) : (
        <input className={inputClass} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      )}
    </label>
  );

  return (
    <Card className="max-w-2xl">
      <h2 className="font-display font-semibold">Landing page content</h2>
      <p className="mt-1 text-sm text-muted">Edit what visitors see on the public home page.</p>
      <div className="mt-4 grid gap-4">
        {field('banner', 'Announcement banner (optional — shows a bar at the top)')}
        {field('headline', 'Hero headline')}
        {field('subhead', 'Hero subheadline', true)}
        {field('about_title', 'About section title')}
        {field('about_body', 'About section text', true)}
        <div className="flex items-center gap-3">
          <button className={buttonClass.primary} onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          {msg ? <span className="text-sm text-success">{msg}</span> : null}
        </div>
      </div>
    </Card>
  );
}
