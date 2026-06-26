'use client';

import { useEffect, useRef, useState } from 'react';

// A fixed grayscale "scene" (deterministic so SSR and CSR agree). Values 0–9.
const IMAGE: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 9, 9, 9, 0, 0, 0, 0],
  [0, 9, 9, 9, 0, 3, 3, 0],
  [0, 9, 9, 9, 0, 3, 3, 0],
  [0, 0, 0, 0, 0, 3, 3, 0],
  [0, 6, 6, 6, 6, 0, 0, 0],
  [0, 6, 6, 6, 6, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KERNELS: { id: string; label: string; k: number[][]; scale: number }[] = [
  { id: 'vedge', label: 'Vertical edge', k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], scale: 1 },
  { id: 'hedge', label: 'Horizontal edge', k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], scale: 1 },
  { id: 'sharpen', label: 'Sharpen', k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], scale: 1 },
  { id: 'blur', label: 'Blur (÷9)', k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], scale: 1 / 9 },
];

const H = IMAGE.length;
const W = IMAGE[0].length;
const K = 3;
const OH = H - K + 1;
const OW = W - K + 1;
const CELL = 30;

function convAt(k: number[][], oi: number, oj: number, scale: number): number {
  let acc = 0;
  for (let a = 0; a < K; a++)
    for (let b = 0; b < K; b++) acc += IMAGE[oi + a][oj + b] * k[a][b];
  return acc * scale;
}

function fullConv(k: number[][], scale: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < OH; i++) {
    const row: number[] = [];
    for (let j = 0; j < OW; j++) row.push(convAt(k, i, j, scale));
    out.push(row);
  }
  return out;
}

function grayBg(v: number): string {
  const g = Math.round((v / 9) * 235) + 10;
  return `rgb(${g},${g},${g})`;
}

// Diverging color for feature-map values: orange positive, blue negative.
function featBg(v: number, maxAbs: number): string {
  const t = Math.max(-1, Math.min(1, v / maxAbs));
  if (t >= 0) return `rgba(238,76,44,${0.12 + 0.8 * t})`;
  return `rgba(56,139,253,${0.12 + 0.8 * -t})`;
}

export default function ConvDemo() {
  const [kernelId, setKernelId] = useState(KERNELS[0].id);
  const [pos, setPos] = useState(0); // flat index over the OH×OW output
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const kernel = KERNELS.find((x) => x.id === kernelId)!;
  const oi = Math.floor(pos / OW);
  const oj = pos % OW;

  const feat = fullConv(kernel.k, kernel.scale);
  const maxAbs = Math.max(1, ...feat.flat().map((v) => Math.abs(v)));
  const current = feat[oi][oj];

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => setPos((p) => (p + 1) % (OH * OW)), 280);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing]);

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        A <code className="font-mono text-torch-light">3×3</code> kernel slides over
        an <code className="font-mono">8×8</code> image. At each spot it computes a
        dot product with the pixels under it, producing one cell of the{' '}
        <code className="font-mono">6×6</code> feature map.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {KERNELS.map((kk) => (
            <button
              key={kk.id}
              onClick={() => setKernelId(kk.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                kk.id === kernelId
                  ? 'bg-torch/20 text-torch-light'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {kk.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark"
        >
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <label className="flex items-center gap-2 text-sm text-white/60">
          position
          <input
            type="range"
            min={0}
            max={OH * OW - 1}
            value={pos}
            onChange={(e) => setPos(parseInt(e.target.value, 10))}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-6">
        {/* Input image with the receptive-field window */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">input image</div>
          <div className="relative" style={{ width: W * CELL, height: H * CELL }}>
            <svg width={W * CELL} height={H * CELL} className="block">
              {IMAGE.map((row, i) =>
                row.map((v, j) => (
                  <g key={`${i}-${j}`}>
                    <rect x={j * CELL} y={i * CELL} width={CELL} height={CELL} fill={grayBg(v)} stroke="rgba(0,0,0,0.25)" />
                    <text
                      x={j * CELL + CELL / 2}
                      y={i * CELL + CELL / 2 + 4}
                      textAnchor="middle"
                      fontSize={11}
                      fontFamily="monospace"
                      fill={v > 4 ? '#000' : 'rgba(255,255,255,0.65)'}
                    >
                      {v}
                    </text>
                  </g>
                ))
              )}
              {/* receptive-field highlight */}
              <rect
                x={oj * CELL}
                y={oi * CELL}
                width={K * CELL}
                height={K * CELL}
                fill="rgba(238,76,44,0.12)"
                stroke="#ee4c2c"
                strokeWidth={2.5}
              />
            </svg>
          </div>
        </div>

        {/* Kernel + live dot product */}
        <div className="font-mono text-sm">
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">kernel</div>
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${K}, 2.4rem)` }}>
            {kernel.k.flat().map((v, i) => (
              <div
                key={i}
                className="flex h-9 items-center justify-center rounded border border-white/15 bg-white/[0.03] text-white/80"
              >
                {kernel.scale === 1 ? v : `${v}`}
              </div>
            ))}
          </div>
          <div className="mt-4 text-white/70">
            output[{oi},{oj}] ={' '}
            <span className="text-torch-light">{fmt(current)}</span>
          </div>
          {kernel.scale !== 1 && (
            <div className="mt-1 text-xs text-white/40">(blur divides the sum by 9)</div>
          )}
        </div>

        {/* Feature map */}
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-white/40">feature map</div>
          <svg width={OW * CELL} height={OH * CELL} className="block">
            {feat.map((row, i) =>
              row.map((v, j) => (
                <g key={`${i}-${j}`}>
                  <rect
                    x={j * CELL}
                    y={i * CELL}
                    width={CELL}
                    height={CELL}
                    fill={featBg(v, maxAbs)}
                    stroke={i === oi && j === oj ? '#ee4c2c' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={i === oi && j === oj ? 2.5 : 1}
                  />
                  <text
                    x={j * CELL + CELL / 2}
                    y={i * CELL + CELL / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fontFamily="monospace"
                    fill="rgba(255,255,255,0.85)"
                  >
                    {fmt(v)}
                  </text>
                </g>
              ))
            )}
          </svg>
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">
        Orange = positive response, blue = negative. The same kernel is applied at
        every position — that weight sharing is what makes convolutions efficient.
      </p>
    </div>
  );
}
