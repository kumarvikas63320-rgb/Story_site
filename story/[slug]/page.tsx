import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';
import { sb } from '@/lib/supabase';
import { fmt, SITE } from '@/lib/util';

const get = async (slug: string) =>
  (
    await sb()
      .from('stories')
      .select('*,categories(name)')
      .eq('slug', decodeURIComponent(slug))
      .eq('status', 'published')
      .single()
  ).data;

export async function generateMetadata({ params }: any) {
  const s = await get(params.slug);
  if (!s) return {};

  return {
    title: s.title,
    description: s.summary,
    alternates: { canonical: `/story/${params.slug}` },
    openGraph: {
      title: s.title,
      description: s.summary,
      type: 'article',
      images: s.cover_url ? [s.cover_url] : [],
    },
  };
}

export default async function Story({ params }: any) {
  const s = sb();
  const st = await get(params.slug);
  if (!st) notFound();

  await s.rpc('bump_view', { sid: st.id });

  const { data: { user } } = await s.auth.getUser();

  const { data: cm } = await s
    .from('comments')
    .select('id,body,created_at,author_id,profiles(display_name)')
    .eq('story_id', st.id)
    .order('created_at');

  const path = `/story/${params.slug}`;

  async function add(fd: FormData) {
    'use server';

    const { data: { user } } = await sb().auth.getUser();
    if (!user) redirect('/login');
    if (fd.get('website')) return;

    const body = String(fd.get('body') || '').trim().slice(0, 2000);

    if (body) {
      await sb().from('comments').insert({
        story_id: st.id,
        author_id: user.id,
        body,
      });
    }

    revalidatePath(path);
  }

  async function del(fd: FormData) {
    'use server';
    await sb().from('comments').delete().eq('id', String(fd.get('id')));
    revalidatePath(path);
  }

  async function report(fd: FormData) {
    'use server';

    const { data: { user } } = await sb().auth.getUser();
    if (!user) redirect('/login');

    await sb().from('reports').insert({
      comment_id: String(fd.get('id')),
      reporter_id: user.id,
    });

    revalidatePath(path);
  }

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: st.title,
    description: st.summary,
    author: { '@type': 'Person', name: st.author_name },
    datePublished: st.published_at,
    image: st.cover_url || undefined,
    mainEntityOfPage: SITE + path,
  };

  return (
    <article className="read">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(ld).replace(/</g, '\\u003c'),
        }}
      />

      <span className="tag">{st.categories?.name}</span>
      <h1>{st.title}</h1>
      <p className="mut">{st.author_name} · {fmt(st.published_at)}</p>

      {st.cover_url && <img src={st.cover_url} alt="" />}

      {st.content.split(/\n{2,}/).map((b: string, i: number) =>
        b.startsWith('## ')
          ? <h2 key={i}>{b.slice(3)}</h2>
          : <p key={i}>{b}</p>
      )}

      <h2>Comments ({cm?.length || 0})</h2>

      {cm?.map((c: any) => (
        <div className="box" key={c.id}>
          <b>{c.profiles?.display_name}</b>{' '}
          <small className="mut">
            {new Date(c.created_at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}
          </small>

          <p>{c.body}</p>

          {user?.id === c.author_id ? (
            <form action={del}>
              <input type="hidden" name="id" value={c.id} />
              <button>Delete</button>
            </form>
          ) : user && (
            <form action={report}>
              <input type="hidden" name="id" value={c.id} />
              <button>Report</button>
            </form>
          )}
        </div>
      ))}

      {user ? (
        <form action={add} className="form" style={{ margin: 0 }}>
          <input
            className="hp"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />
          <textarea
            name="body"
            rows={4}
            required
            maxLength={2000}
            aria-label="Your comment"
            placeholder="Write a comment"
          />
          <button>Post comment</button>
        </form>
      ) : (
        <p>
          <Link href="/login">Log in</Link> with a verified email to comment.
        </p>
      )}
    </article>
  );
}
