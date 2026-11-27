/**
 * Reproducible noisy input for tests: a seeded random generator, operations with every Cartesian
 * entry moved by a bounded amount, and the operator norm that measures how far such an operation
 * moves a unit vector.
 */

import type { Mat3, Vec3 } from '../linalg.js';

/**
 * The minimal standard generator of Park and Miller in [0, 1): the same sequence for the same seed
 * (1 to 2³¹ − 2) in every run. Its products stay below 2⁴⁷, so they are exact in doubles, and its
 * period is 2³¹ − 2.
 */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
}

/**
 * The operations with every Cartesian entry moved by a uniform amount in [−amplitude, amplitude],
 * entries in the order operation, row, column; other fields kept.
 */
export function noisy<T extends { readonly cartesian: Mat3 }>(
  operations: readonly T[],
  amplitude: number,
  random: () => number,
): T[] {
  return operations.map((op) => ({
    ...op,
    cartesian: op.cartesian.map((row) => row.map((v) => v + (2 * random() - 1) * amplitude)) as unknown as Mat3,
  }));
}

const apply = (m: readonly (readonly number[])[], v: readonly number[]): Vec3 =>
  m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as unknown as Vec3;

/**
 * The operator norm ‖A − B‖₂: the largest distance by which A moves a unit vector away from where B
 * moves it, the square root of the largest eigenvalue of DᵀD (D = A − B), by power iteration.
 */
export function operatorDistance(a: Mat3, b: Mat3): number {
  const d = a.map((row, i) => row.map((v, j) => v - b[i][j]));
  const dt = d[0].map((_, j) => d.map((row) => row[j]));
  let best = 0;
  // Three starting vectors, so that none is orthogonal to the leading eigenvector.
  for (const start of [
    [1, 0, 0],
    [0, 1, 0],
    [0.3, 0.5, 0.8],
  ]) {
    let x: readonly number[] = start;
    for (let k = 0; k < 200; k++) {
      const y = apply(dt, apply(d, x));
      const n = Math.hypot(...y);
      if (n === 0) break;
      x = y.map((t) => t / n);
    }
    best = Math.max(best, Math.hypot(...apply(d, x)));
  }
  return best;
}

/** The numbers written in a message, e.g. the tolerance and the deviation an error names. */
export function numbersIn(message: string): number[] {
  return [...message.matchAll(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)].map((m) => Number(m[0]));
}
