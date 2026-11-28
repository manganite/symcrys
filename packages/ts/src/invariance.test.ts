/**
 * Invariance (#69): what does not depend on the unit of length, on the choice of the basis or on
 * the setting must not change with it. Expected values are the library's own answers in another
 * unit, basis or setting, so these tests check consistency, not print; the print anchors are the
 * reference tests.
 *
 * - **Unit of length:** angles, face normals and the operations a cell keeps do not change when all
 *   edges are scaled; the metric scales with the square.
 * - **Basis:** a change of the basis by a unimodular P (det ±1; ITA 2016 § 1.5) leaves angles between
 *   directions and between planes and the face normals unchanged, gives the metric of the new basis,
 *   and keeps the same operations of a distorted cell.
 * - **Setting:** the settings of a point group are one group in another orientation; the Cartesian
 *   rotation R between two settings carries the tensor forms of one onto those of the other, for
 *   the 52 groups with more than one setting (in both entry points, since a crystal class is a
 *   white group). For a trigonal group the rhombohedral setting has the Cartesian operations of
 *   setting 1 (R = identity), and the forms of 6'/mmm' chosen here do not change under the turn, so
 *   these six groups are checked trivially. The forms are compared as spans, which a factor ±1 does
 *   not change: the factor det R of an axial tensor in `rotateTensor` is checked in
 *   tensorForm.test.ts, not here.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as magnetic from './magnetic.js';
import * as plane from './plane.js';
import { matrixRank } from './testUtils/rank.js';

type M3 = readonly (readonly number[])[];
const mul = (a: M3, b: M3): number[][] =>
  a.map((r) => [0, 1, 2].map((j) => r[0] * b[0][j] + r[1] * b[1][j] + r[2] * b[2][j]));
const tr = (a: M3): number[][] => [0, 1, 2].map((i) => [0, 1, 2].map((j) => a[j][i]));
const close = (a: readonly number[], b: readonly number[], tol = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < tol);
const closeM = (a: M3, b: M3, tol = 1e-9) => a.every((r, i) => close(r, b[i], tol));

const CELLS: classes.LatticeParameters[] = [
  { a: 3.1, b: 4.7, c: 5.3, alpha: 82, beta: 97, gamma: 104 },
  { a: 4, b: 4, c: 6.5, alpha: 90, beta: 90, gamma: 120 },
  { a: 5.2, b: 5.2, c: 5.2, alpha: 70, beta: 70, gamma: 70 },
  { a: 2.9, b: 3.1, c: 3.05, alpha: 90.4, beta: 89.7, gamma: 90.2 },
];
const VECTORS: classes.Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [1, -2, 3],
  [2, 1, -1],
  [0, 1, 1],
];

describe('the unit of length', () => {
  for (const p of CELLS) {
    it(`a = ${p.a}, b = ${p.b}, c = ${p.c}, α = ${p.alpha}, β = ${p.beta}, γ = ${p.gamma}`, () => {
      const basis = classes.latticeFromParameters(p);
      for (const k of [1e-3, 7.5, 1e4]) {
        const scaled = classes.latticeFromParameters({ ...p, a: p.a * k, b: p.b * k, c: p.c * k });
        for (const u of VECTORS)
          for (const v of VECTORS) {
            if (u === v) continue;
            expect(classes.angleBetweenDirections(scaled, u, v)).toBeCloseTo(
              classes.angleBetweenDirections(basis, u, v),
              9,
            );
            expect(classes.angleBetweenPlanes(scaled, u, v)).toBeCloseTo(classes.angleBetweenPlanes(basis, u, v), 9);
          }
        for (const h of VECTORS) expect(close(classes.faceNormal(scaled, h), classes.faceNormal(basis, h))).toBe(true);
        expect(
          closeM(
            classes.metricTensor(scaled),
            classes.metricTensor(basis).map((r) => r.map((x) => x * k * k)),
            1e-9 * k * k * 100,
          ),
        ).toBe(true);
        const ops = classes.operations('m-3m');
        expect(classes.residualOperationsOf(ops, scaled)).toEqual(classes.residualOperationsOf(ops, basis));
      }
    });
  }

  it('in the plane', () => {
    const ops = plane.operations('p6mm');
    // A nearly hexagonal cell too, whose answer hangs on a tolerance relative to the metric.
    for (const [a, b, gamma] of [
      [2, 2, 120],
      [2, 2.3, 118],
      [3, 4, 90],
      [2, 2.01, 120.3],
    ]) {
      const basis = plane.latticeFromParameters({ a, b, gamma });
      for (const k of [1e-3, 1e3]) {
        const scaled = plane.latticeFromParameters({ a: a * k, b: b * k, gamma });
        expect(plane.residualOperationsOf(ops, scaled)).toEqual(plane.residualOperationsOf(ops, basis));
        expect(plane.latticeParameters(scaled).gamma).toBeCloseTo(gamma, 9);
      }
    }
  });
});

describe('the basis', () => {
  // Unimodular P (det ±1), so that integer indices stay integers (ITA 2016 § 1.5.1.3: the columns are the new
  // basis vectors in the old basis).
  const CHANGES: M3[] = [
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    [
      [1, 0, 1],
      [0, 1, -1],
      [0, 0, 1],
    ],
    [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, -1],
    ],
    // det P = −1: a change of handedness, which ITA allows.
    [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    [
      [1, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
    ],
  ];
  for (const p of CELLS) {
    it(`a = ${p.a}, b = ${p.b}, c = ${p.c}, α = ${p.alpha}, β = ${p.beta}, γ = ${p.gamma}`, () => {
      const basis = classes.latticeFromParameters(p);
      for (const P of CHANGES) {
        const newBasis = mul(basis, P) as unknown as classes.Mat3;
        const change = classes.changeOfCoordinates(
          { linearPart: P as classes.Mat3 },
          {
            directions: VECTORS,
            planes: VECTORS,
            metric: classes.metricTensor(basis),
            operations: classes.operations('6/mmm'),
          },
        );
        const d = change.directions!;
        const h = change.planes!;
        expect(closeM(change.metric!, classes.metricTensor(newBasis))).toBe(true);
        for (let i = 0; i < VECTORS.length; i++) {
          expect(close(classes.faceNormal(newBasis, h[i]), classes.faceNormal(basis, VECTORS[i]))).toBe(true);
          for (let j = 0; j < VECTORS.length; j++) {
            if (i === j) continue;
            expect(classes.angleBetweenDirections(newBasis, d[i], d[j])).toBeCloseTo(
              classes.angleBetweenDirections(basis, VECTORS[i], VECTORS[j]),
              9,
            );
            expect(classes.angleBetweenPlanes(newBasis, h[i], h[j])).toBeCloseTo(
              classes.angleBetweenPlanes(basis, VECTORS[i], VECTORS[j]),
              9,
            );
          }
        }
        // The operations a cell keeps: the same ones, by index, in either basis.
        const old = classes.operations('6/mmm');
        const transformed = change.operations!;
        const keptOld = classes.residualOperationsOf(old, basis).map((op) => old.indexOf(op));
        const keptNew = classes.residualOperationsOf(transformed, newBasis).map((op) => transformed.indexOf(op));
        expect(keptNew).toEqual(keptOld);
      }
    });
  }
});

/** Signed permutation matrices and turns about z by multiples of 15° (30° for the trigonal and hexagonal, 45° for the tetragonal settings): candidates for the rotation between two settings. */
const CANDIDATES: number[][][] = (() => {
  const perms = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  const signed: number[][][] = [];
  for (const p of perms)
    for (let s = 0; s < 8; s++) {
      const m = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (p[i] === j ? ((s >> i) & 1 ? -1 : 1) : 0)));
      signed.push(m);
    }
  const turns = Array.from({ length: 24 }, (_, k) => {
    const t = (k * Math.PI) / 12;
    return [
      [Math.cos(t), -Math.sin(t), 0],
      [Math.sin(t), Math.cos(t), 0],
      [0, 0, 1],
    ];
  });
  return turns.flatMap((t) => signed.map((s) => mul(t, s)));
})();

