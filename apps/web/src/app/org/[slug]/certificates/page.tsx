import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState, PageTitle, buttonClass } from '@/components/ui';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';

export default async function CertificateTemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const { data: templates } = await supabaseAdmin()
    .from('certificate_templates')
    .select('id, name, page_size, background_url, created_at')
    .eq('org_id', ctx.org.id)
    .order('created_at', { ascending: false });

  return (
    <>
      <PageTitle
        title="Certificate templates"
        subtitle="Fully custom, Canva-style: upload a background, place the fields, bulk-issue from a sheet."
      />
      <Link href={`/org/${slug}/certificates/new`} className={buttonClass.primary}>
        + New template
      </Link>
      <div className="mt-6">
        {(templates ?? []).length === 0 ? (
          <EmptyState title="No templates yet" body="Create your first certificate template — you design it once and issue it hundreds of times." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates!.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-surface/50 p-5">
                {t.background_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.background_url} alt="" className="mb-3 aspect-[297/210] w-full rounded-sm object-cover" />
                ) : (
                  <div className="mb-3 flex aspect-[297/210] w-full items-center justify-center rounded-sm border border-primary/40 bg-background text-xs text-muted">
                    GDF default background
                  </div>
                )}
                <p className="font-display font-semibold">{t.name}</p>
                <p className="text-xs text-muted">{t.page_size}</p>
                <div className="mt-3 flex gap-4 text-sm">
                  <Link className="font-semibold text-accent hover:underline" href={`/org/${slug}/certificates/${t.id}`}>
                    Edit design
                  </Link>
                  <Link className="font-semibold text-accent hover:underline" href={`/org/${slug}/certificates/${t.id}/bulk`}>
                    Bulk issue
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
