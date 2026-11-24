import { describe, expect, it } from 'vitest';
import { INVERSION, rotationZ, type Mat3 } from './linalg.js';
import { compose, operation, operationsEqual, type CartesianOperation } from './operations.js';
import { closeWithin, idealGroup } from './closure.js';
import { operations } from './pointGroups/pointGroups.js';

const round = (m: Mat3, decimals: number): Mat3 =>
  m.map((row) => row.map((x) => Math.round(x * 10 ** decimals) / 10 ** decimals)) as unknown as Mat3;

describe('closeWithin', () => {
  it('returns the identity first, then the generators', () => {
    const g = closeWithin([operation(rotationZ(90))], 1e-9)!;
    expect(g).toHaveLength(4);
    expect(g[0].cartesian).toEqual([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(operationsEqual(g[1], operation(rotationZ(90)))).toBe(true);
  });

  it('gives a group closed under multiplication', () => {
    const g = closeWithin([operation(rotationZ(60)), operation(INVERSION)], 1e-9)!;
    expect(g).toHaveLength(12);
    for (const a of g) for (const b of g) expect(g.some((x) => operationsEqual(x, compose(a, b)))).toBe(true);
  });

  it('keeps time reversal apart from the matrix', () => {
    const primed: CartesianOperation = { cartesian: rotationZ(180), timeReversal: true };
    expect(closeWithin([primed], 1e-9)).toHaveLength(2);
    expect(closeWithin([primed], 1e-9)![1].timeReversal).toBe(true);
    expect(closeWithin([primed, operation(rotationZ(180))], 1e-9)).toHaveLength(4);
  });

  it('gives undefined beyond the largest order it is given', () => {
    expect(closeWithin([operation(rotationZ(1.234))], 1e-9)).toBeUndefined();
    expect(closeWithin([operation(rotationZ(60)), operation(INVERSION)], 1e-9, 11)).toBeUndefined();
  });
});

describe('idealGroup', () => {
  it('throws a RangeError when the closure does not terminate (a non-crystallographic angle)', () => {
    // A RangeError, as for every other invalid input (#91), which names the input, not the function.
    expect(() => idealGroup([operation(rotationZ(1.234))], 1e-6)).toThrow(RangeError);
    expect(() => idealGroup([operation(rotationZ(1.234))], 1e-6)).toThrow(/no finite point group/);
  });

  it('leaves the exact operations of every class and magnetic group exact', () => {
    for (const key of ['6/mmm', 'm-3m', "6'/m'mm'", "-3m1'", '-43m'] as const) {
      const ops = operations(key);
      const ideal = idealGroup(ops, 1e-6);
      expect(ideal.deviation).toBeLessThan(1e-12);
      expect(ideal.operations).toHaveLength(ops.length);
      for (const op of ops) expect(ideal.operations.some((x) => operationsEqual(x, op))).toBe(true);
    }
  });

  it('makes operations rounded to 4 decimals an exact group near the exact operations', () => {
    const exact = operations('6/mmm');
    const ops = exact.map((op) => ({ cartesian: round(op.cartesian, 4), timeReversal: false }));
    const ideal = idealGroup(ops, 1e-3);
    expect(ideal.operations).toHaveLength(24);
    expect(ideal.deviation).toBeGreaterThan(0);
    expect(ideal.deviation).toBeLessThan(1e-4);
    // Within the errors of the rounded matrices, not necessarily the exact ones: 0.866 for √3/2
    // fixes the orientation about z only to a few 10⁻⁵.
    for (const op of exact) {
      expect(
        ideal.operations.some((x) =>
          x.cartesian.every((r, i) => r.every((v, j) => Math.abs(v - op.cartesian[i][j]) < 1e-4)),
        ),
      ).toBe(true);
    }
    // Orthogonal to rounding of the last bits.
    for (const { cartesian: m } of ideal.operations) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const d = m[0][i] * m[0][j] + m[1][i] * m[1][j] + m[2][i] * m[2][j];
          expect(Math.abs(d - (i === j ? 1 : 0))).toBeLessThan(1e-14);
        }
      }
    }
  });

  it('gives an exact group for rounded operations in a general orientation', () => {
    const c = Math.cos(0.7);
    const s = Math.sin(0.7);
    const r: Mat3 = [
      [c, -s, 0],
      [s * 0.6, c * 0.6, -0.8],
      [s * 0.8, c * 0.8, 0.6],
    ];
    const rt = r.map((_, i) => r.map((row) => row[i])) as unknown as Mat3;
    const mul = (a: Mat3, b: Mat3): Mat3 =>
      a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j])) as unknown as Mat3;
    const ops = operations('m-3m').map((op) => ({
      cartesian: round(mul(mul(r, op.cartesian), rt), 6),
      timeReversal: false,
    }));
    const ideal = idealGroup(ops, 1e-4);
    expect(ideal.operations).toHaveLength(48);
    // Closed exactly (to rounding of the last bits): every product is an element.
    for (const a of ideal.operations) {
      for (const b of ideal.operations) {
        const p = mul(a.cartesian, b.cartesian);
        expect(
          ideal.operations.some((x) =>
            x.cartesian.every((row, i) => row.every((v, j) => Math.abs(v - p[i][j]) < 1e-12)),
          ),
        ).toBe(true);
      }
    }
  });
});
