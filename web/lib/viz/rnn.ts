// Pure vanilla-RNN logic for the Visualize → RNN demo. Kept DOM-free so the
// recurrence can be unit-tested. A tiny cell: 1 input → H hidden (tanh) → 1 output.

export const H = 4;

export interface RnnWeights {
  Wxh: number[]; // (1,H)
  Whh: number[]; // (H,H) row-major
  bh: number[];  // (H,)
  Why: number[]; // (H,1) == (H,)
  by: number;
}

export interface RnnStep {
  t: number;
  x: number;
  h: number[];
  y: number;
}

/** One recurrent step: h_t = tanh(x·Wxh + h_{t-1}·Whh + b_h); y_t = h_t·Why + b_y. */
export function rnnStep(x: number, hPrev: number[], w: RnnWeights): { h: number[]; y: number } {
  const h = new Array(H).fill(0);
  for (let j = 0; j < H; j++) {
    let pre = x * w.Wxh[j] + w.bh[j];
    for (let k = 0; k < H; k++) pre += hPrev[k] * w.Whh[k * H + j];
    h[j] = Math.tanh(pre);
  }
  let y = w.by;
  for (let j = 0; j < H; j++) y += h[j] * w.Why[j];
  return { h, y };
}

/** Unroll the cell over a sequence, starting from a zero hidden state. */
export function unroll(seq: number[], w: RnnWeights): RnnStep[] {
  let h = new Array(H).fill(0);
  const out: RnnStep[] = [];
  for (let t = 0; t < seq.length; t++) {
    const r = rnnStep(seq[t], h, w);
    h = r.h;
    out.push({ t, x: seq[t], h: r.h, y: r.y });
  }
  return out;
}

// Deterministic seeded weights (pure PRNG — safe at module load / SSR).
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRnnWeights(seed: number): RnnWeights {
  const r = mulberry32(seed);
  const arr = (n: number, scale = 1) =>
    Array.from({ length: n }, () => +((r() * 2 - 1) * scale).toFixed(2));
  return {
    Wxh: arr(H),
    Whh: arr(H * H, 0.7),
    bh: arr(H, 0.3),
    Why: arr(H),
    by: 0,
  };
}

export const SEQUENCES: { id: string; label: string; seq: number[] }[] = [
  {
    id: 'sine',
    label: 'sine',
    seq: Array.from({ length: 12 }, (_, t) => +Math.sin(t * 0.7).toFixed(2)),
  },
  {
    id: 'step',
    label: 'step',
    seq: Array.from({ length: 12 }, (_, t) => (t < 4 ? 0 : 1)),
  },
  {
    id: 'impulse',
    label: 'impulse',
    seq: Array.from({ length: 12 }, (_, t) => (t === 2 ? 1 : 0)),
  },
];
