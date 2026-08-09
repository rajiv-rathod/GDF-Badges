'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buttonClass, Card, ErrorBox, inputClass } from '@/components/ui';

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (step !== 'done') return;
    // The verify route signed us in via the session cookie; /dashboard routes
    // to the right home (and bounces to /login if no session was set).
    const t = setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [step, router]);

  async function requestCode() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'recovery' }),
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

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: 'recovery', code: code.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired code');
      setStep('done');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Reset your password</h1>
      {step === 'email' ? (
        <>
          <p className="mt-1 text-sm text-muted">Enter your account email and we&apos;ll send you a 6-digit code.</p>
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
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        </>
      ) : null}
      {step === 'code' ? (
        <>
          <p className="mt-1 text-sm text-muted">
            If an account exists for <span className="font-semibold text-foreground">{email}</span>, a 6-digit code is on
            its way. Enter it below with your new password.
          </p>
          <form onSubmit={submitReset} className="mt-6 flex flex-col gap-4">
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
            <input
              className={inputClass}
              type="password"
              placeholder="New password (min 8 characters)"
              value={password}
              required
              minLength={8}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            {error ? <ErrorBox message={error} /> : null}
            <button className={buttonClass.primary} disabled={busy}>
              {busy ? 'Updating…' : 'Set new password'}
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
      ) : null}
      {step === 'done' ? (
        <p className="mt-4 rounded-sm border border-primary/50 bg-primary/10 px-4 py-3 text-sm">
          Password updated — taking you to your dashboard…
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        Remembered it? <Link className="text-primary-dark" href="/login">Back to sign in</Link>
      </p>
    </Card>
  );
}
