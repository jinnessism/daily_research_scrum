// Shape & broadcasting utilities shared by the tensor engine.

export type Shape = number[];

export function numel(shape: Shape): number {
  return shape.reduce((a, b) => a * b, 1);
}

export function shapesEqual(a: Shape, b: Shape): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Row-major strides for a shape. */
export function strides(shape: Shape): number[] {
  const s = new Array(shape.length).fill(1);
  for (let i = shape.length - 2; i >= 0; i--) {
    s[i] = s[i + 1] * shape[i + 1];
  }
  return s;
}

/** NumPy-style broadcasting of two shapes. Throws if incompatible. */
export function broadcastShapes(a: Shape, b: Shape): Shape {
  const out: number[] = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const da = a[a.length - 1 - i] ?? 1;
    const db = b[b.length - 1 - i] ?? 1;
    if (da !== db && da !== 1 && db !== 1) {
      throw new Error(
        `Shapes [${a}] and [${b}] are not broadcastable`
      );
    }
    out.unshift(Math.max(da, db));
  }
  return out;
}

/**
 * Given a gradient laid out in `broadcasted` shape, sum it back down to
 * `original` shape (the reverse of broadcasting).
 */
export function unbroadcast(
  grad: Float64Array,
  broadcasted: Shape,
  original: Shape
): Float64Array {
  if (shapesEqual(broadcasted, original)) return grad;

  const result = new Float64Array(numel(original));
  const bStrides = strides(broadcasted);
  const oStrides = strides(original);
  const padded = [
    ...new Array(broadcasted.length - original.length).fill(1),
    ...original,
  ];

  for (let flat = 0; flat < grad.length; flat++) {
    // Decode flat index into multi-index in broadcasted shape.
    let rem = flat;
    let oFlat = 0;
    for (let d = 0; d < broadcasted.length; d++) {
      const idx = Math.floor(rem / bStrides[d]);
      rem -= idx * bStrides[d];
      const origDim = padded[d];
      const origAxis = d - (broadcasted.length - original.length);
      if (origAxis >= 0) {
        const useIdx = origDim === 1 ? 0 : idx;
        oFlat += useIdx * oStrides[origAxis];
      }
    }
    result[oFlat] += grad[flat];
  }
  return result;
}

/** Multi-index for a flat position under given strides. */
export function unravel(flat: number, shp: Shape): number[] {
  const st = strides(shp);
  const idx: number[] = [];
  let rem = flat;
  for (let d = 0; d < shp.length; d++) {
    idx.push(Math.floor(rem / st[d]));
    rem -= idx[d] * st[d];
  }
  return idx;
}

/** Flat position for a (possibly broadcast) multi-index against a shape. */
export function broadcastIndex(
  multiIdx: number[],
  shape: Shape,
  st: number[]
): number {
  let flat = 0;
  const offset = multiIdx.length - shape.length;
  for (let d = 0; d < shape.length; d++) {
    const dim = shape[d];
    const idx = multiIdx[d + offset];
    flat += (dim === 1 ? 0 : idx) * st[d];
  }
  return flat;
}
