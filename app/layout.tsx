import './globals.css';
import Link from 'next/link';
import { Literata, Noto_Serif_Devanagari } from 'next/font/google';
import { redirect } from 'next/navigation';
import { sb } from '@/lib/supabase';
import Tools from '@/components/Tools';

const lit = Literata({ subsets: ['latin'], variable: '--serif' });

const dev = Noto_Serif_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '700'],
  variable: '--dev',
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  ),
  title: {
    default: 'Kahaniyan: read and write stories',
    template: '%s | Kahaniyan',
  },
  description: 'Read Hindi and English stories free. Write and publish your own.',
};

export default async function Root({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    data: { user },
  } = await sb().auth.getUser();

  async function out() {
    'use server';
    await sb().auth.signOut();
    redirect('/');
  }

  return (
    <html
      lang="hi"
      className={`${lit.variable} ${dev.variable}`}
      suppressHydrationWarning
    >
      <body>
        <header>
          <div className="wrap">
            <Link href="/" className="logo">कहानियाँ</Link>

            <nav aria-label="Main">
              <Link href="/">Home</Link>
              <Link href="/search">All Stories</Link>
              <Link href="/#categories">Categories</Link>
              <Link href="/archive">Monthly Archive</Link>
              <Link href="/write">Write a Story</Link>

              {user ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <form action={out} style={{ display: 'inline' }}>
                    <button className="lnk">Logout</button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/login">Login</Link>
                  <Link href="/signup">Sign Up</Link>
                </>
              )}
            </nav>

            <Tools />
          </div>
        </header>

        <main className="wrap">{children}</main>

        <footer>
          <div className="wrap">
            Kahaniyan: stories to read, stories to write.{' '}
            <Link href="/archive">Archive</Link> ·{' '}
            <Link href="/sitemap.xml">Sitemap</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
