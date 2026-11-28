/**
 * A list asked for many directions is checked once: siteSymmetryOf and orbitOf remember a list they
 * have checked and made exact, by its content. Counted in matrix products (a mock of linalg.js that
 * counts multiply), not in time, so that the test does not depend on the load of the machine; the
 * run times are in `npm run benchmark`.
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

describe('a list asked for many directions is checked once', () => {
  it('the first call checks every pair of the 48 operations of m-3m, later calls on the same list none', () => {
    // A list no test of this file has seen: one entry moved by 10⁻¹³, well within the tolerance.
    const ops = classes.operations('m-3m').map((op, i) => ({
      cartesian: op.cartesian.map((row, r) => row.map((x, c) => (i === 5 && r === 0 && c === 0 ? x + 1e-13 : x))),
    })) as unknown as readonly classes.CartesianOperation[];
    const n = ops.length;
    products.count = 0;
    classes.siteSymmetryOf(ops, [1, 2, 3]);
    // Whether a list is a group needs the product of every ordered pair of distinct operations.
    expect(products.count).toBeGreaterThanOrEqual(n * (n - 1));
    for (const call of [
      (i: number) => classes.siteSymmetryOf(ops, [1, 2, 4 + i]),
      (i: number) => classes.orbitOf(ops, [1, 2, 4 + i]),
    ]) {
      products.count = 0;
      for (let i = 0; i < 100; i++) call(i);
      // At most one product per operation and call (the images of an orbit), not a check of the pairs.
      expect(products.count / 100).toBeLessThanOrEqual(n);
    }
  });

  it('a list with other content is checked anew', () => {
    const ops = classes.operations('m-3m').map((op, i) => ({
      cartesian: op.cartesian.map((row, r) => row.map((x, c) => (i === 7 && r === 1 && c === 1 ? x + 2e-13 : x))),
    })) as unknown as readonly classes.CartesianOperation[];
    products.count = 0;
    classes.orbitOf(ops, [1, 2, 3]);
    expect(products.count).toBeGreaterThanOrEqual(ops.length * (ops.length - 1));
  });
});
