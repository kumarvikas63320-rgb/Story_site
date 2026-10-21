import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return new NextResponse('Supabase environment variables are missing.', { status: 500 });
  }

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
        items.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        items.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const login = new URL('/login', req.url);
    login.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = { matcher: ['/write/:path*', '/dashboard/:path*', '/admin/:path*'] };
