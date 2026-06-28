// Pure builder for the Backprop (MLP) visualization. Kept separate from the
// React component so the numeric forward/backward results can be unit-tested
// without a DOM. A fixed 2 → 3 → 2 → 1 network run on the real engine.

import { tensor, Tensor } from '../minitorch/tensor';
import { add, matmul, relu, mse_loss } from '../minitorch/ops';

export interface Weights {
  W1: number[]; b1: number[]; // (2,3), (3,)
  W2: number[]; b2: number[]; // (3,2), (2,)
  W3: number[]; b3: number[]; // (2,1), (1,)
}

export interface WeightLayer {
  rows: number;
  cols: number;
  W: number[];
  b: number[];
  dW: number[];
  db: number[];
}
export interface NeuronLayer {
  z: number[];
  a: number[];
  dz: number[];
  da: number[];
}
export interface MlpResult {
  x: number[];
  neurons: NeuronLayer[]; // hidden1, hidden2, output
  weights: WeightLayer[]; // W1, W2, W3
  output: number;
  target: number;
  loss: number;
}

export function to2D(flat: number[], rows: number, cols: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < rows; r++) out.push(flat.slice(r * cols, r * cols + cols));
  return out;
}

export function runMlp(inputs: number[], target: number, w: Weights): MlpResult {
  const x = tensor([inputs]); // (1,2)
  const W1 = tensor(to2D(w.W1, 2, 3), true);
  const b1 = tensor(w.b1, true);
  const W2 = tensor(to2D(w.W2, 3, 2), true);
  const b2 = tensor(w.b2, true);
  const W3 = tensor(to2D(w.W3, 2, 1), true);
  const b3 = tensor(w.b3, true);

  const z1 = add(matmul(x, W1), b1);
  const a1 = relu(z1);
  const z2 = add(matmul(a1, W2), b2);
  const a2 = relu(z2);
  const z3 = add(matmul(a2, W3), b3); // linear output (1,1)
  const loss = mse_loss(z3, tensor([[target]]));
  loss.backward();

  const d = (t: Tensor) => Array.from(t.data);
  const g = (t: Tensor) => Array.from(t.grad ?? new Float64Array(t.size));

  return {
    x: inputs.slice(),
    neurons: [
      { z: d(z1), a: d(a1), dz: g(z1), da: g(a1) },
      { z: d(z2), a: d(a2), dz: g(z2), da: g(a2) },
      { z: d(z3), a: d(z3), dz: g(z3), da: g(z3) },
    ],
    weights: [
      { rows: 2, cols: 3, W: d(W1), b: d(b1), dW: g(W1), db: g(b1) },
      { rows: 3, cols: 2, W: d(W2), b: d(b2), dW: g(W2), db: g(b2) },
      { rows: 2, cols: 1, W: d(W3), b: d(b3), dW: g(W3), db: g(b3) },
    ],
    output: d(z3)[0],
    target,
    loss: d(loss)[0],
  };
}

// Deterministic seeded weights (mulberry32 — pure, so safe at module load / SSR).
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomWeights(seed: number): Weights {
  const r = mulberry32(seed);
  const arr = (n: number) => Array.from({ length: n }, () => +(r() * 2 - 1).toFixed(2));
  return { W1: arr(6), b1: arr(3), W2: arr(6), b2: arr(2), W3: arr(2), b3: arr(1) };
}
