import Image from 'next/image';
import Link from 'next/link';
import { AppNav } from '@/components/nav';
import { EmptyState } from '@/components/ui';
import { supabaseAdmin } from '@/lib/supabase/server';

interface PublicCredential {
  id: string;
  type: string;
  event_name: string;
  issued_at: string;
  verification_code: string;
  asset_url: string | null;
  org_name: string;
  template_name: string;
  template_image: string | null;
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = supabaseAdmin();
  const { data } = await admin.rpc('get_public_profile', { p_slug: slug });

  // Skills wallet: aggregate skills across this member's public, claimed
  // credentials (skills live comma-separated in fields_json.skills).
  let skillWallet: string[] = [];
  if (data) {
    const { data: prof } = await admin.from('profiles').select('id').eq('public_slug', slug).maybeSingle();
    if (prof?.id) {
      const { data: creds } = await admin
        .from('credentials')
        .select('fields_json')
        .eq('recipient_user_id', prof.id)
        .eq('is_public', true)
        .eq('status', 'claimed');
      const set = new Set<string>();
      for (const c of creds ?? []) {
        String((c.fields_json as Record<string, string> | null)?.skills ?? '')
          .split(',').map((s) => s.trim()).filter(Boolean)
          .forEach((s) => set.add(s));
      }
      skillWallet = [...set].sort();
    }
  }

  if (!data) {
    return (
      <>
        <AppNav />
        <main className="mx-auto max-w-4xl px-6 py-20">
          <EmptyState title="Profile not found" body="This public profile does not exist or has been removed." />
        </main>
      </>
    );
  }

  const credentials: PublicCredential[] = data.credentials ?? [];
  return (
    <>
      <AppNav />
      <main className="relative min-h-screen">
        <div className="gdf-globe-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-6 py-14">
          <div className="flex items-center gap-4">
            <div className="gdf-cta-gradient flex h-16 w-16 items-center justify-center rounded-full font-display text-xl font-bold text-background">
              {(data.full_name || slug).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold">{data.full_name || slug}</h1>
              <p className="text-sm text-muted">Verified Model UN credentials · powered by GDF</p>
            </div>
          </div>

          {skillWallet.length > 0 ? (
            <div className="mt-8 rounded-lg border border-border bg-surface/70 p-5">
              <p className="text-xs uppercase tracking-wide text-muted">Skills wallet</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {skillWallet.map((s) => (
                  <span key={s} className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary-dark">{s}</span>
                ))}
              </div>
            </div>
          ) : null}

          {credentials.length === 0 ? (
            <div className="mt-10">
              <EmptyState title="Nothing public yet" body="This member has not made any credentials public." />
            </div>
          ) : (
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {credentials.map((c) => (
                <Link
                  key={c.id}
                  href={`/verify/${c.verification_code}`}
                  className="group rounded-lg border border-border bg-surface/50 p-5 transition hover:border-primary"
                >
                  <div className="flex items-center gap-4">
                    {c.template_image ? (
                      <Image src={c.template_image} alt="" width={56} height={56} />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md border border-primary/50 text-xs font-bold text-primary-dark">
                        CERT
                      </div>
                    )}
                    <div>
                      <p className="font-display font-semibold group-hover:text-primary-dark">{c.template_name}</p>
                      <p className="text-sm text-muted">
                        {c.event_name} · {c.org_name}
                      </p>
                      <p className="text-xs text-muted">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
