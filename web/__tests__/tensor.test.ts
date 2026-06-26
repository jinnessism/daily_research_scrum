import { describe, it, expect } from 'vitest';
import { tensor, zeros, ones, arange } from '../lib/minitorch/tensor';
import { numel } from '../lib/minitorch/shape';

describe('Tensor creation', () => {
  it('infers shape from nested arrays', () => {
    const t = tensor([[1, 2, 3], [4, 5, 6]]);
    expect(t.shape).toEqual([2, 3]);
    expect(t.size).toBe(6);
    expect(Array.from(t.data)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('creates scalars', () => {
    const t = tensor(3.5);
    expect(t.shape).toEqual([]);
    expect(t.data[0]).toBe(3.5);
  });

  it('zeros and ones', () => {
    expect(Array.from(zeros([2, 2]).data)).toEqual([0, 0, 0, 0]);
    expect(Array.from(ones([3]).data)).toEqual([1, 1, 1]);
  });

  it('arange', () => {
    expect(Array.from(arange(4).data)).toEqual([0, 1, 2, 3]);
  });

  it('toArray round-trips nested structure', () => {
    const t = tensor([[1, 2], [3, 4]]);
    expect(t.toArray()).toEqual([[1, 2], [3, 4]]);
  });

  it('numel', () => {
    expect(numel([2, 3, 4])).toBe(24);
  });
});
