'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buttonClass, Card, EmptyState, ErrorBox, inputClass, PageTitle, StatusPill } from '@/components/ui';

interface Meeting {
  id: string;
  room_name: string;
  scheduled_at: string;
  status: string;
}

export function MeetingsManager({ orgId, meetings, configured }: { orgId: string; meetings: Meeting[]; configured: boolean }) {
  const router = useRouter();
  const [roomName, setRoomName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, room_name: roomName }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? 'Could not create the meeting');
      return;
    }
    setRoomName('');
    router.refresh();
  }

  return (
    <>
      <PageTitle title="Conference meetings" subtitle="Self-hosted Jitsi rooms — your delegates join from inside the app, no Zoom needed." />
      {!configured ? (
        <ErrorBox message="Meetings are not configured yet. Set JITSI_DOMAIN, JITSI_APP_ID, and JITSI_JWT_SECRET in the web app's environment to enable them." />
      ) : (
        <Card>
          <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row">
            <input
              className={inputClass}
              placeholder="Room name, e.g. UNSC Committee Session 1"
              value={roomName}
              required
              minLength={2}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button className={buttonClass.primary} disabled={busy}>
              {busy ? 'Creating…' : 'Create room'}
            </button>
          </form>
          {error ? <div className="mt-3"><ErrorBox message={error} /></div> : null}
        </Card>
      )}

      <div className="mt-6">
        {meetings.length === 0 ? (
          <EmptyState title="No meetings yet" body="Create a room above. Delegates holding a credential from this conference see it in their wallet." />
        ) : (
          <ul className="grid gap-3">
            {meetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-md border border-border bg-surface/50 px-4 py-3">
                <div>
                  <p className="font-semibold">{m.room_name}</p>
                  <p className="text-xs text-muted">{m.scheduled_at.slice(0, 16).replace('T', ' ')} UTC</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusPill status={m.status} />
                  <Link href={`/meet/${m.id}`} className={buttonClass.outline}>
                    Join as host
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
