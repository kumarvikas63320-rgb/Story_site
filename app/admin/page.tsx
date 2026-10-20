import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/supabase';
import { plain, mname } from '@/lib/util';

export const metadata = { title: 'Admin' };

export default async function Admin() {
  const s = await requireAdmin();

  const cnt = async (t: string, f?: string[]) => {
    let q: any = s.from(t).select('id', { count: 'exact', head: true });
    if (f) q = q.eq(f[0], f[1]);
    return (await q).count ?? 0;
  };

  const [ns, nu, nc, np] = await Promise.all([
    cnt('stories'),
    cnt('profiles'),
    cnt('comments'),
    cnt('stories', ['status', 'pending']),
  ]);

  const [
    { data: pend },
    { data: pub },
    { data: rep },
    { data: cats },
    { data: users },
    { data: arch },
  ] = await Promise.all([
    s.from('stories')
      .select('id,title,slug,author_name,summary')
      .eq('status', 'pending'),

    s.from('stories')
      .select('id,title,slug,featured')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50),

    s.from('reports').select('id,reason,comments(id,body,hidden)'),

    s.from('categories').select('*').order('name'),

    s.from('profiles')
      .select('id,display_name,role')
      .order('created_at', { ascending: false })
      .limit(100),

    s.from('archive').select('*'),
  ]);

  async function act(fd: FormData) {
    'use server';

    const s = await requireAdmin();
    const id = String(fd.get('id'));
    const a = String(fd.get('a'));

    if (a === 'approve') {
      await s.from('stories').update({ status: 'published' }).eq('id', id);
    }

    if (a === 'reject') {
      await s.from('stories').update({ status: 'rejected' }).eq('id', id);
    }

    if (a === 'feat') {
      await s.from('stories').update({ featured: true }).eq('id', id);
    }

    if (a === 'unfeat') {
      await s.from('stories').update({ featured: false }).eq('id', id);
    }

    if (a === 'delstory') {
      await s.from('stories').delete().eq('id', id);
    }

    if (a === 'hide') {
      await s.from('comments').update({ hidden: true }).eq('id', id);
    }

    if (a === 'delcomment') {
      await s.from('comments').delete().eq('id', id);
    }

    if (a === 'dismiss') {
      await s.from('reports').delete().eq('id', id);
    }

    if (a === 'addcat') {
      const n = String(fd.get('name')).trim();
      if (n) await s.from('categories').insert({ name: n, slug: plain(n) });
    }

    if (a === 'delcat') {
      await s.from('stories')
        .update({ category_id: null })
        .eq('category_id', Number(id));

      await s.from('categories').delete().eq('id', id);
    }

    if (a === 'role') {
      await s.rpc('set_role', {
        uid: id,
        r: String(fd.get('r')),
      });
    }

    revalidatePath('/admin');
    revalidatePath('/');
  }

  const F = ({ id, a, children, extra }: any) => (
    <form action={act} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={id} />
      {extra}
      <button name="a" value={a}>{children}</button>
    </form>
  );

  return (
    <>
      <h1>Admin panel</h1>

      <div className="stats">
        {[
          ['Stories', ns],
          ['Users', nu],
          ['Comments', nc],
          ['Pending', np],
        ].map(([k, v]) => (
          <div className="box" key={k as string}>
            <b>{v}</b>{k}
          </div>
        ))}
      </div>

      <h2>Pending stories</h2>
      {!pend?.length && <p className="mut">Nothing waiting.</p>}

      {pend?.map((x: any) => (
        <div className="box" key={x.id}>
          <b>{x.title}</b>{' '}
          <small className="mut">by {x.author_name}</small>
          <p>{x.summary}</p>
          <Link href={`/write?id=${x.id}`}>Open</Link>{' '}
          <F id={x.id} a="approve">Approve</F>{' '}
          <F id={x.id} a="reject">Reject</F>
        </div>
      ))}

      <h2>Published stories</h2>

      {pub?.map((x: any) => (
        <div className="box row" key={x.id}>
          <Link href={`/story/${x.slug}`}>{x.title}</Link>
          <span>
            <F id={x.id} a={x.featured ? 'unfeat' : 'feat'}>
              {x.featured ? 'Unfeature' : 'Feature'}
            </F>{' '}
            <F id={x.id} a="delstory">Remove</F>
          </span>
        </div>
      ))}

      <h2>Reported comments</h2>
      {!rep?.length && <p className="mut">No reports.</p>}

      {rep?.map((x: any) => (
        <div className="box" key={x.id}>
          <p>
            {x.comments?.body}{' '}
            {x.comments?.hidden && <small>(hidden)</small>}
          </p>
          <F id={x.comments?.id} a="hide">Hide</F>{' '}
          <F id={x.comments?.id} a="delcomment">Delete</F>{' '}
          <F id={x.id} a="dismiss">Dismiss</F>
        </div>
      ))}

      <h2>Categories</h2>

      <div className="chips">
        {cats?.map((c: any) => (
          <span className="box" key={c.id}>
            {c.name} <F id={c.id} a="delcat">x</F>
          </span>
        ))}
      </div>

      <form action={act} className="row">
        <input name="name" placeholder="New category" aria-label="New category" />
        <button name="a" value="addcat">Add</button>
      </form>

      <h2>Users</h2>

      {users?.map((u: any) => (
        <div className="box row" key={u.id}>
          <span>
            {u.display_name}{' '}
            <small className="mut">{u.role}</small>
          </span>

          <F
            id={u.id}
            a="role"
            extra={
              <input
                type="hidden"
                name="r"
                value={u.role === 'admin' ? 'user' : 'admin'}
              />
            }
          >
            {u.role === 'admin' ? 'Remove admin' : 'Make admin'}
          </F>
        </div>
      ))}

      <h2>Stories per month</h2>

      {arch?.map((x: any) => (
        <p key={x.ym}>{mname(x.ym)}: {x.n}</p>
      ))}
    </>
  );
}
