import { notFound } from 'next/navigation';
import Markdown from '@/components/Markdown';
import CodeCell from '@/components/CodeCell';
import { REFERENCE, getRef } from '@/lib/content/reference';

export function generateStaticParams() {
  return REFERENCE.map((r) => ({ slug: r.slug }));
}

export default function RefPage({ params }: { params: { slug: string } }) {
  const entry = getRef(params.slug);
  if (!entry) notFound();

  return (
    <article>
      <div className="text-xs uppercase tracking-wide text-torch-light">
        {entry.category}
      </div>
      <h1 className="mt-1 text-3xl font-bold">{entry.name}</h1>
      <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-sm text-torch-light">
        {entry.signature}
      </pre>
      <p className="mt-3 text-lg text-white/80">{entry.summary}</p>

      <div className="mt-4">
        <Markdown>{entry.body}</Markdown>
      </div>

      <h2 className="mt-8 text-xl font-semibold">Example</h2>
      {entry.runnable ? (
        <CodeCell initial={entry.example} minHeight="120px" />
      ) : (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm">
          {entry.example}
        </pre>
      )}
    </article>
  );
}
