// Tutorial content. Each lesson is a sequence of markdown + runnable code blocks.
// Code blocks execute against the same engine as the Playground.

export type Block =
  | { type: 'md'; content: string }
  | { type: 'code'; code: string };

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  blocks: Block[];
}

export const LESSONS: Lesson[] = [
  {
    slug: 'tensors',
    title: '1 · Tensors',
    summary: 'The core data structure: creation, shape, and broadcasting.',
    blocks: [
      {
        type: 'md',
        content: `# Tensors

A **tensor** is PyTorch's core data structure — an n-dimensional array with a
\`shape\`. You create one from nested Python lists with \`torch.tensor(...)\`.

Run the cell below, then try changing the numbers.`,
      },
      {
        type: 'code',
        code: `import torch

a = torch.tensor([[1, 2, 3], [4, 5, 6]])
print(a)
print("shape:", a.shape)`,
      },
      {
        type: 'md',
        content: `## Broadcasting

When two tensors have different—but compatible—shapes, PyTorch *broadcasts* the
smaller one across the larger. A shape of \`[3]\` lines up with the last axis of a
\`[2, 3]\` tensor, so it is added to every row.`,
      },
      {
        type: 'code',
        code: `import torch

a = torch.tensor([[1, 2, 3], [4, 5, 6]])
bias = torch.tensor([10, 20, 30])

print(a + bias)`,
      },
      {
        type: 'md',
        content: `## Reductions

\`.sum()\` and \`.mean()\` collapse a tensor down to a single number — these show up
everywhere, especially when computing a loss.`,
      },
      {
        type: 'code',
        code: `import torch

a = torch.tensor([[1.0, 2.0], [3.0, 4.0]])
print("sum:", a.sum())
print("mean:", a.mean())`,
      },
    ],
  },
  {
    slug: 'autograd',
    title: '2 · Autograd',
    summary: 'How PyTorch computes gradients automatically with .backward().',
    blocks: [
      {
        type: 'md',
        content: `# Autograd

The magic behind training is **automatic differentiation**. Mark a tensor with
\`requires_grad=True\` and PyTorch records every operation you perform on it,
building a computation graph. Calling \`.backward()\` on a scalar result walks that
graph in reverse and fills in each tensor's \`.grad\`.

For \`y = x₁² + x₂² + x₃²\`, calculus says \`dy/dxᵢ = 2xᵢ\`. Let's verify.`,
      },
      {
        type: 'code',
        code: `import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x * x).sum()
y.backward()

print("y =", y)
print("dy/dx =", x.grad)   # expect [2, 4, 6]`,
      },
      {
        type: 'md',
        content: `## Why a scalar?

\`.backward()\` needs a single number to differentiate. That's why a loss is always
reduced to a scalar (with \`.sum()\` or \`.mean()\`) before calling backward. Try
removing \`.sum()\` above — you'll get a friendly error.

You can also visualize this graph on the **Visualize → Autograd graph** page.`,
      },
    ],
  },
  {
    slug: 'linear-regression',
    title: '3 · Linear regression',
    summary: 'Put tensors + autograd together to fit a line by gradient descent.',
    blocks: [
      {
        type: 'md',
        content: `# Linear regression

Now we combine everything: data, a parameter, a loss, and a gradient step.

We'll fit \`y = 2x\`. We start with weight \`w = 0\`, predict \`ŷ = x·w\`, measure the
mean-squared error, and read off \`dloss/dw\`.`,
      },
      {
        type: 'code',
        code: `import torch

x = torch.tensor([[1.0], [2.0], [3.0]])
y = torch.tensor([[2.0], [4.0], [6.0]])

w = torch.tensor([[0.0]], requires_grad=True)
pred = x @ w
loss = ((pred - y) * (pred - y)).mean()
loss.backward()

print("loss:", loss)
print("gradient dloss/dw:", w.grad)`,
      },
      {
        type: 'md',
        content: `## The update rule

The gradient tells us the direction of *steepest increase*, so to reduce the loss
we step in the **opposite** direction: \`w ← w − lr · grad\`. Repeat that and the
loss shrinks toward zero — watch it happen live on the **Visualize → Gradient
descent** page.`,
      },
    ],
  },
  {
    slug: 'neural-net',
    title: '4 · A tiny neural net',
    summary: 'A forward pass through a linear layer + ReLU nonlinearity.',
    blocks: [
      {
        type: 'md',
        content: `# A tiny neural network

A neural network layer is just a matrix multiply plus a bias, followed by a
**nonlinearity** like ReLU (\`max(0, x)\`). Stack a few of these and you have a
multi-layer perceptron.

Below is a single hidden layer: 2 inputs → 3 hidden units.`,
      },
      {
        type: 'code',
        code: `import torch

x = torch.tensor([[0.5, -1.0]])           # 1 sample, 2 features
W1 = torch.tensor([[0.2, 0.8, -0.5],
                   [1.0, -0.3, 0.4]])     # (2, 3)
b1 = torch.tensor([0.1, 0.0, -0.2])

h = (x @ W1 + b1).relu()
print("hidden activations:")
print(h)`,
      },
      {
        type: 'md',
        content: `## Why the nonlinearity?

Without ReLU (or sigmoid/tanh), stacking linear layers collapses into a single
linear layer — no extra power. The nonlinearity is what lets networks model
curves and complex decision boundaries. Explore the shapes of each activation on
the **Visualize → Activations** page, and design multi-layer architectures on
**Visualize → Architecture**.`,
      },
    ],
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
