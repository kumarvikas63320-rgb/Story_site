import { createClient } from '@supabase/supabase-js';
import { SITE } from '@/lib/util';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const { data } = url && key
    ? await createClient(url, key)
        .from('stories')
        .select('slug,updated_at')
        .eq('status', 'published')
    : { data: null };

  return [
    { url: SITE },
    { url: SITE + '/search' },
    { url: SITE + '/archive' },
    ...(data || []).map((x: any) => ({
      url: `${SITE}/story/${encodeURIComponent(x.slug)}`,
      lastModified: x.updated_at,
    })),
  ];
}
