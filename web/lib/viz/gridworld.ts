// Pure tabular Q-learning on a small gridworld for the Visualize → RL demo.
// DOM-free so the Bellman update and training can be unit-tested.

export const GW = 5;
export const GH = 5;
export const N_STATES = GW * GH;
export const N_ACTIONS = 4; // 0=up, 1=right, 2=down, 3=left
export const ACTION_DXY: [number, number][] = [
  [0, -1], // up
  [1, 0], // right
  [0, 1], // down
  [-1, 0], // left
];

// Fixed layout. Coordinates are (col, row); state = row*GW + col.
export const START = rc(4, 0);
export const GOAL = rc(0, 4);
export const PIT = rc(1, 3);
export const WALLS = new Set([rc(2, 2), rc(3, 2), rc(2, 1)]);
export const STEP_COST = -0.02;

export function rc(row: number, col: number): number {
  return row * GW + col;
}
export function toRC(s: number): [number, number] {
  return [Math.floor(s / GW), s % GW];
}
export function isWall(s: number): boolean {
  return WALLS.has(s);
}
export function isTerminal(s: number): boolean {
  return s === GOAL || s === PIT;
}

export interface StepResult {
  next: number;
  reward: number;
  done: boolean;
}

/** Environment dynamics: move if the target cell is on-grid and not a wall. */
export function step(s: number, a: number): StepResult {
  const [row, col] = toRC(s);
  const [dc, dr] = ACTION_DXY[a];
  let nr = row + dr;
  let nc = col + dc;
  if (nr < 0 || nr >= GH || nc < 0 || nc >= GW || isWall(rc(nr, nc))) {
    nr = row;
    nc = col;
  }
  const next = rc(nr, nc);
  const reward = next === GOAL ? 1 : next === PIT ? -1 : STEP_COST;
  return { next, reward, done: isTerminal(next) };
}

export function maxQ(Q: Float64Array, s: number): number {
  let m = -Infinity;
  for (let a = 0; a < N_ACTIONS; a++) m = Math.max(m, Q[s * N_ACTIONS + a]);
  return m;
}
export function argmaxQ(Q: Float64Array, s: number, rng: () => number): number {
  let best = -Infinity;
  const ties: number[] = [];
  for (let a = 0; a < N_ACTIONS; a++) {
    const v = Q[s * N_ACTIONS + a];
    if (v > best + 1e-9) {
      best = v;
      ties.length = 0;
      ties.push(a);
    } else if (Math.abs(v - best) <= 1e-9) {
      ties.push(a);
    }
  }
  return ties[Math.floor(rng() * ties.length)] ?? 0;
}

export function epsGreedy(Q: Float64Array, s: number, eps: number, rng: () => number): number {
  if (rng() < eps) return Math.floor(rng() * N_ACTIONS);
  return argmaxQ(Q, s, rng);
}

export interface Params {
  alpha: number;
  gamma: number;
  eps: number;
}

/** Q(s,a) ← Q + α[r + γ·maxₐ Q(s',·) − Q(s,a)]. Returns the new Q(s,a). */
export function qUpdate(
  Q: Float64Array,
  s: number,
  a: number,
  r: number,
  sNext: number,
  done: boolean,
  p: Params
): number {
  const i = s * N_ACTIONS + a;
  const target = r + (done ? 0 : p.gamma * maxQ(Q, sNext));
  Q[i] += p.alpha * (target - Q[i]);
  return Q[i];
}

export function newQ(): Float64Array {
  return new Float64Array(N_STATES * N_ACTIONS);
}

export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Run one episode from START, updating Q in place; returns total reward. */
export function runEpisode(Q: Float64Array, p: Params, rng: () => number, maxSteps = 60): number {
  let s = START;
  let total = 0;
  for (let i = 0; i < maxSteps; i++) {
    const a = epsGreedy(Q, s, p.eps, rng);
    const { next, reward, done } = step(s, a);
    qUpdate(Q, s, a, reward, next, done, p);
    total += reward;
    s = next;
    if (done) break;
  }
  return total;
}

export function trainEpisodes(Q: Float64Array, n: number, p: Params, rng: () => number): number {
  let last = 0;
  for (let i = 0; i < n; i++) last = runEpisode(Q, p, rng);
  return last;
}

export function stateValues(Q: Float64Array): number[] {
  return Array.from({ length: N_STATES }, (_, s) => (isTerminal(s) || isWall(s) ? 0 : maxQ(Q, s)));
}
export function greedyPolicy(Q: Float64Array, rng: () => number): number[] {
  return Array.from({ length: N_STATES }, (_, s) => argmaxQ(Q, s, rng));
}
