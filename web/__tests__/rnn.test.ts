import { describe, it, expect } from 'vitest';
import { rnnStep, unroll, H, RnnWeights } from '../lib/viz/rnn';

const zeros = (n: number) => new Array(n).fill(0);

describe('RNN cell', () => {
  it('maps input through a single unit and bounds h in (-1, 1)', () => {
    const W: RnnWeights = {
      Wxh: [1, 0, 0, 0],
      Whh: zeros(H * H),
      bh: zeros(H),
      Why: [1, 0, 0, 0],
      by: 0,
    };
    const r = rnnStep(0.5, zeros(H), W);
    expect(r.h[0]).toBeCloseTo(Math.tanh(0.5), 6);
    expect(r.h[1]).toBe(0);
    expect(r.y).toBeCloseTo(Math.tanh(0.5), 6);
  });

  it('carries the previous hidden state through the recurrent weights', () => {
    const Whh = zeros(H * H);
    Whh[0] = 1; // h0 feeds h0
    const W: RnnWeights = { Wxh: zeros(H), Whh, bh: zeros(H), Why: zeros(H), by: 0 };
    const r = rnnStep(0, [0.5, 0, 0, 0], W);
    expect(r.h[0]).toBeCloseTo(Math.tanh(0.5), 6);
  });

  it('unroll equals chaining rnnStep by hand', () => {
    const W: RnnWeights = {
      Wxh: [0.6, -0.2, 0.3, 0.1],
      Whh: zeros(H * H).map((_, i) => (i % 5 === 0 ? 0.2 : 0)),
      bh: [0.1, 0, -0.1, 0],
      Why: [0.5, 0.5, 0, 0],
      by: 0,
    };
    const seq = [0.5, -0.3, 0.8];
    const steps = unroll(seq, W);
    let h = zeros(H);
    const manual = seq.map((x) => {
      const s = rnnStep(x, h, W);
      h = s.h;
      return s.h;
    });
    expect(steps.map((s) => s.h)).toEqual(manual);
  });
});
