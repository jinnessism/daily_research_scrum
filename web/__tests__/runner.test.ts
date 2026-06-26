import { describe, it, expect } from 'vitest';
import { runScript } from '../lib/minitorch/runner';

describe('Script runner', () => {
  it('runs a basic tensor program', () => {
    const r = runScript(`
import torch
a = torch.tensor([[1, 2], [3, 4]])
b = torch.tensor([[10, 20], [30, 40]])
c = a + b
print(c)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('tensor([[11., 22.], [33., 44.]])');
  });

  it('computes gradients via .backward()', () => {
    const r = runScript(`
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x * x).sum()
y.backward()
print(x.grad)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('tensor([2., 4., 6.])');
  });

  it('supports matmul with @', () => {
    const r = runScript(`
a = torch.tensor([[1, 2], [3, 4]])
b = torch.tensor([[1, 0], [0, 1]])
print(a @ b)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('tensor([[1., 2.], [3., 4.]])');
  });

  it('echoes the final bare expression', () => {
    const r = runScript(`torch.tensor([1, 2, 3]).sum()`);
    expect(r.error).toBeNull();
    expect(r.output.trim()).toBe('tensor(6.)');
  });

  it('returns a friendly error for undefined names', () => {
    const r = runScript(`print(undefined_var)`);
    expect(r.error).toContain('not defined');
    expect(r.error).toContain('Line 1');
  });

  it('supports string literals in print', () => {
    const r = runScript(`
a = torch.tensor([1, 2])
print("a + b =", a + a)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('a + b = tensor([2., 4.])');
  });

  it('runs a multi-line tensor literal (the tiny neural net lesson)', () => {
    const r = runScript(`
import torch

x = torch.tensor([[0.5, -1.0]])           # 1 sample, 2 features
W1 = torch.tensor([[0.2, 0.8, -0.5],
                   [1.0, -0.3, 0.4]])     # (2, 3)
b1 = torch.tensor([0.1, 0.0, -0.2])

h = (x @ W1 + b1).relu()
print(h)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('tensor([[0., 0.7, 0.]])');
  });

  it('backpropagates through .T (transpose)', () => {
    const r = runScript(`
x = torch.tensor([[1.0, 2.0], [3.0, 4.0]], requires_grad=True)
y = (x.T * 2).sum()
y.backward()
print(x.grad)
`);
    expect(r.error).toBeNull();
    expect(r.output).toContain('tensor([[2., 2.], [2., 2.]])');
  });

  it('reports the named tensors after a run', () => {
    const r = runScript(`
a = torch.ones([2, 2])
b = a + 1
`);
    expect(r.error).toBeNull();
    expect(r.tensors.map((t) => t.name).sort()).toEqual(['a', 'b']);
  });
});
