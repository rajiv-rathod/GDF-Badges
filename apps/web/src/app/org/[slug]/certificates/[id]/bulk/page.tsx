import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { aiEnabled } from '@/lib/server/gemini';
import { BulkIssue } from './bulk-issue';
import type { CertificateField } from '@gdf/shared';

export default async function BulkIssuePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  const { data: template } = await supabaseAdmin()
    .from('certificate_templates')
    .select('id, name, background_url, layout_json, page_size')
    .eq('id', id)
    .eq('org_id', ctx.org.id)
    .maybeSingle();
  if (!template) redirect(`/org/${slug}/certificates`);

  return (
    <BulkIssue
      orgId={ctx.org.id}
      template={{
        id: template.id,
        name: template.name,
        background_url: template.background_url,
        layout_json: template.layout_json as CertificateField[],
        page_size: template.page_size,
      }}
      aiEnabled={aiEnabled}
    />
  );
}
