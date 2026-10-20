import { requireUser } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Editor from '@/components/Editor';

export const metadata = { title: 'Write a story' };

export default async function Write({ searchParams }: any) {
  const { s } = await requireUser();

  const { data: cats } = await s
    .from('categories')
    .select('id,name')
    .order('name');

  const story = searchParams.id
    ? (
        await s
          .from('stories')
          .select('*')
          .eq('id', searchParams.id)
          .maybeSingle()
      ).data
    : null;

  if (searchParams.id && !story) notFound();

  return (
    <Editor
      cats={cats || []}
      story={story}
      key={story?.id || 'new'}
    />
  );
}
