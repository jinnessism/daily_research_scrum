'use client';

import { useState, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import OutputPanel from './OutputPanel';
import { runScript, RunResult } from '@/lib/minitorch/runner';

/** A self-contained editor + Run button + output. Reused in lessons & playground. */
export default function CodeCell({
  initial,
  minHeight,
}: {
  initial: string;
  minHeight?: string;
}) {
  const [code, setCode] = useState(initial.trim());
  const [result, setResult] = useState<RunResult | null>(null);
  const [ran, setRan] = useState(false);

  const run = useCallback(() => {
    setResult(runScript(code));
    setRan(true);
  }, [code]);

  return (
    <div className="my-4 space-y-3">
      <CodeEditor value={code} onChange={setCode} minHeight={minHeight} />
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-torch-dark"
        >
          ▶ Run
        </button>
        <button
          onClick={() => {
            setCode(initial.trim());
            setResult(null);
            setRan(false);
          }}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5"
        >
          Reset
        </button>
      </div>
      {ran && <OutputPanel result={result} />}
    </div>
  );
}
