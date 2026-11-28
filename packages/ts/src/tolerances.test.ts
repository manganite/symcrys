/**
 * Each kind of tolerance just below and just above its threshold (docs/conventions.md,
 * "Tolerances"): at 0.9 and 1.1 times the tolerance, the default `EPSILON` and 10⁻³, measured in the
 * metric of its kind. The deviations are made by hand, and the expected answers follow from the
 * definition of each metric, not from symcrys.
 */

import { describe, expect, it } from 'vitest';
import * as classes from './index.js';
import * as plane from './plane.js';
import type { Mat3 } from './linalg.js';

const TOLERANCES = [classes.EPSILON, 1e-3];
const BELOW = 0.9;
const ABOVE = 1.1;

describe('operations: per matrix entry, between matrices and of RᵀR − 1', () => {
  // A rotation by φ about z differs from the identity by sin φ in its largest entry: within the
  // tolerance it is the identity, beyond it a rotation of infinite order (no finite group).
  const turned = (s: number): Mat3 => {
    const c = Math.sqrt(1 - s * s);
    return [
      [c, -s, 0],
      [s, c, 0],
      [0, 0, 1],
    ];
  };
  // R = diag(√(1 + d), 1, 1): the entry (0, 0) of RᵀR − 1 is d.
  const stretched = (d: number): Mat3 => [
    [Math.sqrt(1 + d), 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: a matrix ${BELOW}t from the identity is the identity, ${ABOVE}t is not`, () => {
      expect(classes.pointGroupOf([{ cartesian: turned(BELOW * t) }], { tolerance: t })?.key).toBe('1');
      expect(() => classes.pointGroupOf([{ cartesian: turned(ABOVE * t) }], { tolerance: t })).toThrow(
        /no finite point group/,
      );
    });

    it(`at the tolerance ${t}: rotateTensor and pointGroupOf take RᵀR − 1 of ${BELOW}t, refuse ${ABOVE}t`, () => {
      expect(classes.rotateTensor([0, 0, 1], stretched(BELOW * t), 'pyroelectric', { tolerance: t })).toHaveLength(3);
      expect(() => classes.rotateTensor([0, 0, 1], stretched(ABOVE * t), 'pyroelectric', { tolerance: t })).toThrow(
        /not an orthogonal/,
      );
      expect(classes.pointGroupOf([{ cartesian: stretched(BELOW * t) }], { tolerance: t })?.key).toBe('1');
      expect(() => classes.pointGroupOf([{ cartesian: stretched(ABOVE * t) }], { tolerance: t })).toThrow(
        /not an orthogonal/,
      );
    });
  }
});

describe('directions: the Euclidean distance ‖v − Pv‖ of the unit vector to the element', () => {
  // A unit vector at the Euclidean distance s from the fourfold axis of 4mm, on the mirror y = 0
  // and on the mirror x = y: on the diagonal each coordinate is only s/√2 off the axis, so a
  // distance per coordinate would put it within the tolerance at 1.1t.
  const onMirror = (s: number): [number, number, number] => [s, 0, Math.sqrt(1 - s * s)];
  const onDiagonal = (s: number): [number, number, number] => [s / Math.SQRT2, s / Math.SQRT2, Math.sqrt(1 - s * s)];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: within ${BELOW}t of the fourfold axis 4mm, at ${ABOVE}t the mirror it lies on`, () => {
      const ops = classes.operations('4mm');
      for (const v of [onMirror, onDiagonal]) {
        expect(classes.siteSymmetryOf(ops, v(BELOW * t), { tolerance: t }).operations).toHaveLength(8);
        expect(classes.siteSymmetry('4mm', { cartesian: v(BELOW * t) }, { tolerance: t }).operations).toHaveLength(8);
      }
      const mirror = classes.siteSymmetryOf(ops, onMirror(ABOVE * t), { tolerance: t });
      expect(mirror.operations).toHaveLength(2);
      expect(mirror.direction[1]).toBe(0);
      const diagonal = classes.siteSymmetry('4mm', { cartesian: onDiagonal(ABOVE * t) }, { tolerance: t });
      expect(diagonal.operations).toHaveLength(2);
      expect(diagonal.direction[0]).toBeCloseTo(diagonal.direction[1], 15);
    });
  }
});

