import Link from 'next/link';
import { fmt } from '@/lib/util';

export default function Card({ s }: { s: any }) {
  return (
    <article className="card">
      {s.cover_url && (
        <img
          src={s.cover_url}
          alt={`${s.title} cover image`}
          loading="lazy"
        />
      )}
      <div>
        <span className="tag">{s.categories?.name}</span>
        <h3>
          <Link href={`/story/${s.slug}`}>{s.title}</Link>
        </h3>
        <p>{s.summary}</p>
        <small>
          {s.author_name} · {fmt(s.published_at)}
        </small>
      </div>
    </article>
  );
}
