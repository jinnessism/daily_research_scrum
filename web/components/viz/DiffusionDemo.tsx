'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  sampleTarget,
  makeSchedule,
  qSample,
  langevinStep,
  targetMeans,
  makeRandn,
  TARGET_SIGMA,
  type Vec2,
  type TargetKind,
} from '@/lib/viz/diffusion';

const SZ = 340;
const N = 160;
const RANGE = 3.2;
const TARGETS: { id: TargetKind; label: string }[] = [
  { id: 'two', label: 'two blobs' },
  { id: 'ring', label: 'ring' },
  { id: 'grid', label: 'grid' },
];
const REVERSE_STEPS = 60;

const px = (v: number) => SZ / 2 + (v / RANGE) * (SZ / 2 - 12);

// Color each point by its nearest target mode, so structure is visible.
function modeColor(p: Vec2, means: Vec2[]): string {
  let best = 0;
  let bd = Infinity;
  means.forEach((m, i) => {
    const d = (p.x - m.x) ** 2 + (p.y - m.y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  });
  const hue = (best * 360) / means.length;
  return `hsl(${hue}, 70%, 60%)`;
}

export default function DiffusionDemo() {
  const [kind, setKind] = useState<TargetKind>('two');
  const [seed, setSeed] = useState(5);
  const [mode, setMode] = useState<'forward' | 'reverse'>('forward');
  const [phase, setPhase] = useState(0); // forward timestep index
  const [revStep, setRevStep] = useState(0);
  const [pts, setPts] = useState<Vec2[]>([]); // used in reverse mode
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sched = useMemo(() => makeSchedule(40), []);
  const means = useMemo(() => targetMeans(kind), [kind]);
  const x0 = useMemo(() => sampleTarget(kind, N, seed), [kind, seed]);
  const eps = useMemo(() => {
    const r = makeRandn(seed ^ 0x1234);
    return Array.from({ length: N }, () => ({ x: r(), y: r() }));
  }, [kind, seed]);

  // colors are fixed to each point's clean-data mode
  const colors = useMemo(() => x0.map((p) => modeColor(p, means)), [x0, means]);

  const forwardPts = useMemo(
    () => x0.map((p, i) => qSample(p, sched.abar[phase], eps[i])),
    [x0, eps, sched, phase]
  );
  const display = mode === 'forward' ? forwardPts : pts;

  // animation
  useEffect(() => {
    if (!playing) return;
    if (mode === 'forward') {
      if (phase >= sched.T) {
        setPlaying(false);
        return;
      }
      timer.current = setTimeout(() => setPhase((p) => Math.min(p + 1, sched.T)), 90);
    } else {
      if (revStep >= REVERSE_STEPS) {
        setPlaying(false);
        return;
      }
      const randn = makeRandn((seed * 131 + revStep) >>> 0);
      // anneal the Langevin step size from large to small
      const eta = 0.02 * (1 - revStep / REVERSE_STEPS) + 0.002;
      timer.current = setTimeout(() => {
        setPts((prev) => prev.map((p) => langevinStep(p, means, TARGET_SIGMA, eta, randn)));
        setRevStep((s) => s + 1);
      }, 90);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, mode, phase, revStep, sched, means, seed]);

  const startForward = () => {
    setMode('forward');
    setPhase(0);
    setPlaying(true);
  };
  const startReverse = () => {
    setMode('reverse');
    setRevStep(0);
    const r = makeRandn((seed * 977) >>> 0);
    setPts(Array.from({ length: N }, () => ({ x: r() * 1.2, y: r() * 1.2 })));
    setPlaying(true);
  };
  const reset = () => {
    setPlaying(false);
    setMode('forward');
    setPhase(0);
  };

  const noiseLabel =
    mode === 'forward'
      ? `ᾱ = ${sched.abar[phase].toFixed(3)}  (t = ${phase}/${sched.T})`
      : `Langevin step ${revStep}/${REVERSE_STEPS}`;

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        <span className="text-[#388bfd]">Forward</span>: add Gaussian noise until the
        data becomes pure noise —{' '}
        <code className="font-mono">xₜ = √ᾱₜ·x₀ + √(1−ᾱₜ)·ε</code>.{' '}
        <span className="text-torch-light">Reverse</span>: start from noise and walk up
        the score <code className="font-mono">∇log p(x)</code> back to the data (annealed
        Langevin — the target is a Gaussian mixture, so the score is exact).
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          {TARGETS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setKind(t.id);
                reset();
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                t.id === kind ? 'bg-torch/20 text-torch-light' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={startForward} className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark">▶ Add noise</button>
        <button onClick={startReverse} className="rounded-md border border-torch/40 px-4 py-1.5 text-sm text-torch-light hover:bg-torch/10">▶ Sample (denoise)</button>
        <button onClick={reset} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Reset</button>
        <button
          onClick={() => {
            setSeed((s) => s + 1);
            reset();
          }}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          ⟳ Resample
        </button>
      </div>

      {mode === 'forward' && (
        <div className="mb-3 flex items-center gap-2 text-sm text-white/60">
          <span className="font-mono">t</span>
          <input type="range" min={0} max={sched.T} value={phase} onChange={(e) => { setPlaying(false); setPhase(parseInt(e.target.value, 10)); }} />
        </div>
      )}

      <div className="inline-block overflow-hidden rounded-lg border border-white/10 bg-black/40">
        <svg width={SZ} height={SZ} className="block">
          <line x1={px(0)} y1={0} x2={px(0)} y2={SZ} stroke="rgba(255,255,255,0.06)" />
          <line x1={0} y1={px(0)} x2={SZ} y2={px(0)} stroke="rgba(255,255,255,0.06)" />
          {display.map((p, i) => (
            <circle key={i} cx={px(p.x)} cy={px(p.y)} r={2.6} fill={colors[i]} opacity={0.85} />
          ))}
        </svg>
      </div>

      <div className="mt-2 font-mono text-xs text-white/55">
        {noiseLabel}
        {mode === 'reverse' && revStep >= REVERSE_STEPS && <span className="ml-2 text-green-400">✓ samples reached the data distribution</span>}
        {mode === 'forward' && phase >= sched.T && <span className="ml-2 text-[#388bfd]">✓ data is now ≈ unit Gaussian noise</span>}
      </div>
    </div>
  );
}
