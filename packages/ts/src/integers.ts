/**
 * Integer helpers shared by the modules (the one place for them).
 */

/**
 * The greatest common divisor of two integers, not negative; gcd(0, 0) = 0. Throws for a number that
 * is not finite (the loop would not end); every caller passes safe integers.
 */
export function gcd(a: number, b: number): number {
  if (!(Number.isFinite(a) && Number.isFinite(b))) throw new Error(`gcd of ${String(a)} and ${String(b)}`);
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** Throws unless `value` is a safe integer. */
export function checkSafeInteger(value: number, what: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${what} must be a safe integer, not ${String(value)}`);
  }
  return value;
}

/** The product a·b of two safe integers; throws if it leaves the safe integers. */
export function safeProduct(a: number, b: number): number {
  return checkSafeInteger(a * b, 'An intermediate product');
}

/** The sum a + b of two safe integers; throws if it leaves the safe integers. */
export function safeSum(a: number, b: number): number {
  return checkSafeInteger(a + b, 'An intermediate sum');
}

/** The sum of the products a[i]·b[i] of two lists of safe integers; throws if a value leaves the safe integers. */
export function safeDot(a: readonly number[], b: readonly number[]): number {
  return a.reduce((sum, x, i) => safeSum(sum, safeProduct(x, b[i])), 0);
}

// --- integer vectors of three components ---------------------------------------------------------
//
// Exact, on safe integers: the canonical forms of the subspaces of faces and directions of the
// point groups and the metric conditions of the plane. Row reduction in floating point, with
// tolerances for float noise, is a different routine (tensors/rowEchelon.ts) and stays apart.

/** A primitive integer vector: divided by the gcd of its components. */
export function primitive(v: readonly number[]): number[] {
  const g = v.reduce((a, x) => gcd(a, x), 0);
  return g === 0 ? [...v] : v.map((x) => x / g + 0);
}

/** The primitive integer vector along `v` with its first non-zero component positive, for a non-zero `v`. */
export function signedPrimitive(v: readonly number[]): number[] {
  const p = primitive(v);
  return (p.find((x) => x !== 0) ?? 0) < 0 ? p.map((x) => -x + 0) : p;
}

/**
 * The reduced row echelon form of the span of integer vectors, each row scaled to a primitive
 * integer vector with a positive pivot: the canonical form of a subspace, and the notation of ITA's
 * first representatives (`x,-x,z` is the span of (1,−1,0) and (0,0,1)).
 */
export function echelon(vectors: readonly (readonly number[])[]): { rows: number[][]; pivots: number[] } {
  // Fraction-free elimination on integers, then each row made primitive.
  const m = vectors.map((v) => [...v]).filter((v) => v.some((x) => x !== 0));
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < 3 && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && row[c] !== 0);
    if (p < 0) continue;
    [m[r], m[p]] = [m[p], m[r]];
    if (m[r][c] < 0) m[r] = m[r].map((x) => -x);
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c] === 0) continue;
      const a = m[r][c];
      const b = m[i][c];
      m[i] = primitive(m[i].map((x, j) => a * x - b * m[r][j]));
    }
    m[r] = primitive(m[r]);
    pivots.push(c);
    r++;
  }
  return { rows: m.slice(0, r), pivots };
}

/** A basis of the integer vectors v with A·v = 0 for the given rows A. */
export function nullspace(rows: readonly (readonly number[])[]): number[][] {
  const { rows: e, pivots } = echelon(rows);
  const free = [0, 1, 2].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    // v[f] = L, v[pivot p] = −e[i][f]·L / e[i][p] with L the lcm of the pivots.
    const l = e.reduce((acc, row, i) => (acc * row[pivots[i]]) / gcd(acc, row[pivots[i]]), 1);
    const v = [0, 0, 0];
    v[f] = l;
    e.forEach((row, i) => (v[pivots[i]] = (-row[f] * l) / row[pivots[i]]));
    return primitive(v);
  });
}
