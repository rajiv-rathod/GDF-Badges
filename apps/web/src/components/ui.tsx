import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-border bg-surface/50 p-6 backdrop-blur ${className}`}>{children}</div>;
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-1 text-muted">{subtitle}</p> : null}
    </div>
  );
}

export const inputClass =
  'w-full rounded-sm border border-border bg-background/70 px-3 py-2 text-foreground placeholder:text-muted/60 focus:border-primary focus:outline-none';

export const buttonClass = {
  primary:
    'gdf-cta-gradient inline-flex items-center justify-center rounded-sm px-5 py-2.5 font-display font-semibold text-background transition hover:opacity-90 disabled:opacity-40',
  outline:
    'inline-flex items-center justify-center rounded-sm border border-primary px-5 py-2.5 font-display font-semibold text-foreground transition hover:bg-surface disabled:opacity-40',
  danger:
    'inline-flex items-center justify-center rounded-sm border border-danger px-4 py-1.5 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-40',
  ghost:
    'inline-flex items-center justify-center rounded-sm px-4 py-1.5 text-sm font-semibold text-muted transition hover:text-foreground disabled:opacity-40',
};

export function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    issued: 'bg-primary/20 text-accent border-primary/40',
    claimed: 'bg-success/15 text-success border-success/40',
    revoked: 'bg-danger/15 text-danger border-danger/50',
    scheduled: 'bg-primary/20 text-accent border-primary/40',
    live: 'bg-success/15 text-success border-success/40',
    ended: 'bg-border/40 text-muted border-border',
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${styles[status] ?? 'text-muted border-border'}`}>
      {status}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
    </Card>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-sm border border-danger/50 bg-danger/10 px-4 py-3 text-sm text-danger">{message}</div>;
}
