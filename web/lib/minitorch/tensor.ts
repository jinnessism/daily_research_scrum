// A tiny, autograd-capable Tensor. Educational re-implementation of the core
// ideas behind torch.Tensor — flat storage + shape + reverse-mode autograd.

import { Shape, numel, strides, shapesEqual } from './shape';

export class Tensor {
  data: Float64Array;
  shape: Shape;
  requires_grad: boolean;
  grad: Float64Array | null = null;

  // Autograd graph metadata.
  _prev: Tensor[] = [];
  _backward: () => void = () => {};
  _op: string = '';

  constructor(
    data: Float64Array | number[],
    shape: Shape,
    requires_grad = false
  ) {
    this.data = data instanceof Float64Array ? data : Float64Array.from(data);
    this.shape = shape;
    this.requires_grad = requires_grad;
    if (this.data.length !== numel(shape)) {
      throw new Error(
        `Data length ${this.data.length} does not match shape [${shape}] (${numel(shape)})`
      );
    }
  }

  get size(): number {
    return this.data.length;
  }

  get ndim(): number {
    return this.shape.length;
  }

  /** Zero (or allocate) the gradient buffer. */
  zeroGrad(): void {
    this.grad = new Float64Array(this.data.length);
  }

  /** Accumulate into this tensor's gradient buffer. */
  accumGrad(g: Float64Array): void {
    if (!this.grad) this.grad = new Float64Array(this.data.length);
    for (let i = 0; i < g.length; i++) this.grad[i] += g[i];
  }

  /**
   * Reverse-mode autodiff. Seeds this tensor's grad with ones (it must be a
   * scalar for the implicit seed, matching torch's loss.backward()).
   */
  backward(): void {
    if (this.size !== 1) {
      throw new Error(
        'backward() can only be called on a scalar tensor (e.g. a loss). ' +
          'Reduce with .sum() or .mean() first.'
      );
    }
    // Topological order of the graph.
    const topo: Tensor[] = [];
    const visited = new Set<Tensor>();
    const build = (t: Tensor) => {
      if (visited.has(t)) return;
      visited.add(t);
      for (const p of t._prev) build(p);
      topo.push(t);
    };
    build(this);

    // Seed and clear grads.
    for (const t of topo) t.grad = new Float64Array(t.data.length);
    this.grad![0] = 1;

    for (let i = topo.length - 1; i >= 0; i--) {
      topo[i]._backward();
    }
  }

  /** Convert to a (possibly nested) plain JS array for display. */
  toArray(): number | number[] | number[][] | unknown {
    if (this.shape.length === 0) return this.data[0];
    const build = (dim: number, offset: number, st: number[]): unknown => {
      if (dim === this.shape.length - 1) {
        const row: number[] = [];
        for (let i = 0; i < this.shape[dim]; i++) row.push(this.data[offset + i]);
        return row;
      }
      const out: unknown[] = [];
      for (let i = 0; i < this.shape[dim]; i++) {
        out.push(build(dim + 1, offset + i * st[dim], st));
      }
      return out;
    };
    return build(0, 0, strides(this.shape));
  }

  /** torch-like repr, e.g. "tensor([[1., 2.], [3., 4.]])". */
  toString(): string {
    const fmt = (x: unknown): string => {
      if (Array.isArray(x)) return '[' + x.map(fmt).join(', ') + ']';
      const n = x as number;
      return Number.isInteger(n) ? `${n}.` : `${(+n.toFixed(4))}`;
    };
    return `tensor(${fmt(this.toArray())})`;
  }
}

// ---------------------------------------------------------------------------
// Creation helpers (the torch.* factory functions).
// ---------------------------------------------------------------------------

/** Infer shape from a nested JS array. */
function inferShape(x: unknown): Shape {
  const shp: number[] = [];
  let cur = x;
  while (Array.isArray(cur)) {
    shp.push(cur.length);
    cur = cur[0];
  }
  return shp;
}

function flatten(x: unknown, out: number[]): void {
  if (Array.isArray(x)) {
    for (const v of x) flatten(v, out);
  } else {
    out.push(x as number);
  }
}

/** torch.tensor(data, requires_grad=False) */
export function tensor(data: unknown, requires_grad = false): Tensor {
  if (typeof data === 'number') {
    return new Tensor([data], [], requires_grad);
  }
  const shape = inferShape(data);
  const flat: number[] = [];
  flatten(data, flat);
  return new Tensor(flat, shape, requires_grad);
}

export function zeros(shape: Shape, requires_grad = false): Tensor {
  return new Tensor(new Float64Array(numel(shape)), shape, requires_grad);
}

export function ones(shape: Shape, requires_grad = false): Tensor {
  const d = new Float64Array(numel(shape)).fill(1);
  return new Tensor(d, shape, requires_grad);
}

export function full(shape: Shape, value: number, requires_grad = false): Tensor {
  const d = new Float64Array(numel(shape)).fill(value);
  return new Tensor(d, shape, requires_grad);
}

export function arange(end: number): Tensor {
  const d = new Float64Array(end);
  for (let i = 0; i < end; i++) d[i] = i;
  return new Tensor(d, [end]);
}

// Deterministic-ish PRNG so visualizations are reproducible within a run but
// vary across calls. (Math.random is fine for the browser playground.)
export function randn(shape: Shape, requires_grad = false): Tensor {
  const n = numel(shape);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Box–Muller transform.
    const u1 = Math.random() || 1e-12;
    const u2 = Math.random();
    d[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  return new Tensor(d, shape, requires_grad);
}

export function rand(shape: Shape, requires_grad = false): Tensor {
  const n = numel(shape);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = Math.random();
  return new Tensor(d, shape, requires_grad);
}

export { shapesEqual };
