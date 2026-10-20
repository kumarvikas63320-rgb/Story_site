import { createClient } from '@supabase/supabase-js';
import { SITE } from '@/lib/util';

export default async function sitemap() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await s
    .from('stories')
    .select('slug,updated_at')
    .eq('status', 'published');

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
