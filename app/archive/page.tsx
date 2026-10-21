import Link from 'next/link';
import { sb } from '@/lib/supabase';
import { mname } from '@/lib/util';

export const metadata = { title: 'Monthly archive' };

export default async function Archive() {
  const { data } = await sb().from('archive').select('*');

  return (
    <>
      <h1>Monthly archive</h1>

      {!data?.length && (
        <p className="mut">No stories published yet.</p>
      )}

      <div className="chips">
        {data?.map((x: any) => (
          <Link
            key={x.ym}
            href={`/search?year=${x.ym.slice(0, 4)}&month=${+x.ym.slice(5)}`}
          >
            {mname(x.ym)}: {x.n} {x.n == 1 ? 'story' : 'stories'}
          </Link>
        ))}
      </div>
    </>
  );
}
