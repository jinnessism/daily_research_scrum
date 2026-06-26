// Public surface of the educational tensor engine.
export { Tensor, tensor, zeros, ones, full, arange, randn, rand } from './tensor';
export * from './ops';
export { topoOrder, graphSnapshot } from './autograd';
export type { GraphNode } from './autograd';
export { runScript } from './runner';
export type { RunResult } from './runner';
