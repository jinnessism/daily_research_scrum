'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export interface SidebarItem {
  href: string;
  label: string;
  hint?: string;
}

/** Generic left sidebar with optional client-side filtering. */
export default function Sidebar({
  title,
  items,
  searchable = false,
}: {
  title: string;
  items: SidebarItem[];
  searchable?: boolean;
}) {
  const pathname = usePathname() || '';
  const [q, setQ] = useState('');

  const filtered = searchable
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(q.toLowerCase()) ||
          (i.hint ?? '').toLowerCase().includes(q.toLowerCase())
      )
    : items;

  return (
    <aside className="w-full shrink-0 sm:w-60">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </div>
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mb-3 w-full rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm outline-none focus:border-torch/50"
        />
      )}
      <nav className="space-y-0.5">
        {filtered.map((i) => {
          const active = pathname === i.href;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={`block rounded-md px-3 py-1.5 text-sm transition ${
                active
                  ? 'bg-torch/20 text-torch-light'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {i.label}
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-sm text-white/30">No matches.</div>
        )}
      </nav>
    </aside>
  );
}
