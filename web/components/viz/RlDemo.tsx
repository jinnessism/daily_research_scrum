'use client';

import { useEffect, useRef, useState } from 'react';
import {
  newQ,
  step as envStep,
  epsGreedy,
  qUpdate,
  argmaxQ,
  stateValues,
  mulberry32,
  trainEpisodes,
  toRC,
  isWall,
  isTerminal,
  START,
  GOAL,
  PIT,
  GW,
  GH,
  N_STATES,
  type Params,
} from '@/lib/viz/gridworld';

const CELL = 58;
const ARROWS = ['↑', '→', '↓', '←'];

function valColor(v: number, max: number): string {
  if (max <= 1e-6) return 'rgba(255,255,255,0.03)';
  const t = Math.max(-1, Math.min(1, v / max));
  return t >= 0 ? `rgba(63,185,80,${0.08 + 0.5 * t})` : `rgba(248,81,73,${0.08 + 0.5 * -t})`;
}

export default function RlDemo() {
  const qRef = useRef(newQ());
  const rngRef = useRef(mulberry32(42));
  const [params, setParams] = useState<Params>({ alpha: 0.5, gamma: 0.95, eps: 0.2 });
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const [s, setS] = useState(START);
  const sRef = useRef(START);
  sRef.current = s;
  const [episode, setEpisode] = useState(0);
  const [lastReturn, setLastReturn] = useState<number | null>(null);
  const [, setVersion] = useState(0);
  const epReward = useRef(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const doStep = () => {
    const Q = qRef.current;
    const cur = sRef.current;
    const a = epsGreedy(Q, cur, paramsRef.current.eps, rngRef.current);
    const { next, reward, done } = envStep(cur, a);
    qUpdate(Q, cur, a, reward, next, done, paramsRef.current);
    epReward.current += reward;
    if (done) {
      setLastReturn(+epReward.current.toFixed(2));
      epReward.current = 0;
      setEpisode((e) => e + 1);
      setS(START);
    } else {
      setS(next);
    }
    setVersion((v) => v + 1);
  };

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(doStep, 140);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  const trainBatch = (n: number) => {
    const last = trainEpisodes(qRef.current, n, paramsRef.current, rngRef.current);
    setLastReturn(+last.toFixed(2));
    setEpisode((e) => e + n);
    setS(START);
    epReward.current = 0;
    setVersion((v) => v + 1);
  };

  const reset = () => {
    setPlaying(false);
    qRef.current = newQ();
    rngRef.current = mulberry32(42);
    epReward.current = 0;
    setS(START);
    setEpisode(0);
    setLastReturn(null);
    setVersion((v) => v + 1);
  };

  const Q = qRef.current;
  const values = stateValues(Q);
  const maxAbs = Math.max(0.01, ...values.map(Math.abs));
  const polRng = mulberry32(7); // deterministic tie-break for arrow display

  return (
    <div>
      <p className="mb-3 text-sm text-white/60">
        Tabular <span className="text-torch-light">Q-learning</span> on a gridworld. The
        agent (blue) explores ε-greedily and updates{' '}
        <code className="font-mono">Q(s,a) ← Q + α[r + γ·maxₐ Q(s′,·) − Q(s,a)]</code>.
        Cell shading = state value <code className="font-mono">V(s)=maxₐ Q</code>; arrows
        = greedy policy.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setPlaying((p) => !p)} className="rounded-md bg-torch px-4 py-1.5 text-sm font-semibold text-white hover:bg-torch-dark">
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={doStep} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Step</button>
        <button onClick={() => trainBatch(50)} className="rounded-md border border-torch/40 px-3 py-1.5 text-sm text-torch-light hover:bg-torch/10">Train 50 episodes</button>
        <button onClick={reset} className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5">Reset</button>
      </div>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
        {([['eps', 'ε (explore)', 0, 1, 0.05], ['alpha', 'α (rate)', 0.05, 1, 0.05], ['gamma', 'γ (discount)', 0.5, 0.99, 0.01]] as const).map(([k, label, min, max, stepv]) => (
          <label key={k} className="flex items-center gap-2 font-mono">
            {label}
            <input type="range" min={min} max={max} step={stepv} value={params[k]}
              onChange={(e) => setParams((p) => ({ ...p, [k]: parseFloat(e.target.value) }))} />
            <span className="w-10 text-white/80">{params[k]}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black/40">
          <svg width={GW * CELL} height={GH * CELL} className="block">
            {Array.from({ length: N_STATES }).map((_, st) => {
              const [row, col] = toRC(st);
              const x = col * CELL;
              const y = row * CELL;
              const wall = isWall(st);
              const goal = st === GOAL;
              const pit = st === PIT;
              const fill = wall
                ? 'rgba(255,255,255,0.1)'
                : goal
                  ? 'rgba(63,185,80,0.55)'
                  : pit
                    ? 'rgba(248,81,73,0.55)'
                    : valColor(values[st], maxAbs);
              return (
                <g key={st}>
                  <rect x={x + 1} y={y + 1} width={CELL - 2} height={CELL - 2} rx={4} fill={fill} stroke="rgba(255,255,255,0.08)" />
                  {goal && <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill="#fff">+1</text>}
                  {pit && <text x={x + CELL / 2} y={y + CELL / 2 + 4} textAnchor="middle" fontSize={13} fontFamily="monospace" fill="#fff">−1</text>}
                  {!wall && !goal && !pit && (
                    <text x={x + CELL / 2} y={y + CELL / 2 + 5} textAnchor="middle" fontSize={15} fill="rgba(255,255,255,0.5)">
                      {ARROWS[argmaxQ(Q, st, polRng)]}
                    </text>
                  )}
                </g>
              );
            })}
            {/* agent */}
            {(() => {
              const [row, col] = toRC(s);
              return <circle cx={col * CELL + CELL / 2} cy={row * CELL + CELL / 2} r={11} fill="rgba(56,139,253,0.9)" stroke="#fff" strokeWidth={1.5} />;
            })()}
          </svg>
        </div>

        <div className="font-mono text-sm text-white/70">
          <div>episodes: <span className="text-torch-light">{episode}</span></div>
          <div>last return: <span className="text-green-400">{lastReturn === null ? '—' : lastReturn}</span></div>
          <div className="mt-2 text-xs text-white/40">
            Press <span className="text-white/70">Train 50 episodes</span> a few times and
            watch the values flow out from the goal and the arrows line up into a policy.
          </div>
        </div>
      </div>
    </div>
  );
}
