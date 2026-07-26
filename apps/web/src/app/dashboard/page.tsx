export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/server/auth';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  redirect(session.profile.role === 'member' ? '/wallet' : '/org');
}
