import { describe, it, expect } from 'vitest';
import {
  qSample,
  makeSchedule,
  mixtureScore,
  targetMeans,
  sampleTarget,
  TARGET_SIGMA,
} from '../lib/viz/diffusion';

describe('Diffusion', () => {
  it('qSample returns the clean point at ᾱ=1 and pure noise at ᾱ=0', () => {
    const x0 = { x: 2, y: -1 };
    const eps = { x: 0.5, y: 0.3 };
    expect(qSample(x0, 1, eps)).toEqual({ x: 2, y: -1 });
    const noisy = qSample(x0, 0, eps);
    expect(noisy.x).toBeCloseTo(0.5, 9);
    expect(noisy.y).toBeCloseTo(0.3, 9);
  });

  it('schedule starts at 1 and decreases monotonically', () => {
    const s = makeSchedule(40);
    expect(s.abar[0]).toBe(1);
    expect(s.abar.length).toBe(41);
    expect(s.abar[40]).toBeLessThan(s.abar[1]);
  });

  it('mixture score points toward the nearest mode', () => {
    const means = targetMeans('two'); // modes at x = ±1.4
    expect(mixtureScore({ x: -1.0, y: 0 }, means, TARGET_SIGMA).x).toBeLessThan(0);
    expect(mixtureScore({ x: 1.0, y: 0 }, means, TARGET_SIGMA).x).toBeGreaterThan(0);
  });

  it('target sampling is deterministic for a fixed seed', () => {
    expect(sampleTarget('ring', 20, 7)).toEqual(sampleTarget('ring', 20, 7));
  });
});
