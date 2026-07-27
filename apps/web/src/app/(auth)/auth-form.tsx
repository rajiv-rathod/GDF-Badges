'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'member' | 'organizer'>('member');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const supabase = supabaseBrowser();
      if (mode === 'signup') {
        // Instant signup (no email step): the server creates the account
        // already-confirmed, then we sign in normally to get a session.
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName, role }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Could not create your account');
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Claim anything issued to this email before the account existed.
      await fetch('/api/claim', { method: 'POST' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === 'signup'
          ? 'Badges and certificates issued to your email are waiting for you.'
          : 'Sign in to your GDF credential wallet.'}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        {mode === 'signup' ? (
          <>
            <input className={inputClass} placeholder="Full name" value={fullName} required onChange={(e) => setFullName(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              {(['member', 'organizer'] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-sm border px-3 py-2 text-sm font-semibold transition ${
                    role === r ? 'border-primary bg-primary/15 text-foreground' : 'border-border text-muted hover:text-foreground'
                  }`}
                >
                  {r === 'member' ? 'Delegate / Member' : 'Conference Organizer'}
                </button>
              ))}
            </div>
          </>
        ) : null}
        <input className={inputClass} type="email" placeholder="Email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        <input
          className={inputClass}
          type="password"
          placeholder="Password"
          value={password}
          required
          minLength={8}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <ErrorBox message={error} /> : null}
        {notice ? <p className="rounded-sm border border-primary/50 bg-primary/10 px-4 py-3 text-sm">{notice}</p> : null}
        <button className={buttonClass.primary} disabled={busy}>
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {mode === 'signup' ? (
          <>Already have an account? <Link className="text-primary-dark" href="/login">Sign in</Link></>
        ) : (
          <>New here? <Link className="text-primary-dark" href="/signup">Create an account</Link></>
        )}
      </p>
    </Card>
  );
}
