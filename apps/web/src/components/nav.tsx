import Image from 'next/image';
import Link from 'next/link';
import { getSession } from '@/lib/server/auth';
import { SignOutButton } from './sign-out';

export async function AppNav() {
  const session = await getSession();
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/">
          <Image src="/gdf-logo.svg" alt="GDF — Global Diplomacy Forum" width={180} height={36} />
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {session ? (
            <>
              <Link href="/wallet" className="text-muted transition hover:text-foreground">
                My credentials
              </Link>
              {session.profile.role !== 'member' ? (
                <Link href="/org" className="text-muted transition hover:text-foreground">
                  Organizer
                </Link>
              ) : null}
              <Link href={`/u/${session.profile.public_slug}`} className="text-muted transition hover:text-foreground">
                Public profile
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted transition hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="gdf-cta-gradient rounded-sm px-4 py-1.5 font-display font-semibold text-background hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
