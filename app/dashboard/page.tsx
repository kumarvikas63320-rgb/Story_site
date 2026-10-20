import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireUser, sb } from '@/lib/supabase';

export const metadata = { title: 'Dashboard' };

export default async function Dash() {
  const { s, user } = await requireUser();

  const [{ data: st }, { data: cm }, { data: me }] = await Promise.all([
    s.from('stories')
      .select('id,title,slug,status')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false }),

    s.from('comments')
      .select('id,body,stories(title,slug)')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false }),

    s.from('profiles')
      .select('display_name,role')
      .eq('id', user.id)
      .single(),
  ]);

  async function delS(fd: FormData) {
    'use server';
    await sb().from('stories').delete().eq('id', String(fd.get('id')));
    revalidatePath('/dashboard');
  }

  async function delC(fd: FormData) {
    'use server';
    await sb().from('comments').delete().eq('id', String(fd.get('id')));
    revalidatePath('/dashboard');
  }

  async function editC(fd: FormData) {
    'use server';
    await sb().from('comments')
      .update({ body: String(fd.get('body')).slice(0, 2000) })
      .eq('id', String(fd.get('id')));
    revalidatePath('/dashboard');
  }

  async function name(fd: FormData) {
    'use server';
    const x = sb();
    const { data: { user } } = await x.auth.getUser();
    const n = String(fd.get('n')).trim().slice(0, 40);

    if (!user || !n) return;

    await x.from('profiles').update({ display_name: n }).eq('id', user.id);
    await x.from('stories').update({ author_name: n }).eq('author_id', user.id);
    revalidatePath('/dashboard');
  }

  return (
    <>
      <h1>Dashboard</h1>

      <p>
        <Link className="btn" href="/write">Write a story</Link>{' '}
        {me?.role === 'admin' && (
          <Link className="btn" href="/admin">Admin panel</Link>
        )}
      </p>

      {[
        ['published', 'Published stories'],
        ['draft', 'Draft stories'],
        ['pending', 'Pending approval'],
        ['rejected', 'Rejected'],
      ].map(([k, t]) => {
        const l = st?.filter((x: any) => x.status === k);

        return (
          <section key={k}>
            <h2>{t} ({l?.length || 0})</h2>

            {l?.map((x: any) => (
              <div className="box row" key={x.id}>
                <span>
                  {k === 'published'
                    ? <Link href={`/story/${x.slug}`}>{x.title}</Link>
                    : x.title}
                </span>

                <span>
                  <Link className="btn" href={`/write?id=${x.id}`}>Edit</Link>{' '}
                  <form action={delS} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={x.id} />
                    <button>Delete</button>
                  </form>
                </span>
              </div>
            ))}
          </section>
        );
      })}

      <h2>My comments ({cm?.length || 0})</h2>

      {cm?.map((c: any) => (
        <div className="box" key={c.id}>
          <small className="mut">
            On <Link href={`/story/${c.stories?.slug}`}>
              {c.stories?.title}
            </Link>
          </small>

          <form action={editC} className="row">
            <input type="hidden" name="id" value={c.id} />
            <input
              name="body"
              defaultValue={c.body}
              style={{ flex: 1 }}
              aria-label="Comment"
            />
            <button>Save</button>
          </form>

          <form action={delC}>
            <input type="hidden" name="id" value={c.id} />
            <button>Delete</button>
          </form>
        </div>
      ))}

      <h2>Account settings</h2>

      <form action={name} className="row">
        <input
          name="n"
          defaultValue={me?.display_name}
          aria-label="Display name"
        />
        <button>Save display name</button>
      </form>

      <p className="mut">Email: {user.email}</p>
    </>
  );
}
