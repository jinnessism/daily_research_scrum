import Link from 'next/link';

const FEATURES = [
  {
    href: '/learn/tensors',
    icon: '📚',
    title: 'Learn',
    desc: 'Step-by-step interactive lessons — tensors, autograd, training a model — each with code cells you can run and edit inline.',
  },
  {
    href: '/playground',
    icon: '⚡',
    title: 'Playground',
    desc: 'Write torch-style code and run it instantly in your browser. No install, no backend — an educational tensor engine executes a subset of the torch API.',
  },
  {
    href: '/visualize',
    icon: '📊',
    title: 'Visualize',
    desc: 'See the ideas move: the autograd computation graph, gradient descent fitting data live, activation functions, and neural-network architecture.',
  },
  {
    href: '/reference/tensor-creation',
    icon: '📖',
    title: 'Reference',
    desc: 'A curated, searchable reference for the most-used PyTorch APIs, each with a concise example.',
  },
];

export default function Home() {
  return (
    <div>
      <section className="py-10 text-center">
        <div className="mb-4 text-5xl">🔥</div>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Interactive <span className="text-torch">PyTorch</span> development
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">
          Learn deep-learning fundamentals by doing — run code, watch gradients
          flow, and explore the API, all in your browser.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/playground"
            className="rounded-lg bg-torch px-5 py-2.5 font-semibold text-white transition hover:bg-torch-dark"
          >
            Open the Playground
          </Link>
          <Link
            href="/learn/tensors"
            className="rounded-lg border border-white/20 px-5 py-2.5 font-semibold transition hover:bg-white/5"
          >
            Start learning
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-torch/40 hover:bg-white/[0.06]"
          >
            <div className="mb-3 text-3xl">{f.icon}</div>
            <h2 className="text-xl font-semibold group-hover:text-torch-light">
              {f.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{f.desc}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 text-sm text-amber-200/80">
        <strong className="text-amber-200">Note:</strong> code runs against a small
        educational tensor engine that re-implements core PyTorch ideas
        (tensors, broadcasting, autograd) in the browser. It supports a useful
        subset of the API — not the full library. For real training, export your
        ideas to a Python environment.
      </section>
    </div>
  );
}
