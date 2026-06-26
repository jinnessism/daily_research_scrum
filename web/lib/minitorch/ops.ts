// Autograd-aware operations on Tensor. Each op runs the forward computation and
// installs a `_backward` closure that propagates gradients to its inputs.

import { Tensor } from './tensor';
import {
  Shape,
  numel,
  strides,
  broadcastShapes,
  unbroadcast,
  unravel,
  broadcastIndex,
} from './shape';

type BinFn = (a: number, b: number) => number;

/** Generic broadcasted elementwise binary op with autograd. */
function elementwise(
  a: Tensor,
  b: Tensor,
  forward: BinFn,
  // Local derivatives wrt a and b given (a, b, out).
  da: (a: number, b: number, out: number) => number,
  db: (a: number, b: number, out: number) => number,
  op: string
): Tensor {
  const outShape = broadcastShapes(a.shape, b.shape);
  const n = numel(outShape);
  const out = new Float64Array(n);
  const aStr = strides(a.shape);
  const bStr = strides(b.shape);

  for (let i = 0; i < n; i++) {
    const idx = unravel(i, outShape);
    const av = a.data[broadcastIndex(idx, a.shape, aStr)];
    const bv = b.data[broadcastIndex(idx, b.shape, bStr)];
    out[i] = forward(av, bv);
  }

  const result = new Tensor(out, outShape, a.requires_grad || b.requires_grad);
  result._op = op;
  result._prev = [a, b];
  result._backward = () => {
    if (!result.grad) return;
    const gradA = new Float64Array(n);
    const gradB = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const idx = unravel(i, outShape);
      const av = a.data[broadcastIndex(idx, a.shape, aStr)];
      const bv = b.data[broadcastIndex(idx, b.shape, bStr)];
      gradA[i] = da(av, bv, out[i]) * result.grad[i];
      gradB[i] = db(av, bv, out[i]) * result.grad[i];
    }
    if (a.requires_grad) a.accumGrad(unbroadcast(gradA, outShape, a.shape));
    if (b.requires_grad) b.accumGrad(unbroadcast(gradB, outShape, b.shape));
  };
  return result;
}

export function add(a: Tensor, b: Tensor): Tensor {
  return elementwise(a, b, (x, y) => x + y, () => 1, () => 1, 'add');
}

export function sub(a: Tensor, b: Tensor): Tensor {
  return elementwise(a, b, (x, y) => x - y, () => 1, () => -1, 'sub');
}

export function mul(a: Tensor, b: Tensor): Tensor {
  return elementwise(a, b, (x, y) => x * y, (_x, y) => y, (x) => x, 'mul');
}

export function div(a: Tensor, b: Tensor): Tensor {
  return elementwise(
    a,
    b,
    (x, y) => x / y,
    (_x, y) => 1 / y,
    (x, y) => -x / (y * y),
    'div'
  );
}

/** Generic unary op with autograd. `grad` is d(out)/d(in) given (in, out). */
function unary(
  a: Tensor,
  forward: (x: number) => number,
  grad: (x: number, out: number) => number,
  op: string
): Tensor {
  const out = new Float64Array(a.size);
  for (let i = 0; i < a.size; i++) out[i] = forward(a.data[i]);
  const result = new Tensor(out, a.shape.slice(), a.requires_grad);
  result._op = op;
  result._prev = [a];
  result._backward = () => {
    if (!result.grad || !a.requires_grad) return;
    const g = new Float64Array(a.size);
    for (let i = 0; i < a.size; i++) {
      g[i] = grad(a.data[i], out[i]) * result.grad[i];
    }
    a.accumGrad(g);
  };
  return result;
}

export function neg(a: Tensor): Tensor {
  return unary(a, (x) => -x, () => -1, 'neg');
}

export function relu(a: Tensor): Tensor {
  return unary(a, (x) => (x > 0 ? x : 0), (x) => (x > 0 ? 1 : 0), 'relu');
}

export function sigmoid(a: Tensor): Tensor {
  return unary(
    a,
    (x) => 1 / (1 + Math.exp(-x)),
    (_x, out) => out * (1 - out),
    'sigmoid'
  );
}

