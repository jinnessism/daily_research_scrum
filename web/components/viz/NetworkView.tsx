'use client';

import { useState } from 'react';

const MAX_NODES_DRAWN = 8;
const W = 620;
const H = 340;

export default function NetworkView() {
  const [layers, setLayers] = useState<number[]>([3, 5, 4, 1]);

  const setLayer = (i: number, v: number) =>
    setLayers((ls) => ls.map((x, j) => (j === i ? Math.max(1, Math.min(16, v)) : x)));
  const addLayer = () =>
    setLayers((ls) => (ls.length < 6 ? [...ls.slice(0, -1), 4, ls[ls.length - 1]] : ls));
  const removeLayer = (i: number) =>
    setLayers((ls) => (ls.length > 2 ? ls.filter((_, j) => j !== i) : ls));

  // Parameters for stacked Linear layers (weights + biases).
  const params = layers.slice(1).reduce((acc, out, i) => acc + layers[i] * out + out, 0);

  const colX = (i: number) => 60 + (i / (layers.length - 1)) * (W - 120);
  const nodeY = (count: number, idx: number) => {
    const shown = Math.min(count, MAX_NODES_DRAWN);
    const gap = (H - 60) / (shown + 1);
    return 30 + gap * (idx + 1);
  };

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        Build a multi-layer perceptron. Each layer is a{' '}
        <code className="font-mono text-torch-light">Linear(in, out)</code> followed
        by a nonlinearity. Adjust widths and watch the parameter count change.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        {layers.map((n, i) => (
          <div key={i} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
            <div className="mb-1 text-xs text-white/40">
              {i === 0 ? 'input' : i === layers.length - 1 ? 'output' : `hidden ${i}`}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setLayer(i, n - 1)} className="rounded bg-white/10 px-2 hover:bg-white/20">−</button>
              <span className="w-8 text-center font-mono">{n}</span>
              <button onClick={() => setLayer(i, n + 1)} className="rounded bg-white/10 px-2 hover:bg-white/20">+</button>
              {layers.length > 2 && i !== 0 && i !== layers.length - 1 && (
                <button onClick={() => removeLayer(i)} className="ml-1 rounded bg-red-500/20 px-2 text-red-300 hover:bg-red-500/30">✕</button>
              )}
            </div>
          </div>
        ))}
        {layers.length < 6 && (
          <button onClick={addLayer} className="rounded-md border border-torch/40 px-3 py-2 text-sm text-torch-light hover:bg-torch/10">
            + hidden layer
          </button>
        )}
      </div>

      <div className="mb-3 text-sm font-mono">
        total trainable parameters:{' '}
        <span className="text-torch-light">{params.toLocaleString()}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
        <svg width={W} height={H} className="max-w-full">
          {/* edges between consecutive layers */}
          {layers.slice(0, -1).flatMap((count, li) => {
            const next = layers[li + 1];
            const a = Math.min(count, MAX_NODES_DRAWN);
            const b = Math.min(next, MAX_NODES_DRAWN);
            const lines: React.ReactNode[] = [];
            for (let i = 0; i < a; i++)
              for (let j = 0; j < b; j++)
                lines.push(
                  <line
                    key={`${li}-${i}-${j}`}
                    x1={colX(li)}
                    y1={nodeY(count, i)}
                    x2={colX(li + 1)}
                    y2={nodeY(next, j)}
                    stroke="rgba(238,76,44,0.12)"
                  />
                );
            return lines;
          })}
          {/* nodes */}
          {layers.map((count, li) => {
            const shown = Math.min(count, MAX_NODES_DRAWN);
            return (
              <g key={li}>
                {Array.from({ length: shown }).map((_, i) => (
                  <circle key={i} cx={colX(li)} cy={nodeY(count, i)} r={9} fill="rgba(56,139,253,0.25)" stroke="#388bfd" />
                ))}
                {count > MAX_NODES_DRAWN && (
                  <text x={colX(li)} y={H - 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={10}>
                    +{count - MAX_NODES_DRAWN} more
                  </text>
                )}
                <text x={colX(li)} y={16} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={11} fontFamily="monospace">
                  {count}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
