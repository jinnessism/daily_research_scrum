import { describe, it, expect } from 'vitest';
import { tensor } from '../lib/minitorch/tensor';
import { add, mul, sub, div, matmul, relu, sigmoid, sum, mean } from '../lib/minitorch/ops';

describe('Forward ops', () => {
  it('elementwise add', () => {
    const a = tensor([1, 2, 3]);
    const b = tensor([10, 20, 30]);
    expect(Array.from(add(a, b).data)).toEqual([11, 22, 33]);
  });

  it('broadcasts a scalar over a matrix', () => {
    const a = tensor([[1, 2], [3, 4]]);
    const s = tensor(10);
    expect(Array.from(add(a, s).data)).toEqual([11, 12, 13, 14]);
  });

  it('broadcasts a row vector over a matrix', () => {
    const a = tensor([[1, 2, 3], [4, 5, 6]]);
    const row = tensor([10, 20, 30]);
    expect(Array.from(add(a, row).data)).toEqual([11, 22, 33, 14, 25, 36]);
  });

  it('matmul', () => {
    const a = tensor([[1, 2], [3, 4]]);
    const b = tensor([[5, 6], [7, 8]]);
    // [[1*5+2*7, 1*6+2*8],[3*5+4*7,3*6+4*8]] = [[19,22],[43,50]]
    expect(Array.from(matmul(a, b).data)).toEqual([19, 22, 43, 50]);
  });

  it('relu', () => {
    expect(Array.from(relu(tensor([-1, 0, 2])).data)).toEqual([0, 0, 2]);
  });

  it('sigmoid(0) = 0.5', () => {
    expect(sigmoid(tensor(0)).data[0]).toBeCloseTo(0.5, 6);
  });

  it('sum and mean', () => {
    expect(sum(tensor([1, 2, 3, 4])).data[0]).toBe(10);
    expect(mean(tensor([1, 2, 3, 4])).data[0]).toBe(2.5);
  });

  it('sub and div', () => {
    expect(Array.from(sub(tensor([5, 7]), tensor([2, 3])).data)).toEqual([3, 4]);
    expect(Array.from(div(tensor([6, 8]), tensor([2, 4])).data)).toEqual([3, 2]);
  });
});
