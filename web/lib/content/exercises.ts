// Fill-in-the-blank practice exercises + a result-based auto-grader. The grader
// runs the learner's code and the reference solution through the same engine and
// compares a named result tensor, so any correct solution passes (not just a
// string match). Exercises are one-shot kernels — the runner has no loops.

import { runScript } from '../minitorch/runner';

export interface Exercise {
  slug: string;
  title: string;
  topic: string;
  prompt: string; // markdown
  starter: string; // code with ____ blanks
  solution: string; // reference solution
  hint: string;
  target: string; // name of the result variable to grade
}

export interface GradeResult {
  ok: boolean;
  reason?: string;
}

/** Run learner + solution and compare the target tensor (shape + values, 1e-4). */
export function grade(ex: Exercise, code: string): GradeResult {
  const run = runScript(code);
  if (run.error) return { ok: false, reason: run.error };
  const got = run.tensors.find((t) => t.name === ex.target)?.tensor;
  if (!got) return { ok: false, reason: `Assign your result to \`${ex.target}\`.` };

  const sol = runScript(ex.solution);
  const want = sol.tensors.find((t) => t.name === ex.target)?.tensor;
  if (!want) return { ok: false, reason: 'internal: solution produced no result' };

  const gs = Array.from(got.shape);
  const ws = Array.from(want.shape);
  if (gs.length !== ws.length || gs.some((v, i) => v !== ws[i])) {
    return { ok: false, reason: `Result shape [${gs}] doesn't match the expected [${ws}].` };
  }
  for (let i = 0; i < want.data.length; i++) {
    if (Math.abs(got.data[i] - want.data[i]) > 1e-4) {
      return { ok: false, reason: 'The values don’t match the expected result yet — keep going.' };
    }
  }
  return { ok: true };
}

