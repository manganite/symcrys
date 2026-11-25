/**
 * `residualOperations` of the plane (#119): the operations of a list whose matrix W keeps the metric
 * of a cell, WᵀGW = G. Expected values by the definition, computed here independently of the
 * library, and by the lattice symmetry the restrictions of ITA Table 2.1.1.1 name (a square cell
 * keeps 4mm, a rectangular one 2mm, an oblique one 2).
 */

import { describe, expect, it } from 'vitest';
import * as plane from '../plane.js';

type M2 = readonly (readonly number[])[];
const cell = (a: number, b: number, gammaDeg: number): M2 => {
  const g = (gammaDeg * Math.PI) / 180;
  return [
    [a, b * Math.cos(g)],
    [0, b * Math.sin(g)],
  ];
};
/** WᵀGW = G by the definition, G = AᵀA, relative to the largest entry of G. */
function keeps(w: M2, basis: M2, tol = 1e-6): boolean {
  const g = [0, 1].map((i) => [0, 1].map((j) => basis[0][i] * basis[0][j] + basis[1][i] * basis[1][j]));
  const scale = Math.max(...g.flat().map(Math.abs));
  return [0, 1].every((i) =>
    [0, 1].every((j) => {
      let s = 0;
      for (let k = 0; k < 2; k++) for (let l = 0; l < 2; l++) s += w[k][i] * g[k][l] * w[l][j];
      return Math.abs(s - g[i][j]) < tol * scale;
    }),
  );
}

describe('residualOperations of the plane', () => {
  const cases: [string, M2, number][] = [
    ['p4mm', cell(3, 3, 90), 8],
    ['p4mm', cell(3, 3.1, 90), 4],
    ['p4mm', cell(3, 3, 91), 4],
    ['p4mm', cell(3, 3.1, 93), 2],
    ['p6mm', cell(2, 2, 120), 12],
    ['p6mm', cell(2, 2.2, 120), 2],
    ['p6mm', cell(2, 2, 118), 4],
    ['c2mm', cell(3, 5, 90), 8],
    ['c2mm', cell(3, 5, 95), 4],
  ];
  for (const [key, basis, count] of cases) {
    it(`${key} in a cell ${basis.map((r) => r.map((x) => x.toFixed(3)).join(' ')).join('; ')}`, () => {
      const ops = plane.operations(key as plane.PlaneGroupKey);
      const kept = plane.residualOperations(ops, basis as plane.Mat2);
      expect(kept).toHaveLength(count);
      // Exactly the operations that keep the metric by the definition, in the order of the list.
      expect(kept).toEqual(ops.filter((op) => keeps(op.matrix, basis)));
      // The operations themselves, not copies; the list frozen.
      expect(kept.every((op) => ops.includes(op))).toBe(true);
      expect(Object.isFrozen(kept)).toBe(true);
    });
  }

  it('takes the tolerance of the metric, relative to the largest entry of G', () => {
    const ops = plane.operations('p4mm');
    // b longer by 10⁻⁵: G differs by about 2·10⁻⁵ relative, above the default 10⁻⁶.
    const near = cell(1, 1 + 1e-5, 90) as plane.Mat2;
    expect(plane.residualOperations(ops, near)).toHaveLength(4);
    expect(plane.residualOperations(ops, near, { tolerance: 1e-4 })).toHaveLength(8);
    // A tolerance up to the bound of the metric, 1, which the bound of operations (0.1) would refuse.
    expect(plane.residualOperations(ops, cell(1, 1.3, 90) as plane.Mat2, { tolerance: 0.5 })).toHaveLength(8);
    expect(() => plane.residualOperations(ops, near, { tolerance: 1 })).toThrow(RangeError);
  });

  it('does not depend on the unit of the lengths', () => {
    const ops = plane.operations('p4mm');
    const basis = cell(3, 3.1, 90);
    const scaled = basis.map((r) => r.map((x) => x * 1e6));
    expect(plane.residualOperations(ops, scaled as unknown as plane.Mat2)).toEqual(
      plane.residualOperations(ops, basis as plane.Mat2),
    );
  });

  it('refuses a Cartesian matrix and a singular basis', () => {
    expect(() =>
      plane.residualOperations(
        [
          {
            matrix: [
              [0.5, -0.866],
              [0.866, 0.5],
            ],
          },
        ],
        cell(1, 1, 120) as plane.Mat2,
      ),
    ).toThrow(RangeError);
    expect(() =>
      plane.residualOperations(plane.operations('p2'), [
        [1, 2],
        [1, 2],
      ]),
    ).toThrow(RangeError);
  });
});
