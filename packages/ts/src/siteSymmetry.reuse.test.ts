/**
 * A list asked for many directions is checked once: siteSymmetryOf and orbitOf remember a list they
 * have checked (`checkGroup`) and made exact (`exactList`), by its content. Counted in matrix
 * products, not in time, so that the test does not depend on the load of the machine; the run times
 * are in `npm run benchmark`. The count relies on the group check (`groupDefect`) forming its
 * products with `multiply` of linalg.js, which a mock counts; the mock replaces linalg.js for the
 * whole file, so this test has a file of its own.
 */

import { describe, expect, it, vi } from 'vitest';

const products = vi.hoisted(() => ({ count: 0 }));
vi.mock('./linalg.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./linalg.js')>();
  return {
    ...actual,
    multiply: (...args: Parameters<typeof actual.multiply>) => {
      products.count++;
      return actual.multiply(...args);
    },
  };
});

import * as classes from './index.js';

/** The operations of m-3m with entry (0, 0) of operation `i` moved by `by`, well within the tolerance. */
const moved = (i: number, by: number): readonly classes.CartesianOperation[] =>
  classes.operations('m-3m').map((op, k) => ({
    cartesian: op.cartesian.map((row, r) => row.map((x, c) => (k === i && r === 0 && c === 0 ? x + by : x))),
  })) as unknown as readonly classes.CartesianOperation[];

/** The matrix products of one call. */
const counted = (call: () => unknown): number => {
  products.count = 0;
  call();
  return products.count;
};

describe('a list asked for many directions is checked once', () => {
  it('the first call checks the 48 operations of m-3m, later calls on the same list do not', () => {
    // A list no other test of this file uses.
    const ops = moved(5, 1e-13);
    const n = ops.length;
    // groupDefect forms the product of every ordered pair, n² of them.
    expect(counted(() => classes.siteSymmetryOf(ops, [1, 2, 3]))).toBeGreaterThanOrEqual(n * n);
    for (const call of [
      (i: number) => classes.siteSymmetryOf(ops, [1, 2, 4 + i]),
      (i: number) => classes.orbitOf(ops, [1, 2, 4 + i]),
    ]) {
      const total = counted(() => {
        for (let i = 0; i < 100; i++) call(i);
      });
      // At most one product per operation and call (the images of an orbit), not a check of the pairs.
      expect(total / 100).toBeLessThanOrEqual(n);
    }
  });

  it('a list of other content is checked and made exact anew, after one it is near has been remembered', () => {
    // Two lists in the same group, each new to this file: the first fills both caches, the second
    // differs from it in one entry and costs as much as a first call (both caches keyed by content).
    const first = moved(7, 2e-13);
    const second = moved(7, 3e-13);
    const full = counted(() => classes.orbitOf(first, [1, 2, 3]));
    expect(counted(() => classes.orbitOf(first, [1, 2, 5]))).toBeLessThanOrEqual(first.length);
    expect(counted(() => classes.orbitOf(second, [1, 2, 3]))).toBeGreaterThanOrEqual(full);
  });
});
