import { redirect } from 'next/navigation';
import { requireOrgStaff } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/supabase/server';
import { Designer } from './designer';
import { blankLayout } from '../presets';

export default async function DesignerPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  let template: {
    id: string | null;
    name: string;
    background_url: string;
    layout_json: unknown[];
    page_size: string;
  } = {
    id: null,
    name: 'Untitled certificate',
    background_url: '',
    layout_json: blankLayout() as unknown[],
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
