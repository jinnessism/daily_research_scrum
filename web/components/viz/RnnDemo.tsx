'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { unroll, randomRnnWeights, SEQUENCES, H, type RnnWeights } from '@/lib/viz/rnn';

const SW = 700;
const SH = 300;
const MIDY = 150;
const CELL = 16;

function divBg(v: number): string {
  const t = Math.max(-1, Math.min(1, v));
  return t >= 0 ? `rgba(238,76,44,${0.12 + 0.8 * t})` : `rgba(56,139,253,${0.12 + 0.8 * -t})`;
}
const f2 = (n: number) => (Object.is(n, -0) ? '0' : (+n.toFixed(2)).toString());

export default function RnnDemo() {
  const [seqId, setSeqId] = useState(SEQUENCES[0].id);
  const [seed, setSeed] = useState(3);
  const [weights, setWeights] = useState<RnnWeights>(() => randomRnnWeights(3));
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const seq = SEQUENCES.find((s) => s.id === seqId)!.seq;
  const T = seq.length;
  const steps = useMemo(() => unroll(seq, weights), [seq, weights]);

  useEffect(() => {
    if (!playing) return;
    if (cur >= T - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setCur((c) => Math.min(c + 1, T - 1)), 650);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, cur, T]);

  const colW = (SW - 70) / T;
  const xAt = (t: number) => 45 + t * colW + colW / 2;
  const hY = (j: number) => MIDY - 34 + j * (CELL + 2);
  const inY = MIDY + 78;
  const outY = MIDY - 78;
  const maxAbsY = Math.max(1, ...steps.map((s) => Math.abs(s.y)));
  const outYpix = (y: number) => outY - (y / maxAbsY) * 26;

  const reset = () => {
    setPlaying(false);
    setCur(0);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        A recurrent cell reads a sequence one step at a time, carrying a{' '}
        <span className="text-torch-light">hidden state</span> forward:{' '}
        <code className="font-mono">hₜ = tanh(xₜ·Wxh + hₜ₋₁·Whh + b)</code>. The same
        weights are reused at every timestep (the loop, unrolled).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {SEQUENCES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSeqId(s.id);
                reset();
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                s.id === seqId ? 'bg-torch/20 text-torch-light' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => (cur >= T - 1 ? reset() : setPlaying((p) => !p))}
          className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark"
        >
          {cur >= T - 1 ? '↺ Replay' : playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={() => setCur((c) => Math.max(0, c - 1))} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">‹ Back</button>
        <button onClick={() => setCur((c) => Math.min(T - 1, c + 1))} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Step ›</button>
        <button onClick={reset} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Reset</button>
        <button
          onClick={() => {
            const ns = seed + 1;
            setSeed(ns);
            setWeights(randomRnnWeights(ns));
            reset();
          }}
          className="rounded-md border border-torch/40 px-3 py-1.5 text-sm text-torch-light hover:bg-torch/10"
        >
          ⟳ Randomize weights
        </button>
        <span className="ml-1 text-xs text-white/40">t = {cur}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
        <svg width={SW} height={SH} className="max-w-full">
          <text x={10} y={outY + 4} fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">yₜ</text>
          <text x={10} y={MIDY + 4} fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">hₜ</text>
          <text x={10} y={inY + 4} fontSize={10} fill="rgba(255,255,255,0.4)" fontFamily="monospace">xₜ</text>

          {/* recurrent edges between consecutive hidden blocks */}
          {steps.map((s, t) =>
            t > 0 && t <= cur ? (
              <line key={`rec-${t}`} x1={xAt(t - 1) + 24} y1={MIDY} x2={xAt(t) - 24} y2={MIDY}
                stroke="rgba(238,76,44,0.5)" strokeWidth={2} markerEnd="url(#rnnArrow)" />
            ) : null
          )}
          <defs>
            <marker id="rnnArrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="rgba(238,76,44,0.6)" />
            </marker>
          </defs>

          {/* output trace */}
          <polyline
            fill="none"
            stroke="#3fb950"
            strokeWidth={2}
            points={steps.slice(0, cur + 1).map((s) => `${xAt(s.t)},${outYpix(s.y).toFixed(1)}`).join(' ')}
          />

          {steps.map((s, t) => {
            const revealed = t <= cur;
            const active = t === cur;
            if (!revealed) return null;
            return (
              <g key={t} opacity={active ? 1 : 0.8}>
                {/* input node */}
                <circle cx={xAt(t)} cy={inY} r={8} fill={divBg(Math.max(-1, Math.min(1, s.x)))} stroke="rgba(56,139,253,0.6)" />
                <text x={xAt(t)} y={inY + 22} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.55)" fontFamily="monospace">{f2(s.x)}</text>
                {/* input -> hidden */}
                <line x1={xAt(t)} y1={inY - 8} x2={xAt(t)} y2={hY(H - 1) + CELL} stroke="rgba(255,255,255,0.12)" />
                {/* hidden units */}
                {s.h.map((v, j) => (
                  <rect key={j} x={xAt(t) - CELL / 2} y={hY(j)} width={CELL} height={CELL} rx={2}
                    fill={divBg(v)} stroke={active ? '#ee4c2c' : 'rgba(255,255,255,0.15)'} strokeWidth={active ? 1.5 : 0.75} />
                ))}
                {/* hidden -> output */}
                <line x1={xAt(t)} y1={hY(0)} x2={xAt(t)} y2={outYpix(s.y) + 4} stroke="rgba(255,255,255,0.12)" />
                <circle cx={xAt(t)} cy={outYpix(s.y)} r={3.5} fill="#3fb950" />
                {/* timestep label */}
                <text x={xAt(t)} y={SH - 8} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="monospace">{t}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 font-mono text-xs leading-relaxed text-white/70">
        <div className="mb-1 text-torch-light">step t = {cur} &nbsp; (input xₜ = {f2(steps[cur].x)})</div>
        <div>hₜ = [{steps[cur].h.map(f2).join(', ')}]</div>
        <div>yₜ = <span className="text-green-400">{f2(steps[cur].y)}</span></div>
      </div>

      <p className="mt-2 text-xs text-white/40">
        Hidden units: <span className="text-[#ee4c2c]">orange</span> = positive, <span className="text-[#388bfd]">blue</span> = negative (tanh ∈ (−1,1)). The orange arrow carries hₜ₋₁ into the next step.
      </p>
    </div>
  );
}
