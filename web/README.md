# torchdev — Interactive PyTorch Website

An interactive, browser-only website for learning and experimenting with
**PyTorch** concepts. Built with Next.js (App Router, TypeScript, Tailwind) and
deployed as a static export to GitHub Pages.

> Lives alongside the Python *Daily Research Scrum Bot* in this repo but is fully
> independent of it.

## Features

- **Learn** — step-by-step lessons (tensors → autograd → linear regression → a
  tiny neural net) with runnable code cells.
- **Playground** — write torch-style code and run it instantly in the browser.
- **Visualize** — interactive demos: the autograd computation graph, live
  gradient descent, activation functions, and neural-network architecture.
- **Reference** — a curated, searchable API reference with runnable examples.

## How code runs (important)

Real PyTorch cannot run in a browser (it isn't available in Pyodide and its
C/CUDA extensions can't be compiled to WASM in practice). So this site ships a
small **educational tensor engine** (`lib/minitorch/`) that re-implements the
core ideas — tensors, broadcasting, and reverse-mode autograd — in TypeScript,
and a **safe interpreter** (`lib/minitorch/runner.ts`) that executes a *subset*
of the torch API. It never calls `eval()`; unsupported syntax raises a friendly
error instead of running.

Supported subset:

- `torch.tensor / zeros / ones / full / arange / randn / rand`
- operators `+ - * / @`, broadcasting
- `.sum() .mean() .relu() .sigmoid() .tanh() .exp() .log() .pow() .t() .item()`
- `requires_grad`, `.backward()`, `.grad`
- `print(...)` and string literals

## Development

```bash
cd web
npm install
npm run dev      # http://localhost:3000
npm run test     # vitest unit tests for the tensor engine
npm run build    # static export to web/out/
```

To preview the production export locally:

```bash
npm run build
npx serve out
```

## Deployment

`.github/workflows/deploy-web.yml` builds the static export and publishes it to
GitHub Pages on every push to `main` that touches `web/`. Enable Pages for the
repo with **Settings → Pages → Source: GitHub Actions**. The site is served at
`https://<owner>.github.io/<repo>/` — the workflow sets `NEXT_PUBLIC_BASE_PATH`
to the repository name automatically.

## Project layout

```
web/
  app/            # routes: /, /learn/[slug], /playground, /visualize, /reference/[slug]
  components/     # Nav, Sidebar, CodeEditor, OutputPanel, TensorView, viz/*
  lib/minitorch/  # the educational tensor engine (tensor, ops, autograd, runner)
  lib/content/    # lesson + reference content
  __tests__/      # vitest unit tests
```

## Out of scope (possible follow-ups)

- Real PyTorch execution via a backend (FastAPI) or an "Open in Colab" export.
- Saving/sharing notebooks; user accounts.
- Broader engine coverage (conv layers, optimizers, more ops).
