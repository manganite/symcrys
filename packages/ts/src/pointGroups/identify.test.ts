/**
 * The point group of a list of operations. The groups passed in are built independently of the
 * library where it matters: from the full Hermann–Mauguin symbol of each class along simple
 * Cartesian directions (testUtils/hermannMauguin.ts), turned into a general orientation, so that the
 * expected key comes from the symbol, not from symcrys.
 */

import { describe, expect, it } from 'vitest';
import { groupOfSymbol } from '../testUtils/hermannMauguin.js';
import { mul, rotationAbout, type M } from '../testUtils/independentGroups.js';
import type { Mat3 } from '../linalg.js';
import type { CartesianOperation } from '../operations.js';
import { describeOperations } from './elements.js';
import { describeOperationsOf, pointGroupOf } from './identify.js';
import {
  MAGNETIC_POINT_GROUP_KEYS,
  generators,
  operations,
  settings,
  type MagneticPointGroupKey,
} from './pointGroups.js';

const S3 = Math.sqrt(3);
const S2 = Math.sqrt(2);
const X = [1, 0, 0];
const Y = [0, 1, 0];
const Z = [0, 0, 1];
/** Directions of the three positions of a full symbol, per family (ITA Table 2.1.3.1, one of each set). */
const ORTHO = [X, Y, Z];
const TETRA = [Z, X, [1 / S2, 1 / S2, 0]];
const HEXA = [Z, X, [S3 / 2, -1 / 2, 0]];
const CUBIC = [Z, [1 / S3, 1 / S3, 1 / S3], [1 / S2, -1 / S2, 0]];

/** Full symbol, directions and the key it names. */
const CLASSES: [string, number[][], string][] = [
  ['1', ORTHO, '1'],
  ['-1', ORTHO, '-1'],
  ['1 2 1', ORTHO, '2'],
  ['1 m 1', ORTHO, 'm'],
  ['1 2/m 1', ORTHO, '2/m'],
  ['2 2 2', ORTHO, '222'],
  ['m m 2', ORTHO, 'mm2'],
  ['2/m 2/m 2/m', ORTHO, 'mmm'],
  ['4', TETRA, '4'],
  ['-4', TETRA, '-4'],
  ['4/m', TETRA, '4/m'],
  ['4 2 2', TETRA, '422'],
  ['4 m m', TETRA, '4mm'],
  ['-4 2 m', TETRA, '-42m'],
  ['4/m 2/m 2/m', TETRA, '4/mmm'],
  ['3', HEXA, '3'],
  ['-3', HEXA, '-3'],
  ['3 2 1', HEXA, '32'],
  ['3 m 1', HEXA, '3m'],
  ['-3 2/m 1', HEXA, '-3m'],
  ['6', HEXA, '6'],
  ['-6', HEXA, '-6'],
  ['6/m', HEXA, '6/m'],
  ['6 2 2', HEXA, '622'],
  ['6 m m', HEXA, '6mm'],
  ['-6 m 2', HEXA, '-6m2'],
  ['6/m 2/m 2/m', HEXA, '6/mmm'],
  ['2 3', CUBIC, '23'],
  ['2/m -3', CUBIC, 'm-3'],
  ['4 3 2', CUBIC, '432'],
  ['-4 3 m', CUBIC, '-43m'],
  ['4/m -3 2/m', CUBIC, 'm-3m'],
];

/** A rotation that puts no axis of any point group onto a symmetry direction of symcrys. */
const TURN: M = mul(
  rotationAbout(
    [1, 2, 3].map((x) => x / Math.hypot(1, 2, 3)),
    0.137,
  ),
  rotationAbout(X, 0.071),
);
const turned = (m: M): Mat3 =>
  mul(
    mul(TURN, m),
    [0, 1, 2].map((i) => [0, 1, 2].map((j) => TURN[j][i])),
  ) as unknown as Mat3;

