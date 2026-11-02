import { notFound } from 'next/navigation';
import Link from 'next/link';
import Markdown from '@/components/Markdown';
import ExerciseCell from '@/components/ExerciseCell';
import { EXERCISES, getExercise } from '@/lib/content/exercises';

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ slug: e.slug }));
}

export default function PracticePage({ params }: { params: { slug: string } }) {
  const ex = getExercise(params.slug);
  if (!ex) notFound();

  const idx = EXERCISES.findIndex((e) => e.slug === ex.slug);
  const prev = EXERCISES[idx - 1];
  const next = EXERCISES[idx + 1];

  return (
    <article>
      <div className="text-xs uppercase tracking-wide text-torch-light">{ex.topic}</div>
      <h1 className="mt-1 text-3xl font-bold">{ex.title}</h1>
      <div className="mt-4">
        <Markdown>{ex.prompt}</Markdown>
      </div>

      <ExerciseCell exercise={ex} />

      <div className="mt-10 flex justify-between border-t border-white/10 pt-5 text-sm">
        {prev ? (
          <Link href={`/practice/${prev.slug}`} className="text-torch-light hover:underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/practice/${next.slug}`} className="text-torch-light hover:underline">
            {next.title} →
          </Link>
        ) : (
          <Link href="/visualize" className="text-torch-light hover:underline">
            Back to Visualize →
          </Link>
        )}
      </div>
    </article>
  );
}
