import { describe, expect, it } from 'vitest';
import { INVERSION, rotationZ, type Mat3 } from './linalg.js';
import { compose, operation, operationsEqual, type CartesianOperation } from './operations.js';
import { closeWithin, idealGroup } from './closure.js';
import { operations } from './pointGroups/pointGroups.js';
import * as classes from './index.js';
import { noisy, seededRandom } from './testUtils/noise.js';

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

// --- the safety net of #234: tests that fail on 0.15.0 (it.fails); each fix removes its mark -------

describe('#241: the postconditions of idealGroup', () => {
  // The 12 operations of 23 with every entry moved by up to 0.03 (seed 8), within the tolerance
  // 0.09 of an exact 23. On 0.15.0 the closure is no group of orthogonal matrices, pointGroupOf gives
  // undefined and tensorFormOf throws a plain Error. Right is either a RangeError or the answer for
  // 23: 12 operations, the class 23, one piezoelectric component (ITA 2016 Table 3.2.2.1, p. 738).
  const input = noisy(
    classes.operations('23').map((op) => ({ cartesian: op.cartesian, timeReversal: false })),
    0.03,
    seededRandom(8),
  );
  const tolerance = 0.09;
  /** The same operations as the crystallographic API takes them, without the field timeReversal. */
  const spatial = input.map(({ cartesian }) => ({ cartesian }));
  /** A RangeError, or the value of `f`. */
  const rangeErrorOr = <T>(f: () => T): T | 'RangeError' => {
    try {
      return f();
    } catch (e) {
      if (e instanceof RangeError) return 'RangeError';
      throw e;
    }
  };
  const orthogonal = (m: Mat3) =>
    m.every((_, i) =>
      m.every((_, j) => Math.abs(m[0][i] * m[0][j] + m[1][i] * m[1][j] + m[2][i] * m[2][j] - (i === j ? 1 : 0)) < 1e-9),
    );

  it('idealGroup gives the 12 orthogonal operations of 23, or refuses', () => {
    const got = rangeErrorOr(() => idealGroup(input, tolerance));
    if (got !== 'RangeError') {
      expect(got.operations).toHaveLength(12);
      expect(got.operations.every((op) => orthogonal(op.cartesian))).toBe(true);
    }
  });

  it('pointGroupOf gives the class 23, or refuses', () => {
    const got = rangeErrorOr(() => classes.pointGroupOf(spatial, { tolerance }));
    if (got !== 'RangeError') expect(got?.key).toBe('23');
  });

  it('tensorFormOf gives one piezoelectric component, or refuses with a RangeError', () => {
    const got = rangeErrorOr(() => classes.tensorFormOf(spatial, 'piezoelectric', { tolerance }));
    if (got !== 'RangeError') expect(got.basis).toHaveLength(1);
  });

  it('an accepted result is a group of orthogonal matrices within the tolerance of the input', () => {
    // Products within 10⁻⁹ of an element, RᵀR within 10⁻⁹ of the identity, every operation of the
    // caller within the tolerance of an element.
    const mul = (a: Mat3, b: Mat3) =>
      a.map((row) => b[0].map((_, j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
    const maxDiff = (a: readonly (readonly number[])[], b: readonly (readonly number[])[]) =>
      Math.max(...a.flatMap((row, i) => row.map((v, j) => Math.abs(v - b[i][j]))));
    const I = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    const wrong: string[] = [];
    // Large noise at large tolerances, where 0.15.0 violates them (in 4 of these 400 inputs), and small
    // noise as a check that the bounds hold for ordinary input.
    for (const key of ['m-3m', '6/mmm', '4/mmm', '23'] as const) {
      for (const amplitude of [1e-3, 2e-2]) {
        for (const tol of [0.05, 0.09]) {
          for (let seed = 1; seed <= 25; seed++) {
            const given = noisy(
              classes.operations(key).map((op) => ({ cartesian: op.cartesian, timeReversal: false })),
              amplitude,
              seededRandom(seed),
            );
            let group;
            try {
              group = idealGroup(given, tol);
            } catch (e) {
              if (!(e instanceof RangeError)) wrong.push(`${key} ${amplitude} ${tol} ${seed}: ${String(e)}`);
              continue;
            }
            const R = group.operations.map((op) => op.cartesian);
            const where = `${key} ${amplitude} ${tol} ${seed}`;
            if (R.some((a) => maxDiff(mul(a[0].map((_, j) => a.map((row) => row[j])) as unknown as Mat3, a), I) > 1e-9))
              wrong.push(`${where}: not orthogonal`);
            if (R.some((a) => R.some((b) => Math.min(...R.map((c) => maxDiff(mul(a, b), c))) > 1e-9)))
              wrong.push(`${where}: not closed`);
            if (given.some((g) => Math.min(...R.map((c) => maxDiff(g.cartesian, c))) >= tol))
              wrong.push(`${where}: farther than the tolerance from the input`);
          }
        }
      }
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });
});
