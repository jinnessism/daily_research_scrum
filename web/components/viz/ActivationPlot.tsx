'use client';

import { useState } from 'react';

type Fn = { name: string; color: string; f: (x: number) => number; on: boolean };

const FNS: Omit<Fn, 'on'>[] = [
  { name: 'relu', color: '#ee4c2c', f: (x) => Math.max(0, x) },
  { name: 'sigmoid', color: '#3fb950', f: (x) => 1 / (1 + Math.exp(-x)) },
  { name: 'tanh', color: '#388bfd', f: (x) => Math.tanh(x) },
  {
    name: 'gelu',
    color: '#d29922',
    f: (x) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))),
  },
];

const W = 560;
const H = 360;
const PAD = 36;
const XMIN = -6;
const XMAX = 6;
const YMIN = -1.5;
const YMAX = 3;

const sx = (x: number) => PAD + ((x - XMIN) / (XMAX - XMIN)) * (W - 2 * PAD);
const sy = (y: number) => H - PAD - ((y - YMIN) / (YMAX - YMIN)) * (H - 2 * PAD);

export default function ActivationPlot() {
  const [on, setOn] = useState<Record<string, boolean>>({
    relu: true,
    sigmoid: true,
    tanh: true,
    gelu: false,
  });

  const path = (f: (x: number) => number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 240; i++) {
      const x = XMIN + (i / 240) * (XMAX - XMIN);
      const y = Math.max(YMIN, Math.min(YMAX, f(x)));
      pts.push(`${i === 0 ? 'M' : 'L'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        Activation functions introduce nonlinearity. Toggle each to compare shapes
        and saturation behavior.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {FNS.map((fn) => (
          <button
            key={fn.name}
            onClick={() => setOn((o) => ({ ...o, [fn.name]: !o[fn.name] }))}
            className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm transition"
            style={{
              borderColor: on[fn.name] ? fn.color : 'rgba(255,255,255,0.15)',
              color: on[fn.name] ? fn.color : 'rgba(255,255,255,0.5)',
            }}
          >
            <span className="inline-block h-2 w-4 rounded" style={{ background: fn.color }} />
            {fn.name}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
        <svg width={W} height={H} className="max-w-full">
          {/* axes */}
          <line x1={sx(XMIN)} y1={sy(0)} x2={sx(XMAX)} y2={sy(0)} stroke="rgba(255,255,255,0.25)" />
          <line x1={sx(0)} y1={sy(YMIN)} x2={sx(0)} y2={sy(YMAX)} stroke="rgba(255,255,255,0.25)" />
          {[-1, 1, 2].map((y) => (
            <text key={y} x={sx(0) + 4} y={sy(y) - 2} fill="rgba(255,255,255,0.35)" fontSize={10}>
              {y}
            </text>
          ))}
          {[-4, -2, 2, 4].map((x) => (
            <text key={x} x={sx(x) - 4} y={sy(0) + 14} fill="rgba(255,255,255,0.35)" fontSize={10}>
              {x}
            </text>
          ))}
          {FNS.filter((fn) => on[fn.name]).map((fn) => (
            <path key={fn.name} d={path(fn.f)} fill="none" stroke={fn.color} strokeWidth={2} />
          ))}
        </svg>
      </div>
    </div>
  );
}
