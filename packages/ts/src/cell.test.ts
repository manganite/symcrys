/**
 * Unit cell, metric and angles. Expected values are hand calculations from the definitions (ITA
 * Vol. A, 2006, Section 8.1.4 for the lattice parameters; Part 9.1, Tables 9.1.7.1 and 9.1.7.2 for
 * the metric tensors of the Bravais lattices; Borchardt-Ott & Sowa, Chapter 5 for the angles),
 * class (b) of CLAUDE.md "Correctness and provenance": not library output.
 */

import { describe, expect, it } from 'vitest';
import {
  angleBetweenDirections,
  angleBetweenPlanes,
  isValidCell,
  latticeFromParameters,
  latticeParameters,
  metricTensor,
  reciprocalBasis,
  residualMagneticOperations,
  residualOperations,
} from './cell.js';
import { latticeBasis } from './lattice.js';
import { latticeOperations } from './pointGroups/orbits.js';
import type { Mat3 } from './linalg.js';

const DEG = Math.PI / 180;
const column = (m: Mat3, j: number) => [m[0][j], m[1][j], m[2][j]];
/** k·m as a mutable copy. */
const times = (m: Mat3, k: number): number[][] => m.map((row) => row.map((x) => k * x));
const closeMat = (m: Mat3 | number[][], e: number[][], digits = 12) =>
  e.forEach((row, i) => row.forEach((x, j) => expect(m[i][j]).toBeCloseTo(x, digits)));

describe('latticeFromParameters: the frame a ∥ x, b in the xy plane, c towards +z', () => {
  it('cubic: edge lengths on the diagonal', () => {
    expect(latticeFromParameters({ a: 2, b: 2, c: 2, alpha: 90, beta: 90, gamma: 90 })).toEqual([
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
    ]);
  });

  it('hexagonal: the basis of latticeBasis with the edge lengths', () => {
    const m = latticeFromParameters({ a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 });
    const unit = latticeBasis('hexagonal');
    closeMat(m, [
      [3 * unit[0][0], 3 * unit[0][1], 0],
      [0, 3 * unit[1][1], 0],
      [0, 0, 5],
    ]);
    closeMat(m, [
      [3, -1.5, 0],
      [0, (3 * Math.sqrt(3)) / 2, 0],
      [0, 0, 5],
    ]);
  });

  it('monoclinic, unique axis b: b ∥ y and c = (c cos β, 0, c sin β)', () => {
    const m = latticeFromParameters({ a: 3, b: 4, c: 5, alpha: 90, beta: 100, gamma: 90 });
    closeMat(m, [
      [3, 0, 5 * Math.cos(100 * DEG)],
      [0, 4, 0],
      [0, 0, 5 * Math.sin(100 * DEG)],
    ]);
  });

  it('triclinic: the lengths and the angles are the ones given, and the basis is right-handed', () => {
    const p = { a: 1, b: 1.2, c: 1.5, alpha: 80, beta: 95, gamma: 105 };
    const m = latticeFromParameters(p);
    const [a, b, c] = [0, 1, 2].map((j) => column(m, j));
    const len = (v: number[]) => Math.hypot(v[0], v[1], v[2]);
    const dot = (u: number[], v: number[]) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
    expect(len(a)).toBeCloseTo(1, 12);
    expect(len(b)).toBeCloseTo(1.2, 12);
    expect(len(c)).toBeCloseTo(1.5, 12);
    expect(dot(b, c) / (len(b) * len(c))).toBeCloseTo(Math.cos(80 * DEG), 12);
    expect(dot(a, c) / (len(a) * len(c))).toBeCloseTo(Math.cos(95 * DEG), 12);
    expect(dot(a, b) / (len(a) * len(b))).toBeCloseTo(Math.cos(105 * DEG), 12);
    expect(a[1]).toBe(0);
    expect(a[2]).toBe(0);
    expect(b[2]).toBe(0);
    expect(c[2]).toBeGreaterThan(0);
    // the volume is abc √(1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ)
    const [ca, cb, cg] = [80, 95, 105].map((x) => Math.cos(x * DEG));
    const volume = 1 * 1.2 * 1.5 * Math.sqrt(1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg);
    const det =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    expect(det).toBeCloseTo(volume, 12);
  });

  it('refuses edges that are not positive and angles that give no cell', () => {
    expect(() => latticeFromParameters({ a: 0, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90 })).toThrow(RangeError);
    expect(() => latticeFromParameters({ a: 1, b: -1, c: 1, alpha: 90, beta: 90, gamma: 90 })).toThrow(RangeError);
    expect(() => latticeFromParameters({ a: 1, b: 1, c: 1, alpha: 60, beta: 60, gamma: 150 })).toThrow(RangeError);
  });
});

