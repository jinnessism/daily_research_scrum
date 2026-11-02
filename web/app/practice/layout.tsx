import Sidebar from '@/components/Sidebar';
import { EXERCISES } from '@/lib/content/exercises';

export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  const items = EXERCISES.map((e) => ({
    href: `/practice/${e.slug}`,
    label: e.title,
    hint: e.topic,
  }));
  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <Sidebar title="Practice" items={items} searchable />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
