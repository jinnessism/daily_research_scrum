// Ready-made example scripts for the playground's snippet picker.

export interface Snippet {
  id: string;
  label: string;
  code: string;
}

export const SNIPPETS: Snippet[] = [
  {
    id: 'tensors',
    label: 'Tensors & broadcasting',
    code: `import torch

a = torch.tensor([[1, 2, 3], [4, 5, 6]])
b = torch.tensor([10, 20, 30])   # broadcasts across rows

c = a + b
print("a + b =")
print(c)
print("sum:", c.sum())
print("mean:", c.mean())
`,
  },
  {
    id: 'autograd',
    label: 'Autograd basics',
    code: `import torch

x = torch.tensor([1.0, 2.0, 3.0], requires_grad=True)
y = (x * x).sum()      # y = x1^2 + x2^2 + x3^2
y.backward()

print("y =", y)
print("dy/dx =", x.grad)   # should be 2*x = [2, 4, 6]
`,
  },
  {
    id: 'linreg',
    label: 'Linear regression (1 step)',
    code: `import torch

# Fit y = 2x. Start from w = 0 and take one gradient step.
x = torch.tensor([[1.0], [2.0], [3.0]])
y = torch.tensor([[2.0], [4.0], [6.0]])

w = torch.tensor([[0.0]], requires_grad=True)
pred = x @ w
loss = ((pred - y) * (pred - y)).mean()
loss.backward()

print("loss:", loss)
print("dloss/dw:", w.grad)
`,
  },
  {
    id: 'mlp',
    label: 'Tiny forward pass',
    code: `import torch

x = torch.tensor([[0.5, -1.0]])      # one sample, 2 features
W1 = torch.tensor([[0.2, 0.8, -0.5], [1.0, -0.3, 0.4]])
b1 = torch.tensor([0.1, 0.0, -0.2])

h = (x @ W1 + b1).relu()
print("hidden activations:")
print(h)
`,
  },
];