/** A rotation R with R·g·Rᵀ the operations of the second list, the time reversal kept. */
function rotationBetween(
  first: readonly { cartesian: M3; timeReversal?: boolean }[],
  second: readonly { cartesian: M3; timeReversal?: boolean }[],
): number[][] | undefined {
  return CANDIDATES.find((r) =>
    first.every((g) => {
      const c = mul(mul(r, g.cartesian), tr(r));
      return second.some(
        (h) => (h.timeReversal ?? false) === (g.timeReversal ?? false) && closeM(h.cartesian, c, 1e-9),
      );
    }),
  );
}

const sameSpan = (a: readonly (readonly number[])[], b: readonly (readonly number[])[], dim: number) =>
  matrixRank(a, dim) === matrixRank(b, dim) && matrixRank([...a, ...b], dim) === matrixRank(a, dim);

describe('the setting', () => {
  const SPECS: (magnetic.TensorSpec | magnetic.TensorPropertyName)[] = [
    'pyroelectric',
    'piezoelectric',
    'gyrotropic',
    'magnetoelectric',
    'piezomagnetic',
    'ferromagnetic',
    { rank: 4, kind: 'polar', timeParity: 'even', intrinsic: 'symmetric-pairs-exchangeable' },
  ];
  for (const key of magnetic.POINT_GROUP_KEYS.filter((k) => magnetic.settings(k).length > 1)) {
    it(key, () => {
      const first = magnetic.operations(key, { setting: 1 });
      for (const { index } of magnetic.settings(key).slice(1)) {
        const other = magnetic.operations(key, { setting: index });
        const r = rotationBetween(first, other);
        expect(r, `${key}: setting ${index} is setting 1 turned`).toBeDefined();
        for (const spec of SPECS) {
          const a = magnetic.tensorForm(key, spec, { setting: 1 });
          const b = magnetic.tensorForm(key, spec, { setting: index });
          const dim = 3 ** a.rank;
          const turned = a.basis.map((t) => magnetic.rotateTensor(t, r as unknown as magnetic.Mat3, spec));
          expect(sameSpan(turned, b.basis, dim), `${key} setting ${index}: ${JSON.stringify(spec)}`).toBe(true);
        }
      }
    });
  }
});
