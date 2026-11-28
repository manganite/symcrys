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

describe('operations: per matrix entry of RᵀR − 1', () => {
  // R = diag(1 + δ, 1, 1): the entry (0, 0) of RᵀR − 1 is (1 + δ)² − 1, so δ = √(1 + d) − 1 for a deviation d.
  const stretched = (d: number): Mat3 => [
    [Math.sqrt(1 + d), 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: rotateTensor and pointGroupOf take a deviation of ${BELOW}t, refuse ${ABOVE}t`, () => {
      expect(classes.rotateTensor([0, 0, 1], stretched(BELOW * t), 'pyroelectric', { tolerance: t })).toHaveLength(3);
      expect(() => classes.rotateTensor([0, 0, 1], stretched(ABOVE * t), 'pyroelectric', { tolerance: t })).toThrow(
        /not an orthogonal/,
      );
      expect(classes.pointGroupOf([{ cartesian: stretched(BELOW * t) }], { tolerance: t })?.key).toBe('1');
      expect(() => classes.pointGroupOf([{ cartesian: stretched(ABOVE * t) }], { tolerance: t })).toThrow(RangeError);
    });
  }
});

describe('directions: the distance ‖v − Pv‖ of the unit vector to the element', () => {
  // v = (sin θ, 0, cos θ) lies on the mirror y = 0 of 4mm, at the distance sin θ from the fourfold axis.
  const tilted = (s: number): [number, number, number] => [s, 0, Math.sqrt(1 - s * s)];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: within ${BELOW}t of the fourfold axis 4mm, at ${ABOVE}t the mirror`, () => {
      const ops = classes.operations('4mm');
      expect(classes.siteSymmetryOf(ops, tilted(BELOW * t), { tolerance: t }).operations).toHaveLength(8);
      expect(classes.siteSymmetryOf(ops, tilted(ABOVE * t), { tolerance: t }).operations).toHaveLength(2);
      expect(classes.siteSymmetry('4mm', { cartesian: tilted(BELOW * t) }, { tolerance: t }).operations).toHaveLength(
        8,
      );
      expect(classes.siteSymmetry('4mm', { cartesian: tilted(ABOVE * t) }, { tolerance: t }).operations).toHaveLength(
        2,
      );
    });
  }
});

describe('points of the plane: per coordinate in the lattice basis, modulo the lattice', () => {
  // (δ, 0) lies on the mirror y = 0 of p4mm, at δ from the point 0, 0 (and (1 − δ, 0) at δ modulo the lattice).
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: within ${BELOW}t of the origin 4mm, at ${ABOVE}t the mirror`, () => {
      for (const x of [BELOW * t, 1 - BELOW * t]) {
        const s = plane.siteSymmetry('p4mm', { point: [x, 0] }, { tolerance: t });
        expect(s.operations).toHaveLength(8);
        expect(s.point).toEqual([0, 0]);
      }
      for (const x of [ABOVE * t, 1 - ABOVE * t]) {
        expect(plane.siteSymmetry('p4mm', { point: [x, 0] }, { tolerance: t }).operations).toHaveLength(2);
      }
    });
  }
});

describe('the metric of a cell: per entry of WᵀGW − G, relative to the largest entry of G', () => {
  // A cubic cell stretched along c: G = diag(1, 1, c²). A W that takes c to a gives the entry
  // 1 − c², relative to c² the deviation r = 1 − 1/c², so c = 1/√(1 − r).
  const stretched = (r: number): Mat3 => [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1 / Math.sqrt(1 - r)],
  ];
  for (const t of TOLERANCES) {
    it(`at the tolerance ${t}: a deviation of ${BELOW}t keeps the 48 operations of m-3m, ${ABOVE}t the 16 of 4/mmm`, () => {
      const ops = classes.operations('m-3m');
      expect(classes.residualOperations(ops, stretched(BELOW * t), { tolerance: t })).toHaveLength(48);
      expect(classes.residualOperations(ops, stretched(ABOVE * t), { tolerance: t })).toHaveLength(16);
    });
  }
});

describe('the index symmetry of a tensor: per component, relative to its largest component', () => {
  // The piezoelectric d_xyz = 1 and its partner d_xzy = 1 + η: the difference η relative to the
  // largest component 1 + η is r = η/(1 + η), so η = r/(1 − r).
  const tensor = (r: number): number[] => {
    const t = new Array<number>(27).fill(0);
    t[5] = 1; // x y z: 0·9 + 1·3 + 2
    t[7] = 1 + r / (1 - r); // x z y: 0·9 + 2·3 + 1
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
});
