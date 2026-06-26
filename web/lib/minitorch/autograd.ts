// Helpers for inspecting the autograd graph — used both by backward() (in
// tensor.ts) and by the Visualize page to draw the computation DAG.

import { Tensor } from './tensor';

export interface GraphNode {
  id: number;
  op: string;
  shape: number[];
  value: number[]; // flattened data (kept small for display)
  grad: number[] | null;
  inputs: number[]; // ids of predecessor nodes
  isLeaf: boolean;
  requiresGrad: boolean;
}

/** Topologically order every tensor reachable from `root` (inputs first). */
export function topoOrder(root: Tensor): Tensor[] {
  const topo: Tensor[] = [];
  const visited = new Set<Tensor>();
  const build = (t: Tensor) => {
    if (visited.has(t)) return;
    visited.add(t);
    for (const p of t._prev) build(p);
    topo.push(t);
  };
  build(root);
  return topo;
}

/**
 * Snapshot the computation graph rooted at `root` into plain serializable
 * nodes. Call after backward() to include gradients.
 */
export function graphSnapshot(root: Tensor): GraphNode[] {
  const order = topoOrder(root);
  const ids = new Map<Tensor, number>();
  order.forEach((t, i) => ids.set(t, i));

  return order.map((t, i) => ({
    id: i,
    op: t._op || (t._prev.length === 0 ? 'leaf' : ''),
    shape: t.shape.slice(),
    value: Array.from(t.data),
    grad: t.grad ? Array.from(t.grad) : null,
    inputs: t._prev.map((p) => ids.get(p)!),
    isLeaf: t._prev.length === 0,
    requiresGrad: t.requires_grad,
  }));
}
