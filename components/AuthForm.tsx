'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supa } from '@/lib/client';

const T: any = {
  login: 'Log in',
  signup: 'Create account',
  forgot: 'Send reset link',
  reset: 'Save new password',
};

export default function AuthForm({ mode }: { mode: string }) {
  const r = useRouter();
  const [email, setE] = useState('');
  const [pw, setP] = useState('');
  const [msg, setM] = useState('');
  const [resend, setR] = useState(false);

  const o = typeof window !== 'undefined' ? location.origin : '';

  async function go(e: any) {
    e.preventDefault();
    setM('');

    try {
      const s = supa();
      let err: any;

      if (mode === 'login') {
        ({ error: err } = await s.auth.signInWithPassword({
          email,
          password: pw,
        }));

        if (!err) {
          const raw =
            new URLSearchParams(window.location.search).get('next') ||
            '/dashboard';

          const dest =
            raw.startsWith('/') && !raw.startsWith('//')
              ? raw
              : '/dashboard';

          r.push(dest);
          r.refresh();
          return;
        }

        if (/confirm/i.test(err.message)) setR(true);
      }

      if (mode === 'signup') {
        ({ error: err } = await s.auth.signUp({
          email,
          password: pw,
          options: {
            emailRedirectTo: o + '/auth/callback',
          },
        }));

        if (!err) {
          return setM(
            'Check your email and click the verification link to finish.'
          );
        }
      }

      if (mode === 'forgot') {
        ({ error: err } = await s.auth.resetPasswordForEmail(email, {
          redirectTo: o + '/auth/callback?next=/reset',
        }));

        if (!err) {
          return setM(
            'If that email exists, a reset link is on its way.'
          );
        }
      }

      if (mode === 'reset') {
        ({ error: err } = await s.auth.updateUser({
          password: pw,
        }));

        if (!err) {
          r.push('/dashboard');
          return;
        }
      }

      if (err) setM(err.message);
    } catch {
      setM(
        'Something went wrong. Check your internet connection and Supabase settings, then try again.'
      );
    }
  }

  return (
    <form className="form" onSubmit={go}>
      <h1>{T[mode]}</h1>

      {mode !== 'reset' && (
        <input
          type="email"
          required
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(e) => setE(e.target.value)}
        />
      )}

      {mode !== 'forgot' && (
        <input
          type="password"
          required
          minLength={8}
          placeholder="Password (8+ characters)"
          aria-label="Password"
          value={pw}
          onChange={(e) => setP(e.target.value)}
        />
      )}

      <button>{T[mode]}</button>

      {msg && <p role="alert">{msg}</p>}

      {resend && (
        <button
          type="button"
          onClick={async () => {
            await supa().auth.resend({
              type: 'signup',
              email,
            });
            setM('Verification email sent again.');
          }}
        >
          Resend verification email
        </button>
      )}

      {mode === 'login' && (
        <p>
          <Link href="/forgot">Forgot password?</Link>
          {' · '}
          <Link href="/signup">New here? Sign up</Link>
        </p>
      )}
    </form>
  );
}