describe('points of the plane: per coordinate in the lattice basis, modulo the lattice', () => {
  // (δ, 0) lies on the mirror y = 0 of p4mm, at δ from the point 0, 0 (and (1 − δ, 0) at δ modulo
  // the lattice). (0.8t, 0.8t) is 0.8t from 0, 0 per coordinate, 1.13t in the Euclidean norm.
  const listed = plane.operations('p4mm');
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: within ${BELOW}t of the origin 4mm, at ${ABOVE}t the mirror`, () => {
      for (const point of [
        [BELOW * t, 0],
        [1 - BELOW * t, 0],
        [0.8 * t, 0.8 * t],
      ]) {
        const s = plane.siteSymmetry('p4mm', { point }, { tolerance: t });
        expect(s.operations).toHaveLength(8);
        expect(s.point).toEqual([0, 0]);
        expect(plane.siteSymmetryOf(listed, { point }, { tolerance: t }).operations).toHaveLength(8);
      }
      for (const x of [ABOVE * t, 1 - ABOVE * t]) {
        const s = plane.siteSymmetry('p4mm', { point: [x, 0] }, { tolerance: t });
        expect(s.operations).toHaveLength(2);
        expect(s.point).toEqual([x, 0]);
        expect(plane.siteSymmetryOf(listed, { point: [x, 0] }, { tolerance: t }).operations).toHaveLength(2);
      }
    });
  }
});

describe('the metric of a cell: per entry of WᵀGW − G, relative to the largest entry of G', () => {
  // A cubic cell of edge 3 stretched along c: G = diag(9, 9, 9c²). A W that takes c to a gives the
  // entry 9(1 − c²), relative to 9c² the deviation r = 1 − 1/c², so c = 1/√(1 − r); the edge 3
  // makes an absolute comparison of 9(c² − 1) ≈ 9r give another answer.
  const stretched = (r: number): Mat3 => [
    [3, 0, 0],
    [0, 3, 0],
    [0, 0, 3 / Math.sqrt(1 - r)],
  ];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: a deviation of ${BELOW}t keeps the 48 operations of m-3m, ${ABOVE}t the 16 of 4/mmm`, () => {
      const ops = classes.operations('m-3m');
      expect(classes.residualOperationsOf(ops, stretched(BELOW * t), { tolerance: t })).toHaveLength(48);
      expect(classes.residualOperationsOf(ops, stretched(ABOVE * t), { tolerance: t })).toHaveLength(16);
    });
  }
});

describe('the index symmetry of a tensor: per component, relative to its largest component', () => {
  // The piezoelectric d_xyz = 100 and its partner d_xzy = 100(1 + η): the difference 100η relative
  // to the largest component 100(1 + η) is r = η/(1 + η), so η = r/(1 − r); the scale 100 makes an
  // absolute comparison give another answer.
  const tensor = (r: number): number[] => {
    const t = new Array<number>(27).fill(0);
    t[5] = 100; // x y z: 0·9 + 1·3 + 2
    t[7] = 100 * (1 + r / (1 - r)); // x z y: 0·9 + 2·3 + 1
    return t;
  };
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: toVoigt takes a deviation of ${BELOW}t, refuses ${ABOVE}t`, () => {
      expect(classes.toVoigt(tensor(BELOW * t), 'piezoelectric', { factors: [2], tolerance: t })).toHaveLength(3);
      expect(() => classes.toVoigt(tensor(ABOVE * t), 'piezoelectric', { factors: [2], tolerance: t })).toThrow(
        /lacks the index symmetry/,
      );
    });
  }

  it('refuses a deviation of exactly the tolerance: two numbers are equal when they differ by less', () => {
    // d_xzy = 1/2 against d_xyz = 1: the difference 1/2 is the tolerance 1/2 times the largest component, exactly.
    const t = new Array<number>(27).fill(0);
    t[5] = 1;
    t[7] = 0.5;
    expect(() => classes.toVoigt(t, 'piezoelectric', { factors: [2], tolerance: 0.5 })).toThrow(
      /lacks the index symmetry/,
    );
  });
});

describe('the internal tolerances', () => {
  it('are named in tolerances.ts: library code has no other literal in exponent notation', async () => {
    const { readdirSync, readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = import.meta.dirname;
    const library = (readdirSync(root, { recursive: true }) as string[]).filter(
      (f) =>
        f.endsWith('.ts') &&
        !/\.test\.ts$|\.fixtures\.ts$/.test(f) &&
        !f.startsWith('testUtils') &&
        f !== 'tolerances.ts',
    );
    expect(library.length).toBeGreaterThan(50);
    const found = library.flatMap((f) =>
      [...readFileSync(join(root, f), 'utf8').matchAll(/\b\d+(?:\.\d+)?e-\d+\b/g)].map((m) => `${f}: ${m[0]}`),
    );
    expect(found).toEqual([]);
  });
});
