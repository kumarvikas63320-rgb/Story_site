import Link from 'next/link';
import { sb } from '@/lib/supabase';
import Card from '@/components/Card';
import { COLS, mname } from '@/lib/util';

export default async function Home() {
  const s = sb();
  const q = () => s.from('stories').select(COLS).eq('status', 'published');

  const [f, l, p, c, a] = await Promise.all([
    q().eq('featured', true).order('published_at', { ascending: false }).limit(3),
    q().order('published_at', { ascending: false }).limit(6),
    q().order('views', { ascending: false }).limit(3),
    s.from('categories').select('*').order('name'),
    s.from('archive').select('*').limit(6),
  ]);

  const G = ({ t, d }: any) =>
    d?.length ? (
      <>
        <h2 className="sec">{t}</h2>
        <div className="grid">
          {d.map((x: any) => <Card key={x.id} s={x} />)}
        </div>
      </>
    ) : null;

  return (
    <>
      <section className="hero">
        <h1>कहानियाँ जो अपनी सी लगें</h1>
        <p>
          Read Hindi and English stories free, no login needed.
          Sign up when you want to write or comment.
        </p>

        <form action="/search" className="sf" role="search">
          <input
            name="q"
            placeholder="Search by title, story, author"
            aria-label="Search stories"
          />
          <button>Search</button>
        </form>
      </section>

      <G t="Featured stories" d={f.data} />
      <G t="Latest stories" d={l.data} />
      <G t="Popular stories" d={p.data} />

      <h2 className="sec" id="categories">Categories</h2>
      <div className="chips">
        {c.data?.map((x: any) => (
          <Link key={x.id} href={`/search?cat=${x.slug}`}>
            {x.name}
          </Link>
        ))}
      </div>

      <h2 className="sec">Monthly archive</h2>
      <div className="chips">
        {a.data?.map((x: any) => (
          <Link
            key={x.ym}
            href={`/search?year=${x.ym.slice(0, 4)}&month=${+x.ym.slice(5)}`}
          >
            {mname(x.ym)}: {x.n} {x.n == 1 ? 'story' : 'stories'}
          </Link>
        ))}
        <Link href="/archive">All months</Link>
      </div>
    </>
  );
}
