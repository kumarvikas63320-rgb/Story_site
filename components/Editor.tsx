'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supa } from '@/lib/client';
import { slugify } from '@/lib/util';

export default function Editor({ cats, story }: any) {
  const r = useRouter();
  const key = 'draft-' + (story?.id || 'new');

  const [f, setF] = useState<any>(
    story || {
      title: '',
      summary: '',
      content: '',
      category_id: cats[0]?.id,
      cover_url: '',
    }
  );

  const [prev, setPrev] = useState(false);
  const [msg, setMsg] = useState('');
  const [hydrated, setHydrated] = useState(Boolean(story));

  useEffect(() => {
    if (!story) {
      try {
        const d = localStorage.getItem(key);

        if (d) {
          const parsed = JSON.parse(d);

          if (parsed && typeof parsed === 'object') {
            setF((v: any) => ({ ...v, ...parsed }));
          }
        }
      } catch {
        try {
          localStorage.removeItem(key);
        } catch {}
      }
    }

    setHydrated(true);
  }, [key, story]);

  useEffect(() => {
    if (!hydrated) return;

    try {
      localStorage.setItem(key, JSON.stringify(f));
    } catch {}
  }, [key, f, hydrated]);

  const u = (k: string) => (e: any) =>
    setF({ ...f, [k]: e.target.value });

  async function save(status: string) {
    const s = supa();
    const { data: { user } } = await s.auth.getUser();

    if (!user) return r.push('/login');

    if (!f.title?.trim() || !f.summary?.trim() || !f.content?.trim()) {
      return setMsg('Add a title, short description and story first.');
    }

    if (
      f.title.trim().length > 200 ||
      f.summary.trim().length > 500 ||
      f.content.length > 200000
    ) {
      return setMsg(
        'Title must be 200 characters or less, description 500 or less, and story 200,000 or less.'
      );
    }

    if (!cats.length) {
      return setMsg(
        'No categories found. Run supabase/schema.sql in your Supabase SQL Editor first.'
      );
    }

    const row = {
      title: f.title,
      summary: f.summary,
      content: f.content,
      category_id: f.category_id ? Number(f.category_id) : null,
      cover_url: f.cover_url || null,
      status,
    };

    const { error } = story
      ? await s.from('stories').update(row).eq('id', story.id)
      : await s.from('stories').insert({
          ...row,
          author_id: user.id,
          slug: slugify(f.title),
        });

    if (error) return setMsg(error.message);

    localStorage.removeItem(key);
    r.push('/dashboard');
  }

  async function up(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ||
      file.size > 2e6
    ) {
      return setMsg('Choose a JPG, PNG, WEBP or GIF image under 2 MB.');
    }

    const s = supa();
    const { data: { user } } = await s.auth.getUser();

    if (!user) return setMsg('Please log in again.');

    const p = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '')}`;
    const { error } = await s.storage.from('covers').upload(p, file);

    if (error) return setMsg(error.message);

    setF({
      ...f,
      cover_url: s.storage.from('covers').getPublicUrl(p).data.publicUrl,
    });
  }

  return (
    <div className="form" style={{ maxWidth: 760 }}>
      <h1>{story ? 'Edit story' : 'Write a story'}</h1>

      {prev ? (
        <article className="read" style={{ margin: 0 }}>
          <h1>{f.title}</h1>
          <p className="mut">{f.summary}</p>

          {f.content.split(/\n{2,}/).map((b: string, i: number) =>
            b.startsWith('## ')
              ? <h2 key={i}>{b.slice(3)}</h2>
              : <p key={i}>{b}</p>
          )}
        </article>
      ) : (
        <>
          <input
            placeholder="Story title"
            aria-label="Title"
            maxLength={200}
            value={f.title}
            onChange={u('title')}
          />

          <select
            aria-label="Category"
            value={f.category_id}
            onChange={u('category_id')}
          >
            {cats.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <textarea
            rows={2}
            maxLength={500}
            placeholder="Short description"
            aria-label="Short description"
            value={f.summary}
            onChange={u('summary')}
          />

          <textarea
            rows={18}
            placeholder="Write your story here. Leave a blank line between paragraphs. Start a line with ## for a heading."
            aria-label="Story"
            value={f.content}
            onChange={u('content')}
          />

          <label>
            Cover image (optional)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={up}
            />
          </label>

          {f.cover_url && (
            <img src={f.cover_url} alt="" style={{ maxWidth: 200 }} />
          )}
        </>
      )}

      <div className="row">
        <button type="button" onClick={() => setPrev(!prev)}>
          {prev ? 'Back to editing' : 'Preview'}
        </button>

        <button type="button" onClick={() => save('draft')}>
          Save draft
        </button>

        <button type="button" onClick={() => save('pending')}>
          Submit for publication
        </button>
      </div>

      {msg && <p role="alert">{msg}</p>}

      <small className="mut">
        Your text is also saved in this browser while you type.
      </small>
    </div>
  );
}
