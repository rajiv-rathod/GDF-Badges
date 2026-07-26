'use client';

import { useState } from 'react';
import { buttonClass, Card, inputClass } from '@/components/ui';

/** Feature-flagged Gemini help widget for organizers. */
export function HelpAssistant() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setAnswer('');
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'help', question }),
    });
    const data = await res.json();
    setBusy(false);
    setAnswer(res.ok ? data.answer : (data.error ?? 'Assistant unavailable.'));
  }

  return (
    <Card className="mt-8">
      <h2 className="font-display font-semibold">✨ Ask the assistant</h2>
      <form onSubmit={ask} className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          className={inputClass}
          placeholder="e.g. How do I map sheet columns to certificate fields?"
          value={question}
          minLength={3}
          required
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button className={buttonClass.outline} disabled={busy}>
          {busy ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      {answer ? <p className="mt-4 whitespace-pre-wrap rounded-sm border border-border bg-background/60 px-4 py-3 text-sm">{answer}</p> : null}
    </Card>
  );
}
