'use client';

import { Tensor } from '@/lib/minitorch/tensor';

function fmt(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return (+n.toFixed(3)).toString();
}

/** Render a 0-, 1-, or 2-D tensor as a labeled grid. Higher dims fall back to repr. */
export default function TensorView({
  tensor,
  name,
}: {
  tensor: Tensor;
  name?: string;
}) {
  const { shape } = tensor;
  const header = (
    <div className="mb-1 flex items-center gap-2 text-xs text-white/50">
      {name && <span className="font-mono text-torch-light">{name}</span>}
      <span>shape [{shape.join(', ') || 'scalar'}]</span>
      {tensor.requires_grad && (
        <span className="rounded bg-torch/20 px-1.5 text-torch-light">
          requires_grad
        </span>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (shape.length === 0) {
    body = <Cell v={tensor.data[0]} />;
  } else if (shape.length === 1) {
    body = (
      <div className="flex flex-wrap gap-1">
        {Array.from(tensor.data).map((v, i) => (
          <Cell key={i} v={v} />
        ))}
      </div>
    );
  } else if (shape.length === 2) {
    const [rows, cols] = shape;
    body = (
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: rows * cols }).map((_, i) => (
          <Cell key={i} v={tensor.data[i]} />
        ))}
      </div>
    );
  } else {
    body = <code className="text-xs text-white/70">{tensor.toString()}</code>;
  }

  return (
    <div className="my-2">
      {header}
      {body}
    </div>
  );
}

function Cell({ v }: { v: number }) {
  // Color by sign/magnitude for a quick visual read.
  const mag = Math.min(Math.abs(v), 5) / 5;
  const bg =
    v > 0
      ? `rgba(238, 76, 44, ${0.12 + mag * 0.45})`
      : v < 0
      ? `rgba(56, 139, 253, ${0.12 + mag * 0.45})`
      : 'rgba(255,255,255,0.06)';
  return (
    <span
      className="inline-flex min-w-[3rem] items-center justify-center rounded px-2 py-1 text-center font-mono text-sm"
      style={{ backgroundColor: bg }}
    >
      {fmt(v)}
    </span>
  );
}