export function tanh(a: Tensor): Tensor {
  return unary(a, (x) => Math.tanh(x), (_x, out) => 1 - out * out, 'tanh');
}

export function exp(a: Tensor): Tensor {
  return unary(a, (x) => Math.exp(x), (_x, out) => out, 'exp');
}

export function log(a: Tensor): Tensor {
  return unary(a, (x) => Math.log(x), (x) => 1 / x, 'log');
}

export function powScalar(a: Tensor, p: number): Tensor {
  return unary(a, (x) => Math.pow(x, p), (x) => p * Math.pow(x, p - 1), `pow(${p})`);
}

/** Reduce over all elements to a scalar sum. */
export function sum(a: Tensor): Tensor {
  let s = 0;
  for (let i = 0; i < a.size; i++) s += a.data[i];
  const result = new Tensor([s], [], a.requires_grad);
  result._op = 'sum';
  result._prev = [a];
  result._backward = () => {
    if (!result.grad || !a.requires_grad) return;
    const g = new Float64Array(a.size).fill(result.grad[0]);
    a.accumGrad(g);
  };
  return result;
}

export function mean(a: Tensor): Tensor {
  let s = 0;
  for (let i = 0; i < a.size; i++) s += a.data[i];
  const result = new Tensor([s / a.size], [], a.requires_grad);
  result._op = 'mean';
  result._prev = [a];
  result._backward = () => {
    if (!result.grad || !a.requires_grad) return;
    const g = new Float64Array(a.size).fill(result.grad[0] / a.size);
    a.accumGrad(g);
  };
  return result;
}

/** 2D matrix multiply with autograd. Shapes: (m,k) @ (k,n) -> (m,n). */
export function matmul(a: Tensor, b: Tensor): Tensor {
  if (a.ndim !== 2 || b.ndim !== 2) {
    throw new Error('matmul currently supports 2D tensors only');
  }
  const [m, k] = a.shape;
  const [k2, n] = b.shape;
  if (k !== k2) {
    throw new Error(`matmul shape mismatch: (${m},${k}) @ (${k2},${n})`);
  }
  const out = new Float64Array(m * n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let acc = 0;
      for (let p = 0; p < k; p++) acc += a.data[i * k + p] * b.data[p * n + j];
      out[i * n + j] = acc;
    }
  }
  const result = new Tensor(out, [m, n], a.requires_grad || b.requires_grad);
  result._op = 'matmul';
  result._prev = [a, b];
  result._backward = () => {
    if (!result.grad) return;
    if (a.requires_grad) {
      const gA = new Float64Array(m * k);
      for (let i = 0; i < m; i++) {
        for (let p = 0; p < k; p++) {
          let acc = 0;
          for (let j = 0; j < n; j++) acc += result.grad[i * n + j] * b.data[p * n + j];
          gA[i * k + p] = acc;
        }
      }
      a.accumGrad(gA);
    }
    if (b.requires_grad) {
      const gB = new Float64Array(k * n);
      for (let p = 0; p < k; p++) {
        for (let j = 0; j < n; j++) {
          let acc = 0;
          for (let i = 0; i < m; i++) acc += a.data[i * k + p] * result.grad[i * n + j];
          gB[p * n + j] = acc;
        }
      }
      b.accumGrad(gB);
    }
  };
  return result;
}

/**
 * Single-channel 2D convolution — really cross-correlation, exactly as torch's
 * conv layers compute it. Stride 1, no padding ("valid"). `input` (H,W) and
 * `kernel` (kh,kw) produce (H-kh+1, W-kw+1). Educational scope: one input channel
 * and one kernel (no batching / channels / padding / stride).
 */
