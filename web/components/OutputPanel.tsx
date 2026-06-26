'use client';

import { RunResult } from '@/lib/minitorch/runner';
import TensorView from './TensorView';

export default function OutputPanel({ result }: { result: RunResult | null }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/40">
        Output will appear here. Press <kbd className="rounded bg-white/10 px-1">Run</kbd> to execute.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result.error ? (
        <pre className="overflow-x-auto rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {result.error}
        </pre>
      ) : (
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-green-300/90 min-h-[3rem] whitespace-pre-wrap">
          {result.output || '(no output — use print(...) or end with an expression)'}
        </pre>
      )}

      {result.tensors.length > 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">
            Variables
          </div>
          <div className="space-y-2">
            {result.tensors.map(({ name, tensor }) => (
              <TensorView key={name} name={name} tensor={tensor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
