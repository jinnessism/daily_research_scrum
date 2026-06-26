// A small, SAFE interpreter for a torch-like subset of Python. It never calls
// eval() — it tokenizes the source, builds an AST, and dispatches against a
// fixed whitelist of tensor operations. Anything outside the subset raises a
// friendly error instead of executing.

import { Tensor, tensor, zeros, ones, randn, rand, arange, full } from './tensor';
import {
  add,
  sub,
  mul,
  div,
  neg,
  matmul,
  relu,
  sigmoid,
  tanh,
  exp,
  log,
  sum,
  mean,
  powScalar,
} from './ops';

export interface RunResult {
  output: string; // captured stdout (print + final expression repr)
  error: string | null;
  tensors: { name: string; tensor: Tensor }[]; // named tensors after the run
}

// --------------------------------------------------------------------------
// Tokenizer
// --------------------------------------------------------------------------

type Tok =
  | { t: 'num'; v: number }
  | { t: 'name'; v: string }
  | { t: 'str'; v: string }
  | { t: 'op'; v: string } // + - * / @
  | { t: 'punc'; v: string }; // ( ) [ ] , . =

function tokenize(line: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < n && /[0-9.eE+\-]/.test(line[j])) {
        // Only consume +/- as part of exponent.
        if ((line[j] === '+' || line[j] === '-') && !/[eE]/.test(line[j - 1])) break;
        j++;
      }
      const num = parseFloat(line.slice(i, j));
      if (Number.isNaN(num)) throw new Error(`Invalid number near "${line.slice(i, j)}"`);
      toks.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let s = '';
      while (j < n && line[j] !== quote) {
        s += line[j];
        j++;
      }
      if (j >= n) throw new Error('Unterminated string literal');
      toks.push({ t: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_]/.test(line[j])) j++;
      toks.push({ t: 'name', v: line.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/@'.includes(c)) {
      toks.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if ('()[],.='.includes(c)) {
      toks.push({ t: 'punc', v: c });
      i++;
      continue;
    }
    throw new Error(`Unexpected character "${c}"`);
  }
  return toks;
}

// --------------------------------------------------------------------------
// Parser (recursive descent / Pratt)
// --------------------------------------------------------------------------

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'name'; v: string }
  | { k: 'list'; items: Node[] }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'neg'; a: Node }
  | { k: 'attr'; obj: Node; name: string }
  | { k: 'call'; fn: Node; args: Node[]; kwargs: Record<string, Node> };

class Parser {
  toks: Tok[];
  pos = 0;
  constructor(toks: Tok[]) {
    this.toks = toks;
  }
  peek(): Tok | undefined {
    return this.toks[this.pos];
  }
  next(): Tok {
    return this.toks[this.pos++];
  }
  expectPunc(v: string) {
    const t = this.next();
    if (!t || t.t !== 'punc' || t.v !== v) {
      throw new Error(`Expected "${v}"`);
    }
  }

  parseExpr(): Node {
    return this.parseAdd();
  }

  parseAdd(): Node {
    let node = this.parseMul();
    while (this.peek()?.t === 'op' && ['+', '-'].includes((this.peek() as any).v)) {
      const op = (this.next() as any).v;
      node = { k: 'bin', op, a: node, b: this.parseMul() };
    }
    return node;
  }

  parseMul(): Node {
    let node = this.parseUnary();
    while (this.peek()?.t === 'op' && ['*', '/', '@'].includes((this.peek() as any).v)) {
      const op = (this.next() as any).v;
      node = { k: 'bin', op, a: node, b: this.parseUnary() };
    }
    return node;
  }

  parseUnary(): Node {
    if (this.peek()?.t === 'op' && (this.peek() as any).v === '-') {
      this.next();
      return { k: 'neg', a: this.parseUnary() };
    }
    return this.parsePostfix();
  }

