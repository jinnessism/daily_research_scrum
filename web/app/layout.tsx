import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

export const metadata: Metadata = {
  title: 'torchdev — Interactive PyTorch Playground',
  description:
    'Learn, experiment, and visualize PyTorch concepts in the browser. ' +
    'Tutorials, a runnable playground, autograd & training visualizations, and an API reference.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-10 text-sm text-white/40">
          torchdev — an educational, browser-only PyTorch learning environment.
          Not affiliated with the PyTorch project.
        </footer>
      </body>
    </html>
  );
}