describe('latticeParameters', () => {
  it('inverts latticeFromParameters', () => {
    for (const p of [
      { a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90 },
      { a: 3, b: 3, c: 5, alpha: 90, beta: 90, gamma: 120 },
      { a: 3, b: 4, c: 5, alpha: 90, beta: 100, gamma: 90 },
      { a: 1, b: 1.2, c: 1.5, alpha: 80, beta: 95, gamma: 105 },
      { a: 2.5, b: 0.8, c: 3.1, alpha: 120, beta: 70, gamma: 60 },
    ]) {
      const q = latticeParameters(latticeFromParameters(p));
      for (const k of Object.keys(p) as (keyof typeof p)[]) expect(q[k]).toBeCloseTo(p[k], 10);
    }
  });

  it('does not depend on how the basis sits in the Cartesian frame', () => {
    // a rotation by 90° about z: a → y, b → −x
    const m: Mat3 = [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 2],
    ];
    const q = latticeParameters(m);
    expect(q).toMatchObject({ a: 1, b: 1, c: 2 });
    expect(q.gamma).toBeCloseTo(90, 12);
  });

  it('refuses a singular basis', () => {
    expect(() =>
      latticeParameters([
        [1, 0, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]),
    ).toThrow(RangeError);
  });
});

describe('cells in any unit of length', () => {
  // Hand calculation: for B = k·A the reciprocal basis is (A⁻¹)ᵀ / k, and angles do not change.
  const p = { a: 4.9, b: 4.9, c: 5.4, alpha: 90, beta: 90, gamma: 120 }; // quartz-like cell, ångström
  for (const [unit, k] of [
    ['metres', 1e-10],
    ['nanometres', 0.1],
    ['ångström', 1],
    ['picometres', 100],
  ] as const) {
    it(`gives the same reciprocal basis (scaled) and the same angles in ${unit}`, () => {
      const scaled = latticeFromParameters({ ...p, a: p.a * k, b: p.b * k, c: p.c * k });
      const ref = reciprocalBasis(latticeFromParameters(p));
      closeMat(times(reciprocalBasis(scaled), k), times(ref, 1), 10);
      // (100) and (010) of a hexagonal cell: their normals a* and b* make 60°.
      expect(angleBetweenPlanes(scaled, [1, 0, 0], [0, 1, 0])).toBeCloseTo(60, 10);
      expect(angleBetweenDirections(scaled, [1, 0, 0], [0, 1, 0])).toBeCloseTo(120, 10);
      expect(latticeParameters(scaled).gamma).toBeCloseTo(120, 10);
    });
  }
  it('cubic cell of edge 0.001: reciprocal basis 1000·I, (100)∧(110) = 45°', () => {
    const tiny: Mat3 = [
      [1e-3, 0, 0],
      [0, 1e-3, 0],
      [0, 0, 1e-3],
    ];
    closeMat(
      reciprocalBasis(tiny),
      [
        [1000, 0, 0],
        [0, 1000, 0],
        [0, 0, 1000],
      ],
      8,
    );
    expect(angleBetweenPlanes(tiny, [1, 0, 0], [1, 1, 0])).toBeCloseTo(45, 10);
  });
});

