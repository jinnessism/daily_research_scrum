import { describe, it, expect } from 'vitest';
import { runMlp, Weights } from '../lib/viz/mlpBackprop';

// Controlled weights (selector-like) so the whole forward/backward is hand-checkable.
const W: Weights = {
  W1: [1, 0, 0, 0, 1, 0], b1: [0, 0, 0], // (2,3): picks x0->h0, x1->h1
  W2: [1, 0, 0, 1, 0, 0], b2: [0, 0],     // (3,2): h0->o0, h1->o1
  W3: [1, 1], b3: [0],                     // (2,1): sum
};

describe('MLP backprop demo builder', () => {
  const r = runMlp([1, 1], 0, W);

  it('forward pass matches the hand computation', () => {
    expect(r.neurons[0].a).toEqual([1, 1, 0]); // a1 = relu([1,1,0])
    expect(r.neurons[1].a).toEqual([1, 1]);     // a2 = relu([1,1])
    expect(r.output).toBe(2);                   // z3 = 1 + 1
    expect(r.loss).toBe(4);                     // (2 - 0)^2
  });

  it('backward pass fills neuron and weight gradients via the chain rule', () => {
    expect(r.neurons[2].dz).toEqual([4]);          // dL/dz3 = 2*(2-0)/1
    expect(r.weights[2].dW).toEqual([4, 4]);       // dL/dW3 = a2^T * 4
    expect(r.weights[1].dW).toEqual([4, 4, 4, 4, 0, 0]); // dL/dW2 (a1[2]=0 zeroes its row)
    expect(r.weights[0].dW).toEqual([4, 4, 0, 4, 4, 0]); // dL/dW1 (relu'(z1[2]=0)=0)
    expect(r.neurons[0].dz).toEqual([4, 4, 0]);    // dL/dz1, gated by relu'
  });
});
