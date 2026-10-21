import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';

export function sb() {
  // Read cookies first so Next.js treats callers as dynamic even when config is missing.
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.');
  }
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies; middleware refreshes sessions.
        }
      },
    },
  });
}

export async function requireUser() {
  const s = sb();
  const { data: { user }, error } = await s.auth.getUser();
  if (error || !user) redirect('/login');
  return { s, user };
}

export async function requireAdmin() {
  const { s, user } = await requireUser();
  const { data: profile, error } = await s.from('profiles').select('role').eq('id', user.id).single();
  if (error || profile?.role !== 'admin') notFound();
  return s;
}
