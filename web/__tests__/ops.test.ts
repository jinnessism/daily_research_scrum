import { describe, it, expect } from 'vitest';
import { tensor } from '../lib/minitorch/tensor';
import {
  add,
  mul,
  sub,
  div,
  matmul,
  relu,
  sigmoid,
  sum,
  mean,
  conv2d,
  maxPool2d,
} from '../lib/minitorch/ops';

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

describe('Conv ops', () => {
  const image = () =>
    tensor([[1, 2, 3], [4, 5, 6], [7, 8, 9]], true);
  const kern = () => tensor([[1, 0], [0, -1]], true); // diagonal difference

  it('conv2d forward (valid, stride 1)', () => {
    const y = conv2d(image(), kern());
    expect(Array.from(y.shape)).toEqual([2, 2]);
    expect(Array.from(y.data)).toEqual([-4, -4, -4, -4]);
  });

  it('conv2d backward (kernel and input gradients)', () => {
    const x = image();
    const k = kern();
    sum(conv2d(x, k)).backward(); // upstream grad = 1 everywhere
    expect(Array.from(k.grad!)).toEqual([12, 16, 24, 28]);
    expect(Array.from(x.grad!)).toEqual([1, 1, 0, 1, 0, -1, 0, -1, -1]);
  });

  it('max_pool2d forward picks the window maxima', () => {
    const x = tensor([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ]);
    const y = maxPool2d(x, 2);
    expect(Array.from(y.shape)).toEqual([2, 2]);
    expect(Array.from(y.data)).toEqual([6, 8, 14, 16]);
  });

  it('max_pool2d backward routes gradient only to the argmax', () => {
    const x = tensor([
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
      [13, 14, 15, 16],
    ], true);
    sum(maxPool2d(x, 2)).backward();
    expect(Array.from(x.grad!)).toEqual([
      0, 0, 0, 0,
      0, 1, 0, 1,
      0, 0, 0, 0,
      0, 1, 0, 1,
    ]);
  });
});
