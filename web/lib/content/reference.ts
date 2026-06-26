// Curated PyTorch API reference. `example` snippets are runnable in-page when
// they use the engine's supported subset (marked runnable: true).

export interface RefEntry {
  slug: string;
  name: string;
  category: string;
  signature: string;
  summary: string;
  body: string; // markdown
  example: string;
  runnable: boolean;
}

export const REFERENCE: RefEntry[] = [
  // ---- Tensor creation -------------------------------------------------
  {
    slug: 'tensor-creation',
    name: 'torch.tensor',
    category: 'Creation',
    signature: 'torch.tensor(data, requires_grad=False)',
    summary: 'Construct a tensor from (nested) lists or a scalar.',
    body: `Creates a tensor that copies \`data\`. Set \`requires_grad=True\` to track
operations for autograd. The shape is inferred from the nesting of the input.`,
    example: `import torch
a = torch.tensor([[1, 2], [3, 4]], requires_grad=True)
print(a)
print(a.shape)`,
    runnable: true,
  },
  {
    slug: 'zeros',
    name: 'torch.zeros',
    category: 'Creation',
    signature: 'torch.zeros(*size)',
    summary: 'A tensor filled with the scalar value 0.',
    body: `Returns a tensor of the given shape filled with zeros. Pass dimensions
either as separate arguments or as a list.`,
    example: `import torch
print(torch.zeros([2, 3]))`,
    runnable: true,
  },
  {
    slug: 'ones',
    name: 'torch.ones',
    category: 'Creation',
    signature: 'torch.ones(*size)',
    summary: 'A tensor filled with the scalar value 1.',
    body: `Returns a tensor of the given shape filled with ones — handy for biases
or as a starting point.`,
    example: `import torch
print(torch.ones([3]))`,
    runnable: true,
  },
  {
    slug: 'arange',
    name: 'torch.arange',
    category: 'Creation',
    signature: 'torch.arange(end)',
    summary: 'A 1-D tensor of evenly spaced integers [0, end).',
    body: `Returns values from 0 up to (but not including) \`end\`. Useful for
indices and quick test data.`,
    example: `import torch
print(torch.arange(5))`,
    runnable: true,
  },
  {
    slug: 'randn',
    name: 'torch.randn',
    category: 'Creation',
    signature: 'torch.randn(*size)',
    summary: 'A tensor of samples from the standard normal distribution.',
    body: `Returns a tensor filled with random numbers drawn from a normal
distribution with mean 0 and variance 1 — the usual way to initialize weights.`,
    example: `import torch
print(torch.randn([2, 2]))`,
    runnable: true,
  },

  // ---- Operations ------------------------------------------------------
  {
    slug: 'add',
    name: '+ (add)',
    category: 'Ops',
    signature: 'a + b',
    summary: 'Elementwise addition with broadcasting.',
    body: `Adds two tensors elementwise. If shapes differ, they are
[broadcast](https://pytorch.org/docs/stable/notes/broadcasting.html) to a common
shape — e.g. a \`[3]\` bias adds to every row of a \`[N, 3]\` tensor.`,
    example: `import torch
a = torch.tensor([[1, 2, 3], [4, 5, 6]])
bias = torch.tensor([10, 20, 30])
print(a + bias)`,
    runnable: true,
  },
  {
    slug: 'mul',
    name: '* (mul)',
    category: 'Ops',
    signature: 'a * b',
    summary: 'Elementwise multiplication (Hadamard product).',
    body: `Multiplies tensors elementwise — **not** matrix multiplication. Use
\`@\` for matmul.`,
    example: `import torch
a = torch.tensor([1, 2, 3])
b = torch.tensor([4, 5, 6])
print(a * b)`,
    runnable: true,
  },
  {
    slug: 'matmul',
    name: '@ (matmul)',
    category: 'Ops',
    signature: 'a @ b',
    summary: 'Matrix multiplication.',
    body: `Computes the matrix product. For 2-D tensors, the inner dimensions
must match: \`(m, k) @ (k, n) -> (m, n)\`. This is the workhorse of every linear
layer.`,
    example: `import torch
a = torch.tensor([[1, 2], [3, 4]])
b = torch.tensor([[5, 6], [7, 8]])
print(a @ b)`,
    runnable: true,
  },
  {
    slug: 'sum',
    name: 'Tensor.sum',
    category: 'Ops',
    signature: 'a.sum()',
    summary: 'Sum of all elements, returned as a scalar tensor.',
    body: `Reduces every element to a single number. Often used to turn a vector
loss into a scalar before \`.backward()\`.`,
    example: `import torch
print(torch.tensor([[1, 2], [3, 4]]).sum())`,
    runnable: true,
  },
  {
    slug: 'mean',
    name: 'Tensor.mean',
    category: 'Ops',
    signature: 'a.mean()',
    summary: 'Average of all elements, returned as a scalar tensor.',
    body: `Like \`.sum()\` but divides by the number of elements — the basis of
mean-squared-error and many other losses.`,
    example: `import torch
print(torch.tensor([1.0, 2.0, 3.0, 4.0]).mean())`,
    runnable: true,
  },

  // ---- Activations -----------------------------------------------------
  {
    slug: 'relu',
    name: 'torch.relu',
    category: 'Activations',
    signature: 'torch.relu(x)  /  x.relu()',
    summary: 'Rectified linear unit: max(0, x).',
    body: `Zeros out negative values and passes positives through unchanged. The
most common hidden-layer activation — cheap and avoids vanishing gradients for
positive inputs.`,
    example: `import torch
print(torch.tensor([-2.0, -0.5, 0.0, 1.5]).relu())`,
    runnable: true,
  },
  {
    slug: 'sigmoid',
    name: 'torch.sigmoid',
    category: 'Activations',
    signature: 'torch.sigmoid(x)  /  x.sigmoid()',
    summary: 'Squashes values into (0, 1).',
    body: `Maps any real number to the range (0, 1) — useful for the output of a
binary classifier. Saturates for large |x|, which can slow learning.`,
    example: `import torch
print(torch.tensor([-2.0, 0.0, 2.0]).sigmoid())`,
    runnable: true,
  },
  {
    slug: 'tanh',
    name: 'torch.tanh',
    category: 'Activations',
    signature: 'torch.tanh(x)  /  x.tanh()',
    summary: 'Squashes values into (−1, 1), zero-centered.',
    body: `Similar to sigmoid but centered at 0, which often helps optimization in
hidden layers.`,
    example: `import torch
print(torch.tensor([-1.0, 0.0, 1.0]).tanh())`,
    runnable: true,
  },

  // ---- Autograd --------------------------------------------------------
  {
    slug: 'requires-grad',
    name: 'requires_grad',
    category: 'Autograd',
    signature: 'torch.tensor(data, requires_grad=True)',
    summary: 'Flag that tells autograd to track a tensor.',
    body: `When a tensor has \`requires_grad=True\`, PyTorch records every
operation involving it so gradients can be computed later. Model parameters
always set this.`,
    example: `import torch
w = torch.tensor([1.0, 2.0], requires_grad=True)
print("tracked:", w.requires_grad)`,
    runnable: true,
  },
  {
    slug: 'backward',
    name: 'Tensor.backward',
    category: 'Autograd',
    signature: 'loss.backward()',
    summary: 'Compute gradients of a scalar w.r.t. graph leaves.',
    body: `Walks the computation graph in reverse, accumulating gradients into the
\`.grad\` of every tensor with \`requires_grad=True\`. Must be called on a scalar
(reduce with \`.sum()\` / \`.mean()\` first).`,
    example: `import torch
x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x * x).sum()
y.backward()
print(x.grad)`,
    runnable: true,
  },
  {
    slug: 'grad',
    name: 'Tensor.grad',
    category: 'Autograd',
    signature: 'tensor.grad',
    summary: 'The accumulated gradient after backward().',
    body: `Holds \`d(output)/d(this tensor)\` once \`.backward()\` has run. It is
\`None\` until then. Optimizers read this to update parameters.`,
    example: `import torch
x = torch.tensor([2.0], requires_grad=True)
(x * x).sum().backward()
print(x.grad)   # 2*x = 4`,
    runnable: true,
  },

  // ---- Loss ------------------------------------------------------------
  {
    slug: 'mse-loss',
    name: 'MSE loss',
    category: 'Loss',
    signature: 'mean((pred - target) ** 2)',
    summary: 'Mean squared error — the standard regression loss.',
    body: `Penalizes the squared difference between predictions and targets. In
PyTorch this is \`torch.nn.functional.mse_loss\`; here we spell it out so the
gradient path is visible.`,
    example: `import torch
pred = torch.tensor([2.0, 4.0], requires_grad=True)
target = torch.tensor([1.0, 1.0])
loss = ((pred - target) * (pred - target)).mean()
loss.backward()
print("loss:", loss)
print("grad:", pred.grad)`,
    runnable: true,
  },

  // ---- Convolution -----------------------------------------------------
  {
    slug: 'conv2d',
    name: 'torch.conv2d',
    category: 'Convolution',
    signature: 'torch.conv2d(input, kernel)',
    summary: 'Slide a 2-D kernel over a single-channel image (cross-correlation).',
    body: `Computes a 2-D convolution (cross-correlation) of \`input\` (H, W) with
\`kernel\` (kh, kw), stride 1 and no padding, giving a \`(H-kh+1, W-kw+1)\` feature
map. It is autograd-aware, so gradients flow to both the image and the kernel.
This educational version handles one channel and one kernel; real
\`torch.nn.Conv2d\` adds batches, channels, padding, and stride.`,
    example: `import torch
img = torch.tensor([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
kernel = torch.tensor([[1, 0], [0, -1]])
print(torch.conv2d(img, kernel))`,
    runnable: true,
  },
  {
    slug: 'max-pool2d',
    name: 'torch.max_pool2d',
    category: 'Convolution',
    signature: 'torch.max_pool2d(input, size)',
    summary: 'Downsample by taking the max of each non-overlapping window.',
    body: `Splits \`input\` (H, W) into non-overlapping \`size×size\` windows
(stride = size) and keeps each window's maximum, giving a
\`(⌊H/size⌋, ⌊W/size⌋)\` output. The gradient flows only to the element that was
the max in each window.`,
    example: `import torch
x = torch.tensor([[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]])
print(torch.max_pool2d(x, 2))`,
    runnable: true,
  },
];

export function getRef(slug: string): RefEntry | undefined {
  return REFERENCE.find((r) => r.slug === slug);
}
