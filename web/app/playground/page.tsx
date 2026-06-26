'use client';

import { useState } from 'react';
import CodeEditor from '@/components/CodeEditor';
import OutputPanel from '@/components/OutputPanel';
import { runScript, RunResult } from '@/lib/minitorch/runner';
import { SNIPPETS } from '@/lib/snippets';

export default function PlaygroundPage() {
  const [code, setCode] = useState(SNIPPETS[0].code.trim());
  const [result, setResult] = useState<RunResult | null>(null);

  const run = () => setResult(runScript(code));

  return (
    <div>
      <h1 className="text-3xl font-bold">Playground</h1>
      <p className="mt-2 text-white/70">
        Write torch-style code and run it in your browser.
      </p>

      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200/80">
        <strong className="text-amber-200">Educational simulation.</strong> Code
        runs against an in-browser tensor engine that supports a subset of the
        torch API: <code className="font-mono">torch.tensor/zeros/ones/randn/arange</code>,
        the operators <code className="font-mono">+ - * / @</code>, and{' '}
        <code className="font-mono">.sum() .mean() .relu() .sigmoid() .tanh() .exp() .log() .backward() .grad</code>.
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-white/50">Examples:</span>
        {SNIPPETS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setCode(s.code.trim());
              setResult(null);
            }}
            className="rounded-md border border-white/15 px-3 py-1 text-sm text-white/70 transition hover:border-torch/40 hover:text-white"
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <CodeEditor value={code} onChange={setCode} minHeight="360px" />
          <button
            onClick={run}
            className="mt-3 rounded-md bg-torch px-5 py-2 font-semibold text-white transition hover:bg-torch-dark"
          >
            ▶ Run
          </button>
        </div>
        <div>
          <OutputPanel result={result} />
        </div>
      </div>
    </div>
  );
}
