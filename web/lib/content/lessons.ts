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
  {
    slug: 'backprop',
    title: '5 · Backprop step by step',
    summary: 'Trace gradients flowing backward through a 2-layer MLP, layer by layer.',
    blocks: [
      {
        type: 'md',
        content: `# Backprop, step by step

Lesson 2 showed \`.backward()\` filling in \`.grad\`. Here we open the box and watch
gradients flow **backward** through a small two-layer network — one layer at a
time.

Forward, the data flows left to right:

\`\`\`
x ──▶ z1 = x·W1 + b1 ──▶ h = relu(z1) ──▶ z2 = h·W2 + b2 ──▶ loss
\`\`\`

Backprop walks the *same* graph in reverse. Starting from \`dL/dloss = 1\`, each
node multiplies the gradient coming from its right by its **local derivative**
(the chain rule) and passes the result to its left. We bind every intermediate to
a variable so we can print its gradient.`,
      },
      {
        type: 'code',
        code: `import torch

x  = torch.tensor([[1.0, 2.0]])                  # one sample, 2 features
W1 = torch.tensor([[0.1, 0.2, 0.3],
                   [0.4, 0.5, 0.6]], requires_grad=True)   # (2, 3)
b1 = torch.tensor([0.0, 0.0, 0.0], requires_grad=True)
W2 = torch.tensor([[0.1], [0.2], [0.3]], requires_grad=True) # (3, 1)
b2 = torch.tensor([0.0], requires_grad=True)
y  = torch.tensor([[1.0]])                       # target

# forward — keep every intermediate
z1 = x @ W1 + b1
h  = z1.relu()
z2 = h @ W2 + b2
loss = ((z2 - y) * (z2 - y)).mean()

loss.backward()

print("loss  :", loss)
print("dL/dz2:", z2.grad)   # 2*(z2 - y)
print("dL/dW2:", W2.grad)   # h^T · dL/dz2
print("dL/dh :", h.grad)    # dL/dz2 · W2^T
print("dL/dz1:", z1.grad)   # dL/dh * relu'(z1)
print("dL/dW1:", W1.grad)   # x^T · dL/dz1`,
      },
      {
        type: 'md',
        content: `## Read it right-to-left

Notice the order the gradients are *produced*:

1. **\`dL/dz2 = 2·(z2 − y)\`** — the derivative of the MSE at the output.
2. **\`dL/dW2 = hᵀ · dL/dz2\`** and **\`dL/dh = dL/dz2 · W2ᵀ\`** — the linear layer
   sends one gradient to its weights and another back to its input.
3. **\`dL/dz1 = dL/dh ⊙ relu'(z1)\`** — ReLU's local derivative is 1 where its input
   was positive and 0 elsewhere, so it just *gates* the gradient.
4. **\`dL/dW1 = xᵀ · dL/dz1\`** — the first layer's weight gradient.

Every \`.grad\` above is a product of local derivatives along the path back to the
loss. That's all backprop is.

## One step downhill

Gradients point uphill, so subtract a small multiple of them. Run this to see the
loss drop after a single update of **all** parameters.`,
      },
      {
        type: 'code',
        code: `import torch

x  = torch.tensor([[1.0, 2.0]])
W1 = torch.tensor([[0.1, 0.2, 0.3],
                   [0.4, 0.5, 0.6]], requires_grad=True)
b1 = torch.tensor([0.0, 0.0, 0.0], requires_grad=True)
W2 = torch.tensor([[0.1], [0.2], [0.3]], requires_grad=True)
b2 = torch.tensor([0.0], requires_grad=True)
y  = torch.tensor([[1.0]])
lr = 0.1

z2 = (x @ W1 + b1).relu() @ W2 + b2
loss = ((z2 - y) * (z2 - y)).mean()
loss.backward()
print("loss before:", loss)

# w <- w - lr * dL/dw, for every parameter
W1 = W1 - lr * W1.grad
b1 = b1 - lr * b1.grad
W2 = W2 - lr * W2.grad
b2 = b2 - lr * b2.grad

z2 = (x @ W1 + b1).relu() @ W2 + b2
loss_after = ((z2 - y) * (z2 - y)).mean()
print("loss after :", loss_after)`,
      },
      {
        type: 'md',
        content: `Repeat that update in a loop and you have training. Watch a single
parameter train on the **Visualize → Gradient descent** page, or step the whole
forward-and-backward pass through a multi-layer net on the **Visualize → Backprop
(MLP)** page — every activation and gradient shown live.`,
      },
    ],
  },
  {
    slug: 'cnn',
    title: '6 · Convolutions',
    summary: 'Slide a small kernel over an image to detect features — with autograd.',
    blocks: [
      {
        type: 'md',
        content: `# Convolutions

Dense layers (\`x @ W\`) connect every input to every output. For images that is
wasteful — nearby pixels matter most. A **convolution** instead slides a tiny
\`kernel\` (a small weight matrix) across the image, computing a dot product at
each position. The same kernel is reused everywhere, so it learns to detect one
pattern — an edge, a corner, a texture — wherever it appears.

Here we use a single-channel 2D \`conv2d\` (stride 1, no padding). A
\`3×3\` kernel over a \`6×6\` image produces a \`4×4\` **feature map**.`,
      },
      {
        type: 'code',
        code: `import torch

# 6x6 grayscale image: dark (0) on the left, bright (9) on the right
img = torch.tensor([[0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9]])

# a vertical-edge detector: -1 on the left column, +1 on the right
kernel = torch.tensor([[-1, 0, 1],
                       [-1, 0, 1],
                       [-1, 0, 1]])

feat = torch.conv2d(img, kernel).relu()
print("feature map:")
print(feat)`,
      },
      {
        type: 'md',
        content: `The feature map lights up (\`27\`) exactly at the columns where the image goes from
dark to bright, and is \`0\` in the flat regions — the kernel found the edge.

## Pooling

**Max pooling** shrinks a feature map by keeping only the strongest response in
each window. It makes the representation smaller and a little shift-invariant. A
\`2×2\` pool halves each dimension.`,
      },
      {
        type: 'code',
        code: `import torch

img = torch.tensor([[0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9],
                    [0, 0, 0, 9, 9, 9]])

kernel = torch.tensor([[-1, 0, 1],
                       [-1, 0, 1],
                       [-1, 0, 1]], requires_grad=True)

feat = torch.conv2d(img, kernel).relu()      # 4x4
pooled = torch.max_pool2d(feat, 2)           # 2x2
print("pooled:")
print(pooled)

# the kernel is just weights — gradients flow back to it
loss = pooled.sum()
loss.backward()
print("dL/dkernel:")
print(kernel.grad)`,
      },
      {
        type: 'md',
        content: `Because \`conv2d\` and \`max_pool2d\` are ordinary autograd ops, \`.backward()\` fills
in \`kernel.grad\` — so a real CNN learns its kernels by exactly the gradient
descent from the previous lesson. Watch a kernel slide across an image on the
**Visualize → Convolution** page.

*(This engine keeps it simple: one input channel, one kernel, stride 1, no
padding. Real \`torch.nn.Conv2d\` adds batches, multiple channels, padding, and
stride.)*`,
      },
    ],
  },
];

export function getLesson(slug: string): Lesson | undefined {
  return LESSONS.find((l) => l.slug === slug);
}
