import Sidebar from '@/components/Sidebar';
import { LESSONS } from '@/lib/content/lessons';

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const items = LESSONS.map((l) => ({ href: `/learn/${l.slug}`, label: l.title }));
  return (
    <div className="flex flex-col gap-8 sm:flex-row">
      <Sidebar title="Lessons" items={items} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
