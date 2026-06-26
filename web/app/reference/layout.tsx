import Sidebar from '@/components/Sidebar';
import { REFERENCE } from '@/lib/content/reference';

export default function ReferenceLayout({ children }: { children: React.ReactNode }) {
  const items = REFERENCE.map((r) => ({
    href: `/reference/${r.slug}`,
    label: r.name,
    hint: `${r.category} ${r.summary}`,
  }));
  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <Sidebar title="API Reference" items={items} searchable />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
