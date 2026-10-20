export const COLS =
  'id,title,slug,summary,cover_url,published_at,author_name,categories(name,slug)';

export const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const mname = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

export const plain = (t: string) =>
  t
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

export const slugify = (t: string) =>
  (plain(t).slice(0, 80) || 'story') +
  '-' +
  Math.random().toString(36).slice(2, 7);

export const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