describe('pointGroupOf', () => {
  it('identifies the 32 classes built from their symbols, in a general orientation, without a setting', () => {
    expect(CLASSES).toHaveLength(32);
    for (const [hm, dirs, key] of CLASSES) {
      const ops: CartesianOperation[] = groupOfSymbol(hm, dirs).map((g) => ({
        cartesian: turned(g.m),
        timeReversal: g.t,
      }));
      // 1 and -1 have no orientation: their one setting is every orientation.
      expect(pointGroupOf(ops), hm).toEqual(key === '1' || key === '-1' ? { key, setting: 1 } : { key });
    }
  });

  for (const key of MAGNETIC_POINT_GROUP_KEYS) {
    it(`identifies ${key} in every setting with its setting, from all operations and from the generators`, () => {
      for (const s of settings(key)) {
        const options = { setting: s.index };
        // Rhombohedral axes have the Cartesian operations of setting 1 (hexagonal axes): the same frame.
        const expected = { key, setting: s.axes === 'rhombohedral' ? 1 : s.index };
        expect(pointGroupOf(operations(key, options)), `#${s.index}`).toEqual(expected);
        expect(pointGroupOf(generators(key, options)), `#${s.index} gen`).toEqual(expected);
      }
    });
  }

  it('identifies magnetic groups in a general orientation', () => {
    for (const key of ["4'/mmm'", "321'", "m'm'2", "-6'm2'", "m-3m'"] as MagneticPointGroupKey[]) {
      const ops = operations(key).map((op) => ({
        cartesian: turned(op.cartesian as unknown as M),
        timeReversal: op.timeReversal,
      }));
      expect(pointGroupOf(ops), key).toEqual({ key });
    }
  });

  it('takes a tolerance for matrices with rounding errors', () => {
    const noisy = operations('6mm').map((op) => ({
      cartesian: op.cartesian.map((row) => row.map((v) => v + 3e-6)) as unknown as Mat3,
      timeReversal: false,
    }));
    expect(pointGroupOf(noisy, { tolerance: 1e-4 })).toEqual({ key: '6mm', setting: 1 });
  });

  it('returns undefined for operations that generate no point group', () => {
    const fivefold = rotationAbout(Z, 1 / 5) as unknown as Mat3;
    expect(pointGroupOf([{ cartesian: fivefold, timeReversal: false }])).toBeUndefined();
    const odd = rotationAbout(Z, 0.1234) as unknown as Mat3;
    expect(pointGroupOf([{ cartesian: odd, timeReversal: false }])).toBeUndefined();
  });

  it('refuses a matrix that is not orthogonal and an operation that does not say whether it has time reversal', () => {
    const lattice: Mat3 = [
      [0, -1, 0],
      [1, -1, 0],
      [0, 0, 1],
    ];
    expect(() => pointGroupOf([{ cartesian: lattice, timeReversal: false }])).toThrow(RangeError);
    expect(() => pointGroupOf([{ cartesian: operations('2')[1].cartesian } as CartesianOperation])).toThrow(RangeError);
    expect(() => pointGroupOf(operations('2'), { tolerance: 0 })).toThrow(RangeError);
  });

  it('gives the identity alone, and an empty list, the class 1', () => {
    expect(pointGroupOf([])).toEqual({ key: '1', setting: 1 });
    expect(pointGroupOf([operations('1')[0]])).toEqual({ key: '1', setting: 1 });
  });

  it('reads an operation given with and without time reversal as a grey group', () => {
    const two = operations('2', { setting: 1 })[1];
    expect(pointGroupOf([two, { ...two, timeReversal: true }])).toEqual({ key: "21'", setting: 1 });
  });

  it('takes a larger tolerance for matrices with larger errors (the trace is checked within it)', () => {
    const scaled = operations('mmm').map((op) => ({
      cartesian: op.cartesian.map((row) => row.map((v) => v * (1 - 4e-4))) as unknown as Mat3,
      timeReversal: false,
    }));
    expect(() => pointGroupOf(scaled)).toThrow(/not an orthogonal/);
    expect(pointGroupOf(scaled, { tolerance: 1e-3 })).toEqual({ key: 'mmm', setting: 1 });
    expect(pointGroupOf(scaled, { tolerance: 1e-2 })).toEqual({ key: 'mmm', setting: 1 });
    expect(describeOperationsOf(scaled, { tolerance: 1e-2 })).toHaveLength(8);
  });

  it('refuses a tolerance outside 0 < t < 0.1', () => {
    for (const tolerance of [0, -1, 0.1, Number.NaN]) {
      expect(() => pointGroupOf(operations('2'), { tolerance })).toThrow(RangeError);
    }
  });
});

describe('describeOperationsOf', () => {
  it('agrees with describeOperations, axes signed with the first non-zero component positive', () => {
    for (const key of MAGNETIC_POINT_GROUP_KEYS) {
      for (const s of settings(key)) {
        const named = describeOperations(key, { setting: s.index });
        const plain = describeOperationsOf(operations(key, { setting: s.index }));
        plain.forEach((d, i) => {
          const n = named[i];
          expect([d.kind, d.order, d.timeReversal], `${key} #${s.index} ${i}`).toEqual([
            n.kind,
            n.order,
            n.timeReversal,
          ]);
          if (!n.axis || !d.axis) {
            expect(d.axis).toBe(n.axis);
            return;
          }
          const first = d.axis.cartesian.find((x) => Math.abs(x) > 1e-9) ?? 0;
          expect(first).toBeGreaterThan(0);
          const dot = d.axis.cartesian.reduce((sum, x, j) => sum + x * (n.axis?.cartesian[j] ?? 0), 0);
          expect(Math.abs(Math.abs(dot) - 1)).toBeLessThan(1e-9);
          if (n.sense) expect(d.sense).toBe(dot > 0 ? n.sense : n.sense === '+' ? '-' : '+');
        });
      }
    }
  });

  it('refuses an operation that is not crystallographic, also one whose angle rounds to 360°/n', () => {
    for (const turns of [1 / 5, 100 / 360, 110 / 360, 150 / 360, 170 / 360]) {
      const matrix = rotationAbout(Z, turns) as unknown as Mat3;
      expect(() => describeOperationsOf([{ cartesian: matrix, timeReversal: false }]), `${turns * 360}°`).toThrow(
        RangeError,
      );
      const improper = matrix.map((row) => row.map((v) => -v)) as unknown as Mat3;
      expect(() => describeOperationsOf([{ cartesian: improper, timeReversal: false }])).toThrow(RangeError);
    }
  });

  it('signs an axis within the tolerance: a mirror tilted by 10⁻⁷ keeps the sign of its normal', () => {
    const tilted = (e: number): Mat3 => {
      const n = [e, 0, 1].map((x) => x / Math.hypot(e, 1));
      return [0, 1, 2].map((i) => [0, 1, 2].map((j) => (i === j ? 1 : 0) - 2 * n[i] * n[j])) as unknown as Mat3;
    };
    const axes = describeOperationsOf([
      { cartesian: tilted(1e-7), timeReversal: false },
      { cartesian: tilted(-1e-7), timeReversal: false },
    ]).map((d) => d.axis?.cartesian[2]);
    expect(axes.every((z) => (z ?? 0) > 0)).toBe(true);
  });
});
