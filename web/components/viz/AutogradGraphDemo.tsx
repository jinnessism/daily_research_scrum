'use client';

import { useMemo, useState } from 'react';
import { tensor } from '@/lib/minitorch/tensor';
import { add, mul, sub, mean } from '@/lib/minitorch/ops';
import { graphSnapshot, GraphNode } from '@/lib/minitorch/autograd';
import { Tensor } from '@/lib/minitorch/tensor';

interface Preset {
  id: string;
  label: string;
  expr: string;
  build: () => Tensor;
}

const PRESETS: Preset[] = [
  {
    id: 'simple',
    label: 'z = a · b + c',
    expr: 'z = a * b + c',
    build: () => {
      const a = tensor(2, true);
      const b = tensor(3, true);
      const c = tensor(4, true);
      const z = add(mul(a, b), c);
      z.backward();
      return z;
    },
  },
  {
    id: 'quad',
    label: 'L = mean((x·w − y)²)',
    expr: 'L = mean((x*w - y)^2)',
    build: () => {
      const x = tensor([1, 2], true);
      const w = tensor(0.5, true);
      const y = tensor([2, 4]);
      const d = sub(mul(x, w), y);
      const L = mean(mul(d, d));
      L.backward();
      return L;
    },
  },
];

const COL_W = 170;
const ROW_H = 90;
const BOX_W = 132;
const BOX_H = 60;

function short(v: number[]): string {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : (+n.toFixed(2)).toString());
  if (v.length <= 3) return '[' + v.map(f).join(', ') + ']';
  return '[' + v.slice(0, 2).map(f).join(', ') + ', …]';
}

export default function AutogradGraphDemo() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === presetId)!;

  const nodes = useMemo<GraphNode[]>(() => graphSnapshot(preset.build()), [presetId]);

  // Longest-path depth (inputs come before node in topo order).
  const depth = new Array(nodes.length).fill(0);
  nodes.forEach((n) => {
    depth[n.id] = n.inputs.length ? Math.max(...n.inputs.map((i) => depth[i])) + 1 : 0;
  });
  const maxDepth = Math.max(...depth);

  const byCol: number[][] = Array.from({ length: maxDepth + 1 }, () => []);
  nodes.forEach((n) => byCol[depth[n.id]].push(n.id));

  const pos: Record<number, { x: number; y: number }> = {};
  byCol.forEach((col, d) => {
    col.forEach((id, i) => {
      pos[id] = { x: 20 + d * COL_W, y: 20 + i * ROW_H };
    });
  });

  const width = 40 + (maxDepth + 1) * COL_W;
  const height = 40 + Math.max(...byCol.map((c) => c.length)) * ROW_H;

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        Every operation builds a node in the computation graph.{' '}
        <code className="font-mono">.backward()</code> walks it in reverse, filling
        each node's gradient (shown in orange). Leaves are inputs; the rightmost
        node is the output.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPresetId(p.id)}
            className={`rounded-md border px-3 py-1 text-sm font-mono transition ${
              p.id === presetId
                ? 'border-torch/50 text-torch-light'
                : 'border-white/15 text-white/60 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-2">
        <svg width={width} height={Math.max(height, 120)}>
          {/* edges */}
          {nodes.flatMap((n) =>
            n.inputs.map((inp) => (
              <line
                key={`${inp}-${n.id}`}
                x1={pos[inp].x + BOX_W}
                y1={pos[inp].y + BOX_H / 2}
                x2={pos[n.id].x}
                y2={pos[n.id].y + BOX_H / 2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            ))
          )}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="rgba(255,255,255,0.35)" />
            </marker>
          </defs>
          {/* nodes */}
          {nodes.map((n) => (
            <g key={n.id} transform={`translate(${pos[n.id].x}, ${pos[n.id].y})`}>
              <rect
                width={BOX_W}
                height={BOX_H}
                rx={8}
                fill={n.isLeaf ? 'rgba(56,139,253,0.15)' : 'rgba(255,255,255,0.05)'}
                stroke={n.isLeaf ? 'rgba(56,139,253,0.5)' : 'rgba(238,76,44,0.45)'}
              />
              <text x={8} y={16} fill="#e6edf3" fontSize={12} fontWeight={600} fontFamily="monospace">
                {n.op}
              </text>
              <text x={8} y={33} fill="rgba(255,255,255,0.6)" fontSize={11} fontFamily="monospace">
                {short(n.value)}
              </text>
              {n.grad && (
                <text x={8} y={50} fill="#ff7a5c" fontSize={11} fontFamily="monospace">
                  ∇ {short(n.grad)}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-white/50">
        <span><span className="text-[#388bfd]">●</span> leaf (input)</span>
        <span><span className="text-torch-light">●</span> op (operation)</span>
        <span><span className="text-torch-light">∇</span> gradient</span>
      </div>
    </div>
  );
}