describe('isValidCell', () => {
  it('accepts angles that give a cell', () => {
    expect(isValidCell({ alpha: 90, beta: 90, gamma: 90 })).toBe(true);
    expect(isValidCell({ alpha: 90, beta: 90, gamma: 120 })).toBe(true);
    expect(isValidCell({ alpha: 80, beta: 95, gamma: 105 })).toBe(true);
  });

  it('refuses three angles whose axes lie in one plane, and angles outside (0°, 180°)', () => {
    expect(isValidCell({ alpha: 60, beta: 60, gamma: 150 })).toBe(false); // cos² sum > 1 + 2 cos cos cos
    expect(isValidCell({ alpha: 60, beta: 60, gamma: 120 })).toBe(false); // exactly flat
    expect(isValidCell({ alpha: 90, beta: 90, gamma: 180 })).toBe(false);
    expect(isValidCell({ alpha: 0, beta: 90, gamma: 90 })).toBe(false);
    expect(isValidCell({ alpha: Number.NaN, beta: 90, gamma: 90 })).toBe(false);
  });

  it('minVolumeRatio refuses nearly flat cells: V / (abc) = sin γ here', () => {
    const nearlyFlat = { alpha: 90, beta: 90, gamma: Math.asin(0.05) / DEG };
    expect(isValidCell(nearlyFlat)).toBe(true);
    expect(isValidCell(nearlyFlat, { minVolumeRatio: 0.1 })).toBe(false);
    expect(isValidCell({ alpha: 90, beta: 90, gamma: 90 }, { minVolumeRatio: 1 })).toBe(true);
  });
});

