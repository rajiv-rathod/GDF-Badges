'use client';

import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="text-muted transition hover:text-foreground"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push('/');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
