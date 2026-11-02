'use client';

import { useState, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import OutputPanel from './OutputPanel';
import { runScript, RunResult } from '@/lib/minitorch/runner';
import { grade, type Exercise } from '@/lib/content/exercises';

export default function ExerciseCell({ exercise }: { exercise: Exercise }) {
  const [code, setCode] = useState(exercise.starter);
  const [result, setResult] = useState<RunResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'pass' | 'fail'>('idle');
  const [reason, setReason] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const run = useCallback(() => {
    setResult(runScript(code));
    setStatus('idle');
  }, [code]);

  const check = useCallback(() => {
    setResult(runScript(code));
    const g = grade(exercise, code);
    setStatus(g.ok ? 'pass' : 'fail');
    setReason(g.reason ?? '');
  }, [code, exercise]);

  const reset = () => {
    setCode(exercise.starter);
    setResult(null);
    setStatus('idle');
    setReason('');
    setShowHint(false);
    setShowSolution(false);
  };

  return (
    <div className="my-4 space-y-3">
      <CodeEditor value={code} onChange={setCode} minHeight="160px" />

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={check} className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-torch-dark">
          ✓ Check
        </button>
        <button onClick={run} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5">
          ▶ Run
        </button>
        <button onClick={() => setShowHint((h) => !h)} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5">
          {showHint ? 'Hide hint' : 'Hint'}
        </button>
        <button onClick={() => setShowSolution((s) => !s)} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/70 transition hover:bg-white/5">
          {showSolution ? 'Hide solution' : 'Show solution'}
        </button>
        <button onClick={reset} className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/5">
          Reset
        </button>
      </div>

      {status === 'pass' && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-300">
          ✓ Correct — nicely done.
        </div>
      )}
      {status === 'fail' && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          ✗ Not yet — {reason}
        </div>
      )}

      {showHint && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-4 py-2 text-sm text-amber-200/80">
          💡 {exercise.hint}
        </div>
      )}

      {showSolution && (
        <div className="space-y-2">
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-sm text-white/80">
            {exercise.solution}
          </pre>
          <button
            onClick={() => {
              setCode(exercise.solution);
              setStatus('idle');
            }}
            className="rounded-md border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/5"
          >
            Load into editor
          </button>
        </div>
      )}

      {result && <OutputPanel result={result} />}
    </div>
  );
}
