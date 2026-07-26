import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Designer } from './designer';
import type { CertificateField } from '@gdf/shared';

export default async function DesignerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  let template: {
    id: string | null;
    name: string;
    background_url: string;
    layout_json: CertificateField[];
    page_size: string;
  } = {
    id: null,
    name: 'Untitled certificate',
    background_url: '',
    layout_json: [
      { key: 'recipient_name', label: 'Recipient name', x: 10, y: 42, width: 80, font: 'Helvetica', size: 34, weight: 700, align: 'center', color: '#06002e', sample: 'Amina Delegate' },
      { key: 'award', label: 'Award', x: 10, y: 56, width: 80, font: 'Helvetica', size: 18, weight: 400, align: 'center', color: '#06002e', sample: 'Best Delegate — UNSC' },
      { key: 'event_name', label: 'Event', x: 10, y: 66, width: 80, font: 'Helvetica', size: 14, weight: 400, align: 'center', color: '#06002e', sample: 'GDF International MUN 2026' },
      { key: 'date', label: 'Date', x: 10, y: 80, width: 30, font: 'Helvetica', size: 11, weight: 400, align: 'left', color: '#06002e', sample: 'July 2026' },
    ],
    page_size: 'A4-landscape',
  };

  if (id !== 'new') {
    const { data } = await supabaseAdmin()
      .from('certificate_templates')
      .select('id, name, background_url, layout_json, page_size')
      .eq('id', id)
      .eq('org_id', ctx.org.id)
      .maybeSingle();
    if (!data) redirect(`/org/${slug}/certificates`);
    template = data as typeof template;
  }

  return <Designer orgId={ctx.org.id} orgSlug={slug} template={template} />;
}
