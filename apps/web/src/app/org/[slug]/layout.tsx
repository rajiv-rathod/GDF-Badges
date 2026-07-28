import Link from 'next/link';
import { redirect } from 'next/navigation';
import { brand } from '@gdf/shared';
import { AppNav } from '@/components/nav';
import { requireOrgStaff } from '@/lib/server/auth';

const TABS = [
  { href: '', label: 'Overview', tour: 'org-tab-overview' },
  { href: '/delegates', label: 'Delegates', tour: 'org-tab-delegates' },
  { href: '/issue', label: 'Issue badges', tour: 'org-tab-issue' },
  { href: '/certificates', label: 'Certificates', tour: 'org-tab-certificates' },
  { href: '/credentials', label: 'Issued', tour: 'org-tab-issued' },
];

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ctx = await requireOrgStaff(slug);
  if (!ctx) redirect('/org');

  return (
    <>
      <AppNav />
      <div className="border-b border-border bg-surface/30">
        <div className="mx-auto max-w-6xl px-6 pt-6">
          <h1 className="font-display text-2xl font-bold">{ctx.org.name}</h1>
          <nav className="mt-4 flex items-center gap-1 overflow-x-auto text-sm">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={`/org/${slug}${tab.href}`}
                data-tour={tab.tour}
                className="whitespace-nowrap rounded-t-md px-4 py-2 font-semibold text-muted transition hover:bg-surface hover:text-foreground"
              >
                {tab.label}
              </Link>
            ))}
            <a
              href={brand.meetingAppUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto whitespace-nowrap rounded-sm border border-primary px-4 py-1.5 font-semibold text-primary-dark transition hover:bg-primary/10"
            >
              Launch meeting app ↗
            </a>
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
