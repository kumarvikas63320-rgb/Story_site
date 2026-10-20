import { NextResponse } from 'next/server';
import { sb } from '@/lib/supabase';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');

  if (code) await sb().auth.exchangeCodeForSession(code);

  let n = u.searchParams.get('next') || '/dashboard';

  if (!n.startsWith('/') || n.startsWith('//')) {
    n = '/dashboard';
  }

  return NextResponse.redirect(new URL(n, u.origin));
}