export function conv2d(input: Tensor, kernel: Tensor): Tensor {
  if (input.ndim !== 2 || kernel.ndim !== 2) {
    throw new Error('conv2d expects a 2D input and a 2D kernel (single channel)');
  }
  const [H, W] = input.shape;
  const [kh, kw] = kernel.shape;
  const oh = H - kh + 1;
  const ow = W - kw + 1;
  if (oh <= 0 || ow <= 0) {
    throw new Error(`conv2d kernel [${kh},${kw}] is larger than input [${H},${W}]`);
  }
  const out = new Float64Array(oh * ow);
  for (let i = 0; i < oh; i++) {
    for (let j = 0; j < ow; j++) {
      let acc = 0;
      for (let a = 0; a < kh; a++)
        for (let b = 0; b < kw; b++)
          acc += input.data[(i + a) * W + (j + b)] * kernel.data[a * kw + b];
      out[i * ow + j] = acc;
    }
  }
  const result = new Tensor(out, [oh, ow], input.requires_grad || kernel.requires_grad);
  result._op = 'conv2d';
  result._prev = [input, kernel];
  result._backward = () => {
    if (!result.grad) return;
    const gIn = input.requires_grad ? new Float64Array(H * W) : null;
    const gK = kernel.requires_grad ? new Float64Array(kh * kw) : null;
    for (let i = 0; i < oh; i++) {
      for (let j = 0; j < ow; j++) {
        const go = result.grad[i * ow + j];
        for (let a = 0; a < kh; a++) {
          for (let b = 0; b < kw; b++) {
            if (gIn) gIn[(i + a) * W + (j + b)] += go * kernel.data[a * kw + b];
            if (gK) gK[a * kw + b] += go * input.data[(i + a) * W + (j + b)];
          }
        }
      }
    }
    if (gIn) input.accumGrad(gIn);
    if (gK) kernel.accumGrad(gK);
  };
  return result;
}

/**
 * Non-overlapping 2D max pooling (window = stride = `size`), single channel.
 * `input` (H,W) -> (⌊H/size⌋, ⌊W/size⌋). The gradient flows only to the argmax
 * of each window.
 */
export function maxPool2d(input: Tensor, size: number): Tensor {
  if (input.ndim !== 2) throw new Error('max_pool2d expects a 2D input');
  if (!Number.isInteger(size) || size < 1) {
    throw new Error('max_pool2d size must be a positive integer');
  }
  const [H, W] = input.shape;
  const oh = Math.floor(H / size);
  const ow = Math.floor(W / size);
  if (oh < 1 || ow < 1) {
    throw new Error(`max_pool2d size ${size} is larger than input [${H},${W}]`);
  }
  const out = new Float64Array(oh * ow);
  const argmax = new Int32Array(oh * ow); // flat index into input of each window's max
  for (let i = 0; i < oh; i++) {
    for (let j = 0; j < ow; j++) {
      let best = -Infinity;
      let bestIdx = -1;
      for (let a = 0; a < size; a++) {
        for (let b = 0; b < size; b++) {
          const idx = (i * size + a) * W + (j * size + b);
          if (input.data[idx] > best) {
            best = input.data[idx];
            bestIdx = idx;
          }
        }
      }
      out[i * ow + j] = best;
      argmax[i * ow + j] = bestIdx;
    }
  }
  const result = new Tensor(out, [oh, ow], input.requires_grad);
  result._op = 'max_pool2d';
  result._prev = [input];
  result._backward = () => {
    if (!result.grad || !input.requires_grad) return;
    const gIn = new Float64Array(H * W);
    for (let o = 0; o < oh * ow; o++) gIn[argmax[o]] += result.grad[o];
    input.accumGrad(gIn);
  };
  return result;
}

/** Mean-squared-error loss between predictions and targets. */
export function mse_loss(pred: Tensor, target: Tensor): Tensor {
  const diff = sub(pred, target);
  const sq = mul(diff, diff);
  return mean(sq);
}

/** Add a scalar to every element (autograd-aware). */
export function addScalar(a: Tensor, s: number): Tensor {
  return unary(a, (x) => x + s, () => 1, `add(${s})`);
}

/** Multiply every element by a scalar (autograd-aware). */
export function mulScalar(a: Tensor, s: number): Tensor {
  return unary(a, (x) => x * s, () => s, `mul(${s})`);
}
