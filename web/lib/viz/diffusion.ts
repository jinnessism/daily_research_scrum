// Pure logic for the Visualize → Diffusion demo. 2D toy. Targets are Gaussian
// mixtures, so the score ∇log p(x) is analytic and the reverse (sampling) process
// needs no trained model. DOM-free for unit testing.

export interface Vec2 {
  x: number;
  y: number;
}

// Deterministic PRNG + standard normal (Box–Muller).
export function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeRandn(seed: number): () => number {
  const r = mulberry32(seed);
  return () => {
    const u1 = Math.max(r(), 1e-12);
    const u2 = r();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
}

export type TargetKind = 'two' | 'ring' | 'grid';
export const TARGET_SIGMA = 0.28;

/** Mode centers for each Gaussian-mixture target (unit variance ~ TARGET_SIGMA). */
export function targetMeans(kind: TargetKind): Vec2[] {
  if (kind === 'two') return [{ x: -1.4, y: 0 }, { x: 1.4, y: 0 }];
  if (kind === 'grid') {
    const out: Vec2[] = [];
    for (const gx of [-1.4, 0, 1.4]) for (const gy of [-1.4, 0, 1.4]) out.push({ x: gx, y: gy });
    return out;
  }
  // ring of 8 modes
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI;
    return { x: 1.7 * Math.cos(a), y: 1.7 * Math.sin(a) };
  });
}

/** Draw n samples from the target mixture (deterministic given seed). */
export function sampleTarget(kind: TargetKind, n: number, seed: number): Vec2[] {
  const means = targetMeans(kind);
  const r = mulberry32(seed);
  const randn = makeRandn(seed ^ 0x9e3779b9);
  return Array.from({ length: n }, () => {
    const m = means[Math.floor(r() * means.length)];
    return { x: m.x + randn() * TARGET_SIGMA, y: m.y + randn() * TARGET_SIGMA };
  });
}

export interface Schedule {
  T: number;
  abar: number[]; // cumulative product of alphas, length T+1 (abar[0]=1)
}

/** Linear beta schedule → ᾱ_t (cumulative product of 1−β). */
export function makeSchedule(T = 40, beta0 = 0.001, betaT = 0.06): Schedule {
  const abar = [1];
  let prod = 1;
  for (let t = 1; t <= T; t++) {
    const beta = beta0 + ((betaT - beta0) * (t - 1)) / (T - 1);
    prod *= 1 - beta;
    abar.push(prod);
  }
  return { T, abar };
}

/** Forward noising: x_t = √ᾱ_t · x0 + √(1−ᾱ_t) · ε. */
export function qSample(x0: Vec2, abarT: number, eps: Vec2): Vec2 {
  const a = Math.sqrt(abarT);
  const b = Math.sqrt(1 - abarT);
  return { x: a * x0.x + b * eps.x, y: a * x0.y + b * eps.y };
}

/**
 * Score ∇log p(x) of an equal-weight Gaussian mixture with the given means and
 * isotropic variance σ². Used to drive reverse (annealed Langevin) sampling.
 */
export function mixtureScore(p: Vec2, means: Vec2[], sigma: number): Vec2 {
  const s2 = sigma * sigma;
  // responsibilities via softmax over −‖x−μ‖²/(2σ²)
  const logits = means.map((m) => {
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    return -(dx * dx + dy * dy) / (2 * s2);
  });
  const mx = Math.max(...logits);
  const ws = logits.map((l) => Math.exp(l - mx));
  const z = ws.reduce((a, b) => a + b, 0) || 1;
  let gx = 0;
  let gy = 0;
  means.forEach((m, i) => {
    const r = ws[i] / z;
    gx += (r * (m.x - p.x)) / s2;
    gy += (r * (m.y - p.y)) / s2;
  });
  return { x: gx, y: gy };
}

/** One annealed-Langevin step toward the target: x ← x + (η/2)∇log p + √η z. */
export function langevinStep(p: Vec2, means: Vec2[], sigma: number, eta: number, randn: () => number): Vec2 {
  const g = mixtureScore(p, means, sigma);
  return {
    x: p.x + 0.5 * eta * g.x + Math.sqrt(eta) * randn(),
    y: p.y + 0.5 * eta * g.y + Math.sqrt(eta) * randn(),
  };
}
