'use client';

import { useEffect, useRef, useState } from 'react';
import { tensor } from '@/lib/minitorch/tensor';
import { add, mul, mse_loss } from '@/lib/minitorch/ops';

// Fixed synthetic dataset: y ≈ 2x + 1 with mild noise (deterministic).
const N = 24;
const TRUE_W = 2;
const TRUE_B = 1;
const DATA = Array.from({ length: N }, (_, i) => {
  const x = -3 + (6 * i) / (N - 1);
  // pseudo-noise from a fixed formula so SSR/CSR match
  const noise = Math.sin(i * 12.9898) * 0.6;
  return { x, y: TRUE_W * x + TRUE_B + noise };
});

const X = tensor(DATA.map((d) => d.x));
const Y = tensor(DATA.map((d) => d.y));

const W = 460;
const H = 300;
const PAD = 30;
const XR = [-3.2, 3.2];
const YR = [-7, 9];
const sx = (x: number) => PAD + ((x - XR[0]) / (XR[1] - XR[0])) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - ((y - YR[0]) / (YR[1] - YR[0])) * (H - 2 * PAD);

function step(w: number, b: number, lr: number) {
  const wt = tensor(w, true);
  const bt = tensor(b, true);
  const pred = add(mul(X, wt), bt);
  const loss = mse_loss(pred, Y);
  loss.backward();
  return {
    w: w - lr * wt.grad![0],
    b: b - lr * bt.grad![0],
    loss: loss.data[0],
  };
}

export default function GradientDescentDemo() {
  const [w, setW] = useState(-1);
  const [b, setB] = useState(0);
  const [lr, setLr] = useState(0.03);
  const [loss, setLoss] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the latest values in a ref so the interval/step callback never reads
  // stale closure state — and so each setState below runs exactly once (the old
  // nested-updater approach left `w` unchanged and double-ran under StrictMode).
  const stateRef = useRef({ w, b, lr });
  stateRef.current = { w, b, lr };

  const doStep = () => {
    const { w: cw, b: cb, lr: clr } = stateRef.current;
    const r = step(cw, cb, clr);
    setW(r.w);
    setB(r.b);
    setLoss(r.loss);
    setHistory((h) => [...h.slice(-119), r.loss]);
  };

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(doStep, 120);
      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, lr]);

  const reset = () => {
    setPlaying(false);
    setW(-1);
    setB(0);
    setLoss(null);
    setHistory([]);
  };

  const maxLoss = Math.max(...history, 1);

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        Fitting <code className="font-mono text-torch-light">y = w·x + b</code> to
        noisy data by gradient descent. Each step computes the MSE loss, runs{' '}
        <code className="font-mono">.backward()</code>, and nudges{' '}
        <code className="font-mono">w</code> and <code className="font-mono">b</code>{' '}
        downhill.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button
          onClick={doStep}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Step
        </button>
        <button
          onClick={reset}
          className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          Reset
        </button>
        <label className="flex items-center gap-2 text-sm text-white/60">
          learning rate
          <input
            type="range"
            min={0.005}
            max={0.12}
            step={0.005}
            value={lr}
            onChange={(e) => setLr(parseFloat(e.target.value))}
          />
          <span className="w-12 font-mono text-white/80">{lr.toFixed(3)}</span>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-6 text-sm font-mono">
        <span>w = <span className="text-torch-light">{w.toFixed(3)}</span></span>
        <span>b = <span className="text-torch-light">{b.toFixed(3)}</span></span>
        <span>loss = <span className="text-green-400">{loss === null ? '—' : loss.toFixed(4)}</span></span>
        <span className="text-white/40">(target w≈2, b≈1)</span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Scatter + fitted line */}
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
          <svg width={W} height={H} className="max-w-full">
            <line x1={sx(XR[0])} y1={sy(0)} x2={sx(XR[1])} y2={sy(0)} stroke="rgba(255,255,255,0.15)" />
            <line x1={sx(0)} y1={sy(YR[0])} x2={sx(0)} y2={sy(YR[1])} stroke="rgba(255,255,255,0.15)" />
            {DATA.map((d, i) => (
              <circle key={i} cx={sx(d.x)} cy={sy(d.y)} r={3.5} fill="rgba(56,139,253,0.8)" />
            ))}
            <line
              x1={sx(XR[0])}
              y1={sy(w * XR[0] + b)}
              x2={sx(XR[1])}
              y2={sy(w * XR[1] + b)}
              stroke="#ee4c2c"
              strokeWidth={2.5}
            />
            <text x={PAD} y={18} fill="rgba(255,255,255,0.4)" fontSize={11}>
              data & current fit
            </text>
          </svg>
        </div>

        {/* Loss curve */}
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
          <svg width={W} height={H} className="max-w-full">
            <text x={PAD} y={18} fill="rgba(255,255,255,0.4)" fontSize={11}>
              loss over steps
            </text>
            {history.length > 1 && (
              <polyline
                fill="none"
                stroke="#3fb950"
                strokeWidth={2}
                points={history
                  .map((l, i) => {
                    const x = PAD + (i / Math.max(history.length - 1, 1)) * (W - 2 * PAD);
                    const y = H - PAD - (l / maxLoss) * (H - 2 * PAD);
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