describe('metricTensor and reciprocalBasis', () => {
  const mono = latticeFromParameters({ a: 3, b: 4, c: 5, alpha: 90, beta: 100, gamma: 90 });

  it('monoclinic: G = [[a², 0, ac cos β], [0, b², 0], [ac cos β, 0, c²]]', () => {
    const g15 = 15 * Math.cos(100 * DEG);
    closeMat(metricTensor(mono), [
      [9, 0, g15],
      [0, 16, 0],
      [g15, 0, 25],
    ]);
  });

  it('hexagonal: g₁₂ = −a²/2 (ITA Table 9.1.7.2)', () => {
    const hex = latticeFromParameters({ a: 2, b: 2, c: 3, alpha: 90, beta: 90, gamma: 120 });
    closeMat(metricTensor(hex), [
      [4, -2, 0],
      [-2, 4, 0],
      [0, 0, 9],
    ]);
  });

  it('monoclinic: |a*| = 1/(a sin β), |b*| = 1/b, |c*| = 1/(c sin β), and β* = 180° − β', () => {
    const b = reciprocalBasis(mono);
    const len = (j: number) => Math.hypot(...(column(b, j) as [number, number, number]));
    expect(len(0)).toBeCloseTo(1 / (3 * Math.sin(100 * DEG)), 12);
    expect(len(1)).toBeCloseTo(1 / 4, 12);
    expect(len(2)).toBeCloseTo(1 / (5 * Math.sin(100 * DEG)), 12);
    expect(latticeParameters(b).beta).toBeCloseTo(80, 10);
  });

  it('property: Aᵀ·B = 1 and G·G* = 1 for a triclinic cell', () => {
    const a = latticeFromParameters({ a: 1, b: 1.2, c: 1.5, alpha: 80, beta: 95, gamma: 105 });
    const b = reciprocalBasis(a);
    const aTb = [0, 1, 2].map((i) =>
      [0, 1, 2].map((j) => column(a, i).reduce((s, x, k) => s + x * column(b, j)[k], 0)),
    );
    closeMat(aTb as unknown as Mat3, [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    const g = metricTensor(a);
    const gStar = metricTensor(b);
    const product = [0, 1, 2].map((i) => [0, 1, 2].map((j) => g[i].reduce((s, x, k) => s + x * gStar[k][j], 0)));
    closeMat(product as unknown as Mat3, [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
  });
});

describe('angles', () => {
  const cubic = latticeFromParameters({ a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90 });
  const hex = latticeFromParameters({ a: 1, b: 1, c: 1.6, alpha: 90, beta: 90, gamma: 120 });
  const mono = latticeFromParameters({ a: 3, b: 4, c: 5, alpha: 90, beta: 100, gamma: 90 });

  it('cubic: (111)∧(001) = [111]∧[001] = arccos(1/√3) = 54.7356°, (110)∧(100) = 45°', () => {
    expect(angleBetweenPlanes(cubic, [1, 1, 1], [0, 0, 1])).toBeCloseTo(54.7356103172, 9);
    expect(angleBetweenDirections(cubic, [1, 1, 1], [0, 0, 1])).toBeCloseTo(54.7356103172, 9);
    expect(angleBetweenPlanes(cubic, [1, 1, 0], [1, 0, 0])).toBeCloseTo(45, 10);
  });

  it('hexagonal: [100]∧[010] = 120°, (100)∧(010) = 60°, (100)∧(1-10)… = 30° from the zone rule', () => {
    expect(angleBetweenDirections(hex, [1, 0, 0], [0, 1, 0])).toBeCloseTo(120, 10);
    expect(angleBetweenPlanes(hex, [1, 0, 0], [0, 1, 0])).toBeCloseTo(60, 10);
    // (100) and (110): the normals a* and a* + b* are at 30° (|a*| = |b*|, 60° between them)
    expect(angleBetweenPlanes(hex, [1, 0, 0], [1, 1, 0])).toBeCloseTo(30, 10);
  });

  it('monoclinic: [100]∧[001] = β and (100)∧(001) = 180° − β', () => {
    expect(angleBetweenDirections(mono, [1, 0, 0], [0, 0, 1])).toBeCloseTo(100, 10);
    expect(angleBetweenPlanes(mono, [1, 0, 0], [0, 0, 1])).toBeCloseTo(80, 10);
  });

  it('is symmetric, and 0° and 180° for equal and opposite vectors', () => {
    expect(angleBetweenDirections(mono, [1, 2, 3], [1, 2, 3])).toBe(0);
    expect(angleBetweenDirections(mono, [1, 2, 3], [-1, -2, -3])).toBeCloseTo(180, 12);
    expect(angleBetweenPlanes(hex, [1, 2, 0], [0, 1, 3])).toBeCloseTo(
      angleBetweenPlanes(hex, [0, 1, 3], [1, 2, 0]),
      12,
    );
  });

  it('refuses a zero vector', () => {
    expect(() => angleBetweenDirections(cubic, [0, 0, 0], [1, 0, 0])).toThrow(RangeError);
    expect(() => angleBetweenPlanes(cubic, [1, 0, 0], [0, 0, 0])).toThrow(RangeError);
  });
});

describe('residualOperations: the operations that keep the metric', () => {
  const cell = (p: { a: number; b: number; c: number; alpha?: number; beta?: number; gamma?: number }) =>
    latticeFromParameters({ alpha: 90, beta: 90, gamma: 90, ...p });

  it('keeps all 16 operations of 4/mmm for a = b, and the 8 of mmm for a ≠ b', () => {
    const ops = latticeOperations('4/mmm');
    expect(ops).toHaveLength(16);
    expect(residualOperations(ops, cell({ a: 2, b: 2, c: 3 }))).toHaveLength(16);
    expect(residualOperations(ops, cell({ a: 2, b: 2.1, c: 3 }))).toHaveLength(8);
  });

  it('m-3m: 48 for a cube, 16 (4/mmm) for a = b ≠ c, 2 (-1) for a general triclinic cell', () => {
    const ops = latticeOperations('m-3m');
    expect(ops).toHaveLength(48);
    expect(residualOperations(ops, cell({ a: 1, b: 1, c: 1 }))).toHaveLength(48);
    expect(residualOperations(ops, cell({ a: 1, b: 1, c: 1.3 }))).toHaveLength(16);
    expect(
      residualOperations(ops, latticeFromParameters({ a: 1, b: 1.2, c: 1.5, alpha: 80, beta: 95, gamma: 105 })),
    ).toHaveLength(2);
  });

  it('hexagonal axes: 6/mmm keeps 24 operations for γ = 120°; for a = b and γ = 121° the swap a ↔ b remains, so 8 (mmm)', () => {
    const ops = latticeOperations('6/mmm');
    expect(residualOperations(ops, cell({ a: 1, b: 1, c: 1.6, gamma: 120 }))).toHaveLength(24);
    expect(residualOperations(ops, cell({ a: 1, b: 1, c: 1.6, gamma: 121 }))).toHaveLength(8);
  });

  it('takes the tolerance relative to the largest entry of G, so that units do not matter', () => {
    const ops = latticeOperations('4/mmm');
    const small = residualOperations(ops, cell({ a: 1, b: 1 + 1e-9, c: 2 }));
    const big = residualOperations(ops, cell({ a: 1e3, b: 1e3 * (1 + 1e-9), c: 2e3 }));
    expect(small).toHaveLength(16);
    expect(big).toHaveLength(16);
    expect(residualOperations(ops, cell({ a: 1, b: 1.001, c: 2 }), { tolerance: 1e-2 })).toHaveLength(16);
    expect(residualOperations(ops, cell({ a: 1, b: 1.001, c: 2 }))).toHaveLength(8);
  });

  it('keeps the order of the operations and returns them as they came', () => {
    const ops = latticeOperations('4/mmm');
    const kept = residualOperations(ops, cell({ a: 2, b: 2.1, c: 3 }));
    expect(kept.every((op) => ops.includes(op))).toBe(true);
    expect(kept.map((op) => ops.indexOf(op))).toEqual([...kept.map((op) => ops.indexOf(op))].sort((x, y) => x - y));
  });
});

describe('input checks and edge cases', () => {
  const basis = latticeFromParameters({ a: 1, b: 1, c: 1, alpha: 90, beta: 90, gamma: 90 });
  it('residualOperations refuses malformed operations and tolerances with a RangeError', () => {
    expect(() =>
      residualOperations(
        [
          {
            matrix: [
              [1, 0],
              [0, 1],
            ],
          } as never,
        ],
        basis,
      ),
    ).toThrow(RangeError);
    expect(() => residualOperations([{} as never], basis)).toThrow(RangeError);
    expect(() => residualOperations(latticeOperations('4/mmm'), basis, { tolerance: Number.NaN })).toThrow(RangeError);
    expect(() => residualOperations(latticeOperations('4/mmm'), basis, { tolerance: -1 })).toThrow(RangeError);
  });
  it('isValidCell refuses a minVolumeRatio that is not a number from 0 to 1 with a RangeError', () => {
    const cube = { alpha: 90, beta: 90, gamma: 90 };
    for (const m of [Number.NaN, -1, -1e-12, 1.0001, 2, Infinity, -Infinity, '0.1' as unknown as number]) {
      expect(() => isValidCell(cube, { minVolumeRatio: m }), String(m)).toThrow(RangeError);
    }
    // the ends of the range are accepted: 0 accepts every cell, 1 only orthogonal axes (V = abc)
    expect(isValidCell(cube, { minVolumeRatio: 0 })).toBe(true);
    expect(isValidCell(cube, { minVolumeRatio: 1 })).toBe(true);
    expect(isValidCell({ alpha: 90, beta: 90, gamma: 120 }, { minVolumeRatio: 1 })).toBe(false);
  });
  it('a rhombohedral cell (α = β = γ = 80°) is valid and keeps the angles', () => {
    const q = latticeParameters(latticeFromParameters({ a: 1, b: 1, c: 1, alpha: 80, beta: 80, gamma: 80 }));
    expect([q.alpha, q.beta, q.gamma].map((x) => Math.round(x * 1e8) / 1e8)).toEqual([80, 80, 80]);
  });
  it('monoclinic, unique axis c: c ∥ z and the angle γ between a and b', () => {
    const m = latticeFromParameters({ a: 3, b: 4, c: 5, alpha: 90, beta: 90, gamma: 100 });
    expect([m[0][2], m[1][2], m[2][2]]).toEqual([0, 0, 5]);
    expect(latticeParameters(m).gamma).toBeCloseTo(100, 10);
  });
});

describe('residualMagneticOperations', () => {
  const cell = latticeFromParameters({ a: 2, b: 2.1, c: 3, alpha: 90, beta: 90, gamma: 90 });
  it('keeps timeReversal and refuses an operation that does not say whether it has it', () => {
    const ops = latticeOperations('4/mmm');
    expect(residualMagneticOperations(ops, cell)).toHaveLength(8);
    expect(() => residualMagneticOperations(ops.map((o) => ({ matrix: o.matrix })) as never, cell)).toThrow(RangeError);
  });
});
