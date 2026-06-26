'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/learn/tensors', label: 'Learn', match: '/learn' },
  { href: '/playground', label: 'Playground', match: '/playground' },
  { href: '/visualize', label: 'Visualize', match: '/visualize' },
  { href: '/reference/tensor-creation', label: 'Reference', match: '/reference' },
];

export default function Nav() {
  const pathname = usePathname() || '/';
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0e1116]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="text-xl">🔥</span>
          <span>
            torch<span className="text-torch">dev</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.match);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 transition ${
                  active
                    ? 'bg-torch/20 text-torch-light'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <a
          href="https://pytorch.org/docs/stable/index.html"
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-sm text-white/50 hover:text-white"
        >
          Official docs ↗
        </a>
      </div>
    </header>
  );
}
