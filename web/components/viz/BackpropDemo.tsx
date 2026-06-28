'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { runMlp, randomWeights, to2D, type Weights } from '@/lib/viz/mlpBackprop';

// ---------------------------------------------------------------------------
// Visualization
// ---------------------------------------------------------------------------

const SIZES = [2, 3, 2, 1];
const COL_LABELS = ['input', 'hidden 1', 'hidden 2', 'output'];
const SW = 600;
const SH = 300;
const R = 17;
const TOTAL = 6; // phases 0..5

const PHASE_TEXT = [
  'Forward · hidden 1:  z₁ = x·W₁ + b₁,   a₁ = relu(z₁)',
  'Forward · hidden 2:  z₂ = a₁·W₂ + b₂,   a₂ = relu(z₂)',
  'Forward · output:  z₃ = a₂·W₃ + b₃   →   loss = mean((z₃ − y)²)',
  'Backward · output:  dL/dz₃ = 2(z₃ − y)/N;   dL/dW₃ = a₂ᵀ · dL/dz₃',
  'Backward · hidden 2:  dL/da₂ = dL/dz₃·W₃ᵀ;   dL/dz₂ = dL/da₂ ⊙ relu′(z₂);   dL/dW₂ = a₁ᵀ·dL/dz₂',
  'Backward · hidden 1:  dL/da₁ = dL/dz₂·W₂ᵀ;   dL/dz₁ = dL/da₁ ⊙ relu′(z₁);   dL/dW₁ = xᵀ·dL/dz₁',
];

const colX = (c: number) => 60 + (c * (SW - 120)) / 3;
const nodeY = (count: number, i: number) => SH / 2 + (i - (count - 1) / 2) * 62;

function f3(n: number): string {
  if (Object.is(n, -0)) n = 0;
  return Number.isInteger(n) ? String(n) : (+n.toFixed(3)).toString();
}
const vec = (a: number[]) => '[' + a.map(f3).join(', ') + ']';

