'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function OtpForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'signin' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send the code');
      setStep('code');
      setCooldown(30);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'signin', code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired code');
      // Claim anything issued to this email before the account existed.
      await fetch('/api/claim', { method: 'POST' });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Sign in with a code</h1>
      {step === 'email' ? (
        <>
          <p className="mt-1 text-sm text-muted">No password needed — we&apos;ll email you a 6-digit one-time code.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode();
            }}
            className="mt-6 flex flex-col gap-4"
          >
            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={email}
              required
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
            />
            {error ? <ErrorBox message={error} /> : null}
            <button className={buttonClass.primary} disabled={busy}>
              {busy ? 'Sending…' : 'Email me a code'}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>, a 6-digit code is on
            its way. It expires in 10 minutes.
          </p>
          <form onSubmit={submitCode} className="mt-6 flex flex-col gap-4">
            <input
              className={`${inputClass} text-center text-xl tracking-[0.4em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              required
              minLength={4}
              maxLength={10}
              autoFocus
              onChange={(e) => setCode(e.target.value)}
            />
            {error ? <ErrorBox message={error} /> : null}
            <button className={buttonClass.primary} disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
            <button
              type="button"
              className={buttonClass.ghost}
              disabled={busy || cooldown > 0}
              onClick={() => void requestCode()}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
          </form>
        </>
      )}
      <p className="mt-4 text-sm text-muted">
        Prefer your password? <Link className="text-primary-dark" href="/login">Sign in normally</Link>
      </p>
    </Card>
  );
}