export const EXERCISES: Exercise[] = [
  {
    slug: 'broadcasting',
    title: 'Broadcast a bias',
    topic: 'Tensors',
    prompt: `Add the bias **row vector** to every row of the matrix \`a\` using
broadcasting. Fill in \`out\` so it has shape \`(2, 3)\`.`,
    starter: `import torch

a = torch.tensor([[1, 2, 3], [4, 5, 6]])
bias = torch.tensor([10, 20, 30])

out = ____
print(out)`,
    solution: `import torch
a = torch.tensor([[1, 2, 3], [4, 5, 6]])
bias = torch.tensor([10, 20, 30])
out = a + bias`,
    hint: 'A (2,3) tensor and a (3,) tensor broadcast — just add them.',
    target: 'out',
  },
  {
    slug: 'autograd',
    title: 'Compute a gradient',
    topic: 'Autograd',
    prompt: `Make \`y\` the sum of squares of \`x\`, then call \`.backward()\`. The
blank \`y\` must be a **scalar**. We read the gradient into \`g\` — it should equal
\`2·x\`.`,
    starter: `import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = ____
y.backward()

g = x.grad
print(g)`,
    solution: `import torch
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x * x).sum()
y.backward()
g = x.grad`,
    hint: 'Square elementwise, then reduce to a scalar with .sum().',
    target: 'g',
  },
  {
    slug: 'gradient-step',
    title: 'One gradient-descent step',
    topic: 'Training',
    prompt: `The loss and its gradient \`w.grad\` are already computed. Take **one
gradient-descent step**: move \`w\` opposite the gradient by learning rate \`lr\`
and store it in \`w_new\`.`,
    starter: `import torch

x = torch.tensor([[1.0], [2.0], [3.0]])
y = torch.tensor([[2.0], [4.0], [6.0]])
w = torch.tensor([[0.0]], requires_grad=True)
lr = 0.1

loss = ((x @ w - y) * (x @ w - y)).mean()
loss.backward()

w_new = ____
print(w_new)`,
    solution: `import torch
x = torch.tensor([[1.0], [2.0], [3.0]])
y = torch.tensor([[2.0], [4.0], [6.0]])
w = torch.tensor([[0.0]], requires_grad=True)
lr = 0.1
loss = ((x @ w - y) * (x @ w - y)).mean()
loss.backward()
w_new = w - lr * w.grad`,
    hint: 'w ← w − lr · ∇.  The gradient is w.grad.',
    target: 'w_new',
  },
  {
    slug: 'mlp-forward',
    title: 'A linear layer + ReLU',
    topic: 'Neural nets',
    prompt: `Compute one hidden layer: multiply the input by the weights, add the
bias, and apply ReLU. Store the activations in \`h\`.`,
    starter: `import torch

x  = torch.tensor([[0.5, -1.0]])
W1 = torch.tensor([[0.2, 0.8, -0.5],
                   [1.0, -0.3, 0.4]])
b1 = torch.tensor([0.1, 0.0, -0.2])

h = ____
print(h)`,
    solution: `import torch
x  = torch.tensor([[0.5, -1.0]])
W1 = torch.tensor([[0.2, 0.8, -0.5], [1.0, -0.3, 0.4]])
b1 = torch.tensor([0.1, 0.0, -0.2])
h = (x @ W1 + b1).relu()`,
    hint: 'h = (x @ W1 + b1).relu()',
    target: 'h',
  },
  {
    slug: 'mse-backward',
    title: 'MSE loss gradient',
    topic: 'Training',
    prompt: `Write the **mean-squared-error** between \`pred\` and \`target\` as a
scalar \`loss\`, call backward, and read \`pred.grad\` into \`g\`. It should equal
\`2·(pred − target) / N\`.`,
    starter: `import torch

pred   = torch.tensor([2.0, 4.0], requires_grad=True)
target = torch.tensor([1.0, 1.0])

loss = ____
loss.backward()

g = pred.grad
print(g)`,
    solution: `import torch
pred   = torch.tensor([2.0, 4.0], requires_grad=True)
target = torch.tensor([1.0, 1.0])
loss = ((pred - target) * (pred - target)).mean()
loss.backward()
g = pred.grad`,
    hint: 'Square the difference, then take the mean: ((pred-target)*(pred-target)).mean().',
    target: 'g',
  },
  {
    slug: 'conv2d',
    title: 'Convolve + ReLU',
    topic: 'CNN',
    prompt: `Slide the \`kernel\` over the \`img\` with \`torch.conv2d\`, then apply
ReLU. Store the feature map in \`feat\`.`,
    starter: `import torch

img = torch.tensor([[0, 0, 9],
                    [0, 0, 9],
                    [0, 0, 9]])
kernel = torch.tensor([[-1, 0, 1],
                       [-1, 0, 1],
                       [-1, 0, 1]])

feat = ____
print(feat)`,
    solution: `import torch
img = torch.tensor([[0, 0, 9], [0, 0, 9], [0, 0, 9]])
kernel = torch.tensor([[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]])
feat = torch.conv2d(img, kernel).relu()`,
    hint: 'torch.conv2d(img, kernel) gives the feature map; chain .relu().',
    target: 'feat',
  },
  {
    slug: 'rnn-step',
    title: 'One RNN step',
    topic: 'RNN',
    prompt: `Compute the next hidden state of a recurrent cell:
\`hₜ = tanh(xₜ·Wxh + hₜ₋₁·Whh + b)\`. Store it in \`h_next\`.`,
    starter: `import torch

x   = torch.tensor([[1.0]])
h   = torch.tensor([[0.0, 0.0, 0.0]])
Wxh = torch.tensor([[0.5, -0.4, 0.9]])
Whh = torch.tensor([[0.1, 0.0, -0.2],
                    [0.3, 0.2, 0.1],
                    [-0.1, 0.4, 0.05]])
bh  = torch.tensor([0.0, 0.1, -0.1])

h_next = ____
print(h_next)`,
    solution: `import torch
x   = torch.tensor([[1.0]])
h   = torch.tensor([[0.0, 0.0, 0.0]])
Wxh = torch.tensor([[0.5, -0.4, 0.9]])
Whh = torch.tensor([[0.1, 0.0, -0.2], [0.3, 0.2, 0.1], [-0.1, 0.4, 0.05]])
bh  = torch.tensor([0.0, 0.1, -0.1])
h_next = (x @ Wxh + h @ Whh + bh).tanh()`,
    hint: 'Two matmuls (x@Wxh and h@Whh) plus the bias, all inside tanh().',
    target: 'h_next',
  },
  {
    slug: 'diffusion-forward',
    title: 'Forward diffusion step',
    topic: 'Diffusion',
    prompt: `Noise the clean point \`x0\` toward \`xt\` using
\`xₜ = √ᾱ·x₀ + √(1−ᾱ)·ε\`. Here ᾱ = 0.6, so √ᾱ ≈ 0.7746 and √(1−ᾱ) ≈ 0.6325.`,
    starter: `import torch

x0  = torch.tensor([[2.0, -1.0]])
eps = torch.tensor([[0.5, -0.3]])   # fixed noise

xt = ____
print(xt)`,
    solution: `import torch
x0  = torch.tensor([[2.0, -1.0]])
eps = torch.tensor([[0.5, -0.3]])
xt = x0 * 0.7746 + eps * 0.6325`,
    hint: 'Scale x0 by 0.7746 and eps by 0.6325, then add.',
    target: 'xt',
  },
];

export function getExercise(slug: string): Exercise | undefined {
  return EXERCISES.find((e) => e.slug === slug);
}