export default function BackpropDemo() {
  const [inputs, setInputs] = useState<[number, number]>([1, 0.5]);
  const [target, setTarget] = useState(1);
  const [seed, setSeed] = useState(1);
  const [weights, setWeights] = useState<Weights>(() => randomWeights(1));
  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const res = useMemo(() => runMlp(inputs, target, weights), [inputs, target, weights]);

  // Auto-advance while playing; re-armed per phase so the updater stays pure.
  useEffect(() => {
    if (!playing) return;
    if (phase >= TOTAL - 1) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setPhase((p) => Math.min(p + 1, TOTAL - 1)), 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, phase]);

  // Column-level activation values (input column uses x).
  const colActivations = (c: number): number[] => (c === 0 ? res.x : res.neurons[c - 1].a);

  // Reveal logic keyed off the phase.
  const fwdRevealed = (c: number) => c === 0 || phase >= c - 1; // hidden1 at phase>=0 …
  const lossRevealed = phase >= 2;
  const gradRevealed = (neuronLayer: number) => phase >= 5 - neuronLayer; // output(2)@3 …
  // Which incoming weight layer is "active" right now (numbers shown on its edges).
  const fwdActiveW = phase <= 2 ? phase : -1; // W index = phase for forward
  const bwdActiveW = phase >= 3 ? 5 - phase : -1; // phase3->W3(2) …

  const maxAbsAct = Math.max(
    1,
    ...res.x.map(Math.abs),
    ...res.neurons.flatMap((n) => n.a.map(Math.abs))
  );
  const maxAbsGrad = Math.max(1, ...res.neurons.flatMap((n) => n.dz.map(Math.abs)));
  const maxAbsW = Math.max(1, ...res.weights.flatMap((w) => w.W.map(Math.abs)));

  const reset = () => {
    setPlaying(false);
    setPhase(0);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        A real <code className="font-mono text-torch-light">2 → 3 → 2 → 1</code> MLP,
        computed live by the engine. Step through the{' '}
        <span className="text-[#388bfd]">forward</span> pass (activations fill in
        left→right), then <span className="text-torch-light">backprop</span>{' '}
        (gradients fill in right→left).
      </p>

      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => (phase >= TOTAL - 1 ? reset() : setPlaying((p) => !p))}
          className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark"
        >
          {phase >= TOTAL - 1 ? '↺ Replay' : playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={() => setPhase((p) => Math.max(0, p - 1))}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          ‹ Back
        </button>
        <button
          onClick={() => setPhase((p) => Math.min(TOTAL - 1, p + 1))}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Step ›
        </button>
        <button onClick={reset} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">
          Reset
        </button>
        <button
          onClick={() => {
            const ns = seed + 1;
            setSeed(ns);
            setWeights(randomWeights(ns));
            reset();
          }}
          className="rounded-md border border-torch/40 px-3 py-1.5 text-sm text-torch-light hover:bg-torch/10"
        >
          ⟳ Randomize weights
        </button>
        <span className="ml-1 text-xs text-white/40">
          step {phase + 1}/{TOTAL}
        </span>
      </div>

      {/* sliders */}
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
        <label className="flex items-center gap-2 font-mono">
          x₀
          <input type="range" min={-2} max={2} step={0.1} value={inputs[0]}
            onChange={(e) => setInputs([parseFloat(e.target.value), inputs[1]])} />
          <span className="w-10 text-white/80">{f3(inputs[0])}</span>
        </label>
        <label className="flex items-center gap-2 font-mono">
          x₁
          <input type="range" min={-2} max={2} step={0.1} value={inputs[1]}
            onChange={(e) => setInputs([inputs[0], parseFloat(e.target.value)])} />
          <span className="w-10 text-white/80">{f3(inputs[1])}</span>
        </label>
        <label className="flex items-center gap-2 font-mono">
          target y
          <input type="range" min={-3} max={3} step={0.1} value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value))} />
          <span className="w-10 text-white/80">{f3(target)}</span>
        </label>
      </div>

      {/* network diagram */}
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
        <svg width={SW} height={SH} className="max-w-full">
          {/* column captions */}
          {SIZES.map((_, c) => (
            <text key={c} x={colX(c)} y={16} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.4)" fontFamily="monospace">
              {COL_LABELS[c]}
            </text>
          ))}

          {/* edges (one weight layer per gap) */}
          {res.weights.map((wl, wi) => {
            const fromCount = SIZES[wi];
            const toCount = SIZES[wi + 1];
            const showW = wi === fwdActiveW;
            const showDW = wi === bwdActiveW;
            const out: React.ReactNode[] = [];
            for (let r = 0; r < fromCount; r++) {
              for (let cc = 0; cc < toCount; cc++) {
                const wv = wl.W[r * toCount + cc];
                const dwv = wl.dW[r * toCount + cc];
                const x1 = colX(wi) + R;
                const y1 = nodeY(fromCount, r);
                const x2 = colX(wi + 1) - R;
                const y2 = nodeY(toCount, cc);
                const t = Math.min(1, Math.abs(wv) / maxAbsW);
                const stroke = showDW
                  ? dwv >= 0
                    ? 'rgba(238,76,44,0.85)'
                    : 'rgba(56,139,253,0.85)'
                  : wv >= 0
                    ? `rgba(238,76,44,${0.18 + 0.5 * t})`
                    : `rgba(56,139,253,${0.18 + 0.5 * t})`;
                out.push(
                  <line key={`${wi}-${r}-${cc}`} x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={stroke} strokeWidth={showDW ? 2 : 1 + 2 * t} />
                );
                if (showW || showDW) {
                  out.push(
                    <text key={`t-${wi}-${r}-${cc}`} x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 2}
                      textAnchor="middle" fontSize={9} fontFamily="monospace"
                      fill={showDW ? '#ff7a5c' : 'rgba(255,255,255,0.6)'}>
                      {showDW ? `∇${f3(dwv)}` : f3(wv)}
                    </text>
                  );
                }
              }
            }
            return <g key={`w${wi}`}>{out}</g>;
          })}

          {/* nodes */}
          {SIZES.map((count, c) => {
            const acts = colActivations(c);
            const neuronLayer = c - 1; // -1 for input column
            return (
              <g key={`col${c}`}>
                {Array.from({ length: count }).map((_, i) => {
                  const revealed = fwdRevealed(c);
                  const a = acts[i] ?? 0;
                  const t = Math.min(1, Math.abs(a) / maxAbsAct);
                  const fill = revealed ? `rgba(56,139,253,${0.12 + 0.6 * t})` : 'rgba(255,255,255,0.04)';
                  const showGrad = neuronLayer >= 0 && gradRevealed(neuronLayer);
                  const dz = showGrad ? res.neurons[neuronLayer].dz[i] : 0;
                  const gt = Math.min(1, Math.abs(dz) / maxAbsGrad);
                  const cx = colX(c);
                  const cy = nodeY(count, i);
                  return (
                    <g key={i}>
                      <circle cx={cx} cy={cy} r={R}
                        fill={fill}
                        stroke={showGrad ? '#ee4c2c' : 'rgba(56,139,253,0.6)'}
                        strokeWidth={showGrad ? 1.5 + 3 * gt : 1.5} />
                      {revealed && (
                        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={10} fontFamily="monospace" fill="#e6edf3">
                          {f3(a)}
                        </text>
                      )}
                      {showGrad && (
                        <text x={cx} y={cy - R - 4} textAnchor="middle" fontSize={9} fontFamily="monospace" fill="#ff7a5c">
                          ∇{f3(dz)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* loss readout */}
          <text x={colX(3)} y={SH - 12} textAnchor="middle" fontSize={11} fontFamily="monospace"
            fill={lossRevealed ? '#3fb950' : 'rgba(255,255,255,0.2)'}>
            {lossRevealed ? `loss = ${f3(res.loss)}` : 'loss = —'}
          </text>
        </svg>
      </div>

      {/* step caption + numeric panel */}
      <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 font-mono text-xs leading-relaxed">
        <div className="mb-2 text-torch-light">{PHASE_TEXT[phase]}</div>
        {phase <= 2 ? (
          <div className="space-y-0.5 text-white/70">
            <div>z{phase + 1} = {vec(res.neurons[phase].z)}</div>
            <div>a{phase + 1} = {vec(res.neurons[phase].a)}{phase === 2 ? '   (output, no ReLU)' : '   (after relu)'}</div>
            {phase === 2 && <div className="text-green-400">loss = {f3(res.loss)}   (target y = {f3(target)})</div>}
          </div>
        ) : (
          (() => {
            const nl = 5 - phase; // active neuron layer
            const wl = res.weights[nl];
            const names = ['1', '2', '3'];
            return (
              <div className="space-y-0.5 text-white/70">
                <div className="text-[#ff7a5c]">dL/dz{names[nl]} = {vec(res.neurons[nl].dz)}</div>
                <div>dL/db{names[nl]} = {vec(wl.db)}</div>
                <div className="text-[#ff7a5c]">
                  dL/dW{names[nl]} ={' '}
                  {to2D(wl.dW, wl.rows, wl.cols).map((row) => vec(row)).join('  ')}
                </div>
              </div>
            );
          })()
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
        <span><span className="text-[#388bfd]">●</span> activation (fill ∝ value)</span>
        <span><span className="text-torch-light">●</span> gradient ∇ (ring ∝ |dL/dz|)</span>
        <span><span className="text-[#ee4c2c]">▬</span> +weight</span>
        <span><span className="text-[#388bfd]">▬</span> −weight</span>
      </div>
    </div>
  );
}