  parsePostfix(): Node {
    let node = this.parsePrimary();
    for (;;) {
      const t = this.peek();
      if (t?.t === 'punc' && t.v === '.') {
        this.next();
        const nameTok = this.next();
        if (!nameTok || nameTok.t !== 'name') throw new Error('Expected attribute name after "."');
        node = { k: 'attr', obj: node, name: nameTok.v };
      } else if (t?.t === 'punc' && t.v === '(') {
        this.next();
        const { args, kwargs } = this.parseArgs();
        node = { k: 'call', fn: node, args, kwargs };
      } else {
        break;
      }
    }
    return node;
  }

  parseArgs(): { args: Node[]; kwargs: Record<string, Node> } {
    const args: Node[] = [];
    const kwargs: Record<string, Node> = {};
    if (this.peek()?.t === 'punc' && (this.peek() as any).v === ')') {
      this.next();
      return { args, kwargs };
    }
    for (;;) {
      // kwarg?  name = expr
      const save = this.pos;
      const t = this.peek();
      if (t?.t === 'name' && this.toks[this.pos + 1]?.t === 'punc' && (this.toks[this.pos + 1] as any).v === '=') {
        const name = (this.next() as any).v;
        this.next(); // '='
        kwargs[name] = this.parseExpr();
      } else {
        this.pos = save;
        args.push(this.parseExpr());
      }
      const sep = this.next();
      if (sep?.t === 'punc' && sep.v === ',') continue;
      if (sep?.t === 'punc' && sep.v === ')') break;
      throw new Error('Expected "," or ")" in arguments');
    }
    return { args, kwargs };
  }

  parsePrimary(): Node {
    const t = this.next();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'str') return { k: 'str', v: t.v };
    if (t.t === 'name') {
      if (t.v === 'True') return { k: 'num', v: 1 };
      if (t.v === 'False') return { k: 'num', v: 0 };
      if (t.v === 'None') return { k: 'name', v: 'None' };
      return { k: 'name', v: t.v };
    }
    if (t.t === 'punc' && t.v === '(') {
      const e = this.parseExpr();
      this.expectPunc(')');
      return e;
    }
    if (t.t === 'punc' && t.v === '[') {
      const items: Node[] = [];
      if (this.peek()?.t === 'punc' && (this.peek() as any).v === ']') {
        this.next();
        return { k: 'list', items };
      }
      for (;;) {
        items.push(this.parseExpr());
        const sep = this.next();
        if (sep?.t === 'punc' && sep.v === ',') continue;
        if (sep?.t === 'punc' && sep.v === ']') break;
        throw new Error('Expected "," or "]" in list');
      }
      return { k: 'list', items };
    }
    throw new Error(`Unexpected token "${(t as any).v}"`);
  }
}

// --------------------------------------------------------------------------
// Evaluator
// --------------------------------------------------------------------------

type Value = Tensor | number | number[] | Value[] | NSFn | BoundMethod | null | string;

interface NSFn {
  __ns: 'torch';
  name: string;
}
interface BoundMethod {
  __recv: Tensor;
  name: string;
}

const TORCH_FNS = new Set([
  'tensor', 'zeros', 'ones', 'randn', 'rand', 'arange', 'full',
  'relu', 'sigmoid', 'tanh', 'exp', 'log', 'matmul', 'sum', 'mean',
]);

const TENSOR_METHODS = new Set([
  'sum', 'mean', 'relu', 'sigmoid', 'tanh', 'exp', 'log',
  'backward', 'matmul', 'pow', 't', 'item', 'tolist', 'zero_',
]);

function isTensor(v: Value): v is Tensor {
  return v instanceof Tensor;
}

/** Coerce a number into a 0-d tensor so broadcasting handles scalar ops. */
function asTensor(v: Value): Tensor {
  if (isTensor(v)) return v;
  if (typeof v === 'number') return tensor(v);
  throw new Error('Expected a tensor or number');
}

function toShapeArg(args: Value[]): number[] {
  if (args.length === 1 && Array.isArray(args[0])) return (args[0] as number[]).map(Number);
  return args.map((a) => Number(a));
}

class Interpreter {
  env = new Map<string, Value>();
  out: string[] = [];

  format(v: Value): string {
    if (v === null) return 'None';
    if (isTensor(v)) return v.toString();
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(+v.toFixed(4));
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map((x) => this.format(x as Value)).join(', ') + ']';
    return String(v);
  }

