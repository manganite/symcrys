import { describe, expect, it } from 'vitest';
import {
  IDENTITY,
  INVERSION,
  apply,
  conjugate,
  det,
  inverse,
  isSingular,
  matricesEqual,
  multiply,
  rotationX,
  rotationY,
  rotationZ,
  snap,
  trace,
  transpose,
  type Mat3,
} from './linalg.js';

describe('linalg', () => {
  it('rotations turn counter-clockwise seen from the positive axis', () => {
    expect(apply(rotationZ(90), [1, 0, 0])).toEqual([0, 1, 0]);
    expect(apply(rotationX(90), [0, 1, 0])).toEqual([0, 0, 1]);
    expect(apply(rotationY(90), [0, 0, 1])).toEqual([1, 0, 0]);
  });

  it('snaps rotation entries to exact values, without negative zero', () => {
    const r = rotationZ(120);
    expect(r[0][0]).toBe(-0.5);
    expect(r[1][0]).toBe(Math.sqrt(3) / 2);
    expect(Object.is(rotationZ(180)[0][1], 0)).toBe(true);
    expect(
      snap([
        [1e-12, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ] as Mat3)[0][0],
    ).toBe(0);
  });

  it('determinant, trace, transpose, product', () => {
    expect(det(INVERSION)).toBe(-1);
    expect(det(rotationZ(60))).toBeCloseTo(1, 12);
    expect(trace(rotationZ(90))).toBe(1);
    const r = rotationZ(30);
    expect(matricesEqual(multiply(r, transpose(r)), IDENTITY)).toBe(true);
    expect(matricesEqual(multiply(rotationZ(60), rotationZ(60)), rotationZ(120))).toBe(true);
  });

  it('inverse of a non-orthogonal matrix; singular rejected', () => {
    const b: Mat3 = [
      [1, -0.5, 0],
      [0, Math.sqrt(3) / 2, 0],
      [0, 0, 2],
    ];
    expect(matricesEqual(multiply(b, inverse(b)), IDENTITY)).toBe(true);
    expect(matricesEqual(multiply(inverse(b), b), IDENTITY)).toBe(true);
    expect(() =>
      inverse([
        [1, 2, 3],
        [2, 4, 6],
        [0, 0, 1],
      ]),
    ).toThrow(RangeError);
  });

  /** k·m. */
  const times = (m: Mat3, k: number): Mat3 => [
    [k * m[0][0], k * m[0][1], k * m[0][2]],
    [k * m[1][0], k * m[1][1], k * m[1][2]],
    [k * m[2][0], k * m[2][1], k * m[2][2]],
  ];

  it('inverse does not depend on the scale of the entries (cells in metres or in ångström)', () => {
    const b: Mat3 = [
      [1, -0.5, 0.3],
      [0, Math.sqrt(3) / 2, 0.2],
      [0, 0, 2],
    ];
    for (const k of [1e-10, 1e-3, 1, 1e3]) {
      const a = times(b, k);
      // (k·B)⁻¹ = B⁻¹ / k, so k·(k·B)⁻¹ · B is the identity at every scale.
      const back = multiply(times(inverse(a), k), b);
      expect(matricesEqual(back, IDENTITY), String(k)).toBe(true);
      // A singular matrix stays singular at every scale, and so does one with a zero column.
      const flat = [
        [k, 2 * k, 3 * k],
        [2 * k, 4 * k, 6 * k],
        [0, 0, k],
      ] as Mat3;
      expect(() => inverse(flat), String(k)).toThrow(RangeError);
      expect(() =>
        inverse([
          [k, 0, 0],
          [0, 0, 0],
          [0, 0, k],
        ]),
      ).toThrow(RangeError);
    }
  });

  it('isSingular: relative to the product of the column lengths (10⁻⁹), NaN and Infinity singular', () => {
    // diag(1, 1, r): |det| / ∏|columns| = r exactly, at every scale k and for columns of different length.
    for (const k of [1e-10, 1, 1e10]) {
      for (const [r, singular] of [
        [1e-10, true],
        [1e-8, false],
      ] as const) {
        const m: Mat3 = [
          [k, 0, 0],
          [0, k * 1e3, k * 1e3],
          [0, 0, k * 1e3 * r],
        ];
        // columns (k,0,0), (0,1e3k,0), (0,1e3k,1e3kr): det = 1e6 k³ r, ∏ = 1e6 k³ √(1 + r²) ≈ 1e6 k³
        expect(isSingular(m), `${k} ${r}`).toBe(singular);
        if (singular) expect(() => inverse(m)).toThrow(RangeError);
        else expect(matricesEqual(multiply(inverse(m), m), IDENTITY)).toBe(true);
      }
    }
    for (const bad of [Number.NaN, Infinity]) {
      const m: Mat3 = [
        [bad, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ];
      expect(isSingular(m), String(bad)).toBe(true);
      expect(() => inverse(m)).toThrow(RangeError);
    }
  });

  it('conjugate expresses an operation in a rotated frame', () => {
    // A twofold axis along y, seen in a frame rotated by 90° about z, lies along −x, i.e. along x.
    expect(matricesEqual(snap(conjugate(rotationY(180), rotationZ(90))), rotationX(180))).toBe(true);
  });
});
