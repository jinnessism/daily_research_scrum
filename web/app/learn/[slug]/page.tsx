import { notFound } from 'next/navigation';
import Link from 'next/link';
import Markdown from '@/components/Markdown';
import CodeCell from '@/components/CodeCell';
import { LESSONS, getLesson } from '@/lib/content/lessons';

export function generateStaticParams() {
  return LESSONS.map((l) => ({ slug: l.slug }));
}

export default function LessonPage({ params }: { params: { slug: string } }) {
  const lesson = getLesson(params.slug);
  if (!lesson) notFound();

  const idx = LESSONS.findIndex((l) => l.slug === lesson.slug);
  const prev = LESSONS[idx - 1];
  const next = LESSONS[idx + 1];

  return (
    <article>
      {lesson.blocks.map((b, i) =>
        b.type === 'md' ? (
          <Markdown key={i}>{b.content}</Markdown>
        ) : (
          <CodeCell key={i} initial={b.code} />
        )
      )}

      <div className="mt-10 flex justify-between border-t border-white/10 pt-5 text-sm">
        {prev ? (
          <Link href={`/learn/${prev.slug}`} className="text-torch-light hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${next.slug}`} className="text-torch-light hover:underline">
            {next.title} →
          </Link>
        ) : (
          <Link href="/playground" className="text-torch-light hover:underline">
            Open the Playground →
          </Link>
        )}
      </div>
    </article>
  );
}
