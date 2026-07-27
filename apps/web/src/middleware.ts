import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const firstEnv = (...names: string[]) => names.map((n) => process.env[n]).find((v) => v && v.trim())?.trim();

/** Keeps Supabase sessions fresh on every request (standard @supabase/ssr pattern). */
export async function middleware(request: NextRequest) {
  const url = firstEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const anonKey = firstEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY');
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list: CookieToSet[]) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|badges/|fonts/|gdf-logo.svg).*)'],
};
