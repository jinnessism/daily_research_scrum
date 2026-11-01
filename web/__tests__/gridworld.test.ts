import { describe, it, expect } from 'vitest';
import {
  newQ,
  qUpdate,
  step,
  rc,
  START,
  GOAL,
  argmaxQ,
  trainEpisodes,
  mulberry32,
} from '../lib/viz/gridworld';

describe('Gridworld Q-learning', () => {
  it('terminal update equals the immediate reward scaled by alpha', () => {
    const Q = newQ();
    const v = qUpdate(Q, 0, 1, 1, GOAL, true, { alpha: 0.5, gamma: 0.9, eps: 0 });
    expect(v).toBe(0.5); // 0 + 0.5*(1 + 0 - 0)
  });

  it('non-terminal update uses the discounted bootstrap', () => {
    const Q = newQ();
    Q[6 * 4 + 2] = 2; // maxQ(s'=6) = 2
    const v = qUpdate(Q, 0, 0, -0.02, 6, false, { alpha: 1, gamma: 0.9, eps: 0 });
    expect(v).toBeCloseTo(-0.02 + 0.9 * 2, 9); // 1.78
  });

  it('environment blocks moves into walls', () => {
    // rc(2,2) is a wall; moving left from rc(2,3) stays put
    expect(step(rc(2, 3), 3).next).toBe(rc(2, 3));
  });

  it('learns a greedy path from start to the goal', () => {
    const Q = newQ();
    trainEpisodes(Q, 2000, { alpha: 0.5, gamma: 0.95, eps: 0.2 }, mulberry32(1));
    const rng = mulberry32(999);
    let s = START;
    let reached = false;
    for (let i = 0; i < 50; i++) {
      const r = step(s, argmaxQ(Q, s, rng));
      s = r.next;
      if (s === GOAL) {
        reached = true;
        break;
      }
      if (r.done) break; // fell in the pit
    }
    expect(reached).toBe(true);
  });
});
