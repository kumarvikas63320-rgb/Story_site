import Link from 'next/link';
import { sb } from '@/lib/supabase';
import Card from '@/components/Card';
import { COLS } from '@/lib/util';

export const metadata = { title: 'All stories' };

export default async function Search({ searchParams: p }: any) {
  const s = sb();
  const N = 12;
  const page = Math.max(1, +p.page || 1);

  let q = s.from('stories').select(COLS, { count: 'exact' }).eq('status', 'published');

  if (p.q) q = q.textSearch('fts', p.q, { type: 'websearch', config: 'simple' });

  if (p.cat) {
    const { data: c } = await s.from('categories').select('id').eq('slug', p.cat).single();
    q = q.eq('category_id', c?.id ?? -1);
  }

  if (+p.year) {
    const y = +p.year, m = +p.month;
    const a = new Date(Date.UTC(y, m ? m - 1 : 0, 1));
    const b = new Date(Date.UTC(m ? y : y + 1, m ? m : 0, 1));
    q = q.gte('published_at', a.toISOString()).lt('published_at', b.toISOString());
  }

  const [{ data, count }, { data: cats }] = await Promise.all([
    q.order(p.sort === 'popular' ? 'views' : 'published_at', { ascending: false })
      .range((page - 1) * N, page * N - 1),
    s.from('categories').select('*').order('name'),
  ]);

  const link = (n: number) => {
    const u = new URLSearchParams(
      Object.entries(p).filter(([k, v]: any) => v && k !== 'page') as any
    );
    u.set('page', String(n));
    return '/search?' + u;
  };

  const yr = new Date().getFullYear();
  const last = Math.ceil((count || 0) / N);

  return (
    <>
      <h1>Stories</h1>

      <form className="sf" role="search">
        <input name="q" defaultValue={p.q} placeholder="Title, story or author" aria-label="Search" />

        <select name="cat" defaultValue={p.cat || ''} aria-label="Category">
          <option value="">All categories</option>
          {cats?.map((c: any) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>

        <select name="year" defaultValue={p.year || ''} aria-label="Year">
          <option value="">Any year</option>
          {Array.from({ length: 6 }, (_, i) => yr - i).map(y => <option key={y}>{y}</option>)}
        </select>

        <select name="month" defaultValue={p.month || ''} aria-label="Month">
          <option value="">Any month</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i} value={i + 1}>
              {new Date(2000, i).toLocaleString('en', { month: 'long' })}
            </option>
          ))}
        </select>

        <select name="sort" defaultValue={p.sort || 'latest'} aria-label="Sort">
          <option value="latest">Latest</option>
          <option value="popular">Popular</option>
        </select>

        <button>Filter</button>
      </form>

      <p className="mut">{count || 0} stories found</p>

      <div className="grid">
        {data?.map((x: any) => <Card key={x.id} s={x} />)}
      </div>

      <div className="pg">
        {page > 1 && <Link href={link(page - 1)}>Previous</Link>}
        {page < last && <Link href={link(page + 1)}>Next</Link>}
      </div>
    </>
  );
}
