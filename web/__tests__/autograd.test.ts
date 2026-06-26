import { describe, it, expect } from 'vitest';
import { tensor } from '../lib/minitorch/tensor';
import { add, mul, sub, matmul, sigmoid, sum, mse_loss } from '../lib/minitorch/ops';

const arr = (x: Float64Array | null) => Array.from(x ?? []);

describe('Autograd', () => {
  it('d/da sum(a*a) = 2a', () => {
    const a = tensor([1, 2, 3], true);
    const loss = sum(mul(a, a));
    loss.backward();
    expect(arr(a.grad)).toEqual([2, 4, 6]);
  });

  it('product rule: z = sum(a*b)', () => {
    const a = tensor([1, 2, 3], true);
    const b = tensor([4, 5, 6], true);
    const z = sum(mul(a, b));
    z.backward();
    expect(arr(a.grad)).toEqual([4, 5, 6]); // dz/da = b
    expect(arr(b.grad)).toEqual([1, 2, 3]); // dz/db = a
  });

  it('matmul gradients', () => {
    const a = tensor([[1, 2], [3, 4]], true); // (2,2)
    const b = tensor([[1, 0], [0, 1]], true); // identity
    const loss = sum(matmul(a, b));
    loss.backward();
    // grad_a[i,p] = sum_j b[p,j];  grad_b[p,j] = sum_i a[i,p]
    expect(arr(a.grad)).toEqual([1, 1, 1, 1]);
    expect(arr(b.grad)).toEqual([4, 4, 6, 6]);
  });

  it('sigmoid gradient at 0 is 0.25', () => {
    const x = tensor([0], true);
    const y = sum(sigmoid(x));
    y.backward();
    expect(x.grad![0]).toBeCloseTo(0.25, 6);
  });

  it('broadcast accumulates gradient over the broadcast axis', () => {
    const a = tensor([[1, 2, 3], [4, 5, 6]], true); // (2,3)
    const bias = tensor([1, 1, 1], true); // (3,)
    const loss = sum(add(a, bias));
    loss.backward();
    expect(arr(a.grad)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(arr(bias.grad)).toEqual([2, 2, 2]); // summed over the 2 rows
  });

  it('mse_loss gradient = 2(pred-target)/N', () => {
    const pred = tensor([2, 4], true);
    const target = tensor([1, 1]);
    const loss = mse_loss(pred, target);
    loss.backward();
    // 2*(pred-target)/N = 2*[1,3]/2 = [1,3]
    expect(arr(pred.grad)).toEqual([1, 3]);
  });

  it('one gradient-descent step decreases the loss', () => {
    // Fit y = 2x with a single weight.
    const x = tensor([[1], [2], [3]]); // (3,1)
    const y = tensor([[2], [4], [6]]); // (3,1)
    let w = tensor([[0]], true); // (1,1)
    const before = mse_loss(matmul(x, w), y).data[0];
    const loss = mse_loss(matmul(x, w), y);
    loss.backward();
    const lr = 0.05;
    const newW = w.data[0] - lr * w.grad![0];
    w = tensor([[newW]], true);
    const after = mse_loss(matmul(x, w), y).data[0];
    expect(after).toBeLessThan(before);
  });
});