  eval(node: Node): Value {
    switch (node.k) {
      case 'num':
        return node.v;
      case 'str':
        return node.v;
      case 'name': {
        if (node.v === 'torch') return { __ns: 'torch', name: '' } as NSFn;
        if (node.v === 'None') return null;
        if (this.env.has(node.v)) return this.env.get(node.v)!;
        throw new Error(`Name "${node.v}" is not defined`);
      }
      case 'list':
        return node.items.map((it) => this.eval(it)) as Value[];
      case 'neg': {
        const a = this.eval(node.a);
        if (typeof a === 'number') return -a;
        return neg(asTensor(a));
      }
      case 'bin':
        return this.evalBin(node.op, this.eval(node.a), this.eval(node.b));
      case 'attr':
        return this.evalAttr(this.eval(node.obj), node.name);
      case 'call':
        return this.evalCall(node);
    }
  }

  evalBin(op: string, a: Value, b: Value): Value {
    if (typeof a === 'number' && typeof b === 'number') {
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': return a / b;
        case '@': throw new Error('@ (matmul) requires tensors');
      }
    }
    const ta = asTensor(a);
    const tb = asTensor(b);
    switch (op) {
      case '+': return add(ta, tb);
      case '-': return sub(ta, tb);
      case '*': return mul(ta, tb);
      case '/': return div(ta, tb);
      case '@': return matmul(ta, tb);
    }
    throw new Error(`Unknown operator "${op}"`);
  }

  evalAttr(obj: Value, name: string): Value {
    if (obj && typeof obj === 'object' && '__ns' in obj) {
      if (!TORCH_FNS.has(name)) throw new Error(`torch has no function "${name}"`);
      return { __ns: 'torch', name } as NSFn;
    }
    if (isTensor(obj)) {
      // Properties first.
      if (name === 'grad') {
        return obj.grad ? new Tensor(obj.grad.slice(), obj.shape.slice()) : null;
      }
      if (name === 'shape') return Array.from(obj.shape);
      if (name === 'requires_grad') return obj.requires_grad ? 1 : 0;
      if (name === 'T') {
        return this.transpose(obj);
      }
      if (TENSOR_METHODS.has(name)) return { __recv: obj, name } as BoundMethod;
      throw new Error(`Tensor has no attribute "${name}"`);
    }
    throw new Error(`Cannot access attribute "${name}"`);
  }

  transpose(t: Tensor): Tensor {
    if (t.ndim !== 2) throw new Error('.T supports 2D tensors only');
    const [m, n] = t.shape;
    const out = new Float64Array(m * n);
    for (let i = 0; i < m; i++)
      for (let j = 0; j < n; j++) out[j * m + i] = t.data[i * n + j];
    return new Tensor(out, [n, m]);
  }

  evalCall(node: Extract<Node, { k: 'call' }>): Value {
    const args = node.args.map((a) => this.eval(a));
    const kwargs: Record<string, Value> = {};
    for (const k in node.kwargs) kwargs[k] = this.eval(node.kwargs[k]);

    // print(...) — handled before resolving `print` as a name.
    if (node.fn.k === 'name' && node.fn.v === 'print') {
      this.out.push(args.map((a) => this.format(a)).join(' '));
      return null;
    }

    const fn = this.eval(node.fn);
    if (fn && typeof fn === 'object' && '__ns' in fn) {
      return this.callTorch((fn as NSFn).name, args, kwargs);
    }
    if (fn && typeof fn === 'object' && '__recv' in fn) {
      return this.callMethod(fn as BoundMethod, args);
    }
    throw new Error('Attempted to call a non-callable value');
  }

  callTorch(name: string, args: Value[], kwargs: Record<string, Value>): Value {
    const rg = kwargs['requires_grad'] ? Boolean(Number(kwargs['requires_grad'])) : false;
    switch (name) {
      case 'tensor':
        return tensor(args[0] as unknown, rg);
      case 'zeros':
        return zeros(toShapeArg(args), rg);
      case 'ones':
        return ones(toShapeArg(args), rg);
      case 'randn':
        return randn(toShapeArg(args), rg);
      case 'rand':
        return rand(toShapeArg(args), rg);
      case 'full': {
        const shape = Array.isArray(args[0]) ? (args[0] as number[]) : [Number(args[0])];
        return full(shape, Number(args[1]), rg);
      }
      case 'arange':
        return arange(Number(args[0]));
      case 'relu': return relu(asTensor(args[0]));
      case 'sigmoid': return sigmoid(asTensor(args[0]));
      case 'tanh': return tanh(asTensor(args[0]));
      case 'exp': return exp(asTensor(args[0]));
      case 'log': return log(asTensor(args[0]));
      case 'matmul': return matmul(asTensor(args[0]), asTensor(args[1]));
      case 'sum': return sum(asTensor(args[0]));
      case 'mean': return mean(asTensor(args[0]));
    }
    throw new Error(`torch.${name} is not supported`);
  }

  callMethod(m: BoundMethod, args: Value[]): Value {
    const t = m.__recv;
    switch (m.name) {
      case 'sum': return sum(t);
      case 'mean': return mean(t);
      case 'relu': return relu(t);
      case 'sigmoid': return sigmoid(t);
      case 'tanh': return tanh(t);
      case 'exp': return exp(t);
      case 'log': return log(t);
      case 'pow': return powScalar(t, Number(args[0]));
      case 'matmul': return matmul(t, asTensor(args[0]));
      case 't': return this.transpose(t);
      case 'item': return t.data[0];
      case 'tolist': return t.toArray() as Value;
      case 'backward':
        t.backward();
        return null;
      case 'zero_':
        t.zeroGrad();
        return t;
    }
    throw new Error(`Tensor.${m.name}() is not supported`);
  }

  /** Run one logical line. Returns the value if it was a bare expression. */
  runLine(line: string): { value: Value; isExpr: boolean } {
    const trimmed = line.replace(/#.*$/, '').trim();
    if (!trimmed) return { value: null, isExpr: false };
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      return { value: null, isExpr: false }; // imports are no-ops
    }

    // Detect a top-level assignment (an '=' not inside brackets/parens).
    let depth = 0;
    let assignAt = -1;
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (c === '(' || c === '[') depth++;
      else if (c === ')' || c === ']') depth--;
      else if (c === '=' && depth === 0) {
        // not '==' (we don't support comparisons anyway)
        if (trimmed[i + 1] !== '=' && trimmed[i - 1] !== '!') {
          assignAt = i;
          break;
        }
      }
    }

    if (assignAt >= 0) {
      const target = trimmed.slice(0, assignAt).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(target)) {
        throw new Error(`Cannot assign to "${target}"`);
      }
      const rhs = trimmed.slice(assignAt + 1).trim();
      const node = new Parser(tokenize(rhs)).parseExpr();
      this.env.set(target, this.eval(node));
      return { value: null, isExpr: false };
    }

    const node = new Parser(tokenize(trimmed)).parseExpr();
    return { value: this.eval(node), isExpr: true };
  }
}

/** Execute a torch-like script and capture its output + resulting tensors. */
export function runScript(src: string): RunResult {
  const interp = new Interpreter();
  const lines = src.split('\n');
  try {
    let lastExpr: Value = null;
    let lastWasExpr = false;
    for (let ln = 0; ln < lines.length; ln++) {
      try {
        const { value, isExpr } = interp.runLine(lines[ln]);
        lastExpr = value;
        lastWasExpr = isExpr;
      } catch (e) {
        throw new Error(`Line ${ln + 1}: ${(e as Error).message}`);
      }
    }
    // REPL-style: echo the final bare expression if it produced a value.
    if (lastWasExpr && lastExpr !== null) {
      interp.out.push(interp.format(lastExpr));
    }
    const tensors = Array.from(interp.env.entries())
      .filter(([, v]) => v instanceof Tensor)
      .map(([name, v]) => ({ name, tensor: v as Tensor }));
    return { output: interp.out.join('\n'), error: null, tensors };
  } catch (e) {
    return { output: interp.out.join('\n'), error: (e as Error).message, tensors: [] };
  }
}
