/**
 * Indices: reduction, three and four indices, the zone law and the change of axes. Expected values
 * are the printed rules (Borchardt-Ott & Sowa, Section 3.5 for the zone law, Section 10.6 for the
 * change of axes; ITA Vol. A, 2006, Section 5.1.3 for the transformation of indices) and hand
 * calculations, not library output.
 */

import { describe, expect, it } from 'vitest';
import {
  changeOfAxes,
  directionFromFourIndices,
  directionToFourIndices,
  planeFromFourIndices,
  planeToFourIndices,
  reduceIndices,
  zoneAxis,
} from './indices.js';
import type { Mat3 } from './linalg.js';

describe('reduceIndices', () => {
  it('divides by the greatest common divisor and keeps the signs', () => {
    expect(reduceIndices([2, 4, 6])).toEqual([1, 2, 3]);
    expect(reduceIndices([-2, 0, 4])).toEqual([-1, 0, 2]);
    expect(reduceIndices([0, 0, 5])).toEqual([0, 0, 1]);
    expect(reduceIndices([2, -1, -1, 0])).toEqual([2, -1, -1, 0]);
    expect(reduceIndices([6, -3, -3, 0])).toEqual([2, -1, -1, 0]);
  });

  it('refuses non-integers and the zero vector', () => {
    expect(() => reduceIndices([0.5, 1, 1])).toThrow(RangeError);
    expect(() => reduceIndices([0, 0, 0])).toThrow(RangeError);
    expect(() => reduceIndices([Number.NaN, 1, 1])).toThrow(RangeError);
  });
});

describe('four indices (Bravais–Miller)', () => {
  it('planes: (hkl) ↔ (hkil) with i = −(h + k)', () => {
    expect(planeToFourIndices([1, 0, 0])).toEqual([1, 0, -1, 0]);
    expect(planeToFourIndices([1, 1, 2])).toEqual([1, 1, -2, 2]);
    expect(planeToFourIndices([1, -2, 3])).toEqual([1, -2, 1, 3]);
    expect(planeFromFourIndices([1, 1, -2, 2])).toEqual([1, 1, 2]);
  });

  it('planes: a fourth index that is not −(h + k) is refused', () => {
    expect(() => planeFromFourIndices([1, 1, 2, 0])).toThrow(RangeError);
  });

  it('directions: [uvw] ↔ [UVTW] with U = (2u − v)/3, V = (2v − u)/3, T = −(U + V), W = w', () => {
    expect(directionToFourIndices([1, 0, 0])).toEqual([2, -1, -1, 0]);
    expect(directionToFourIndices([1, 1, 0])).toEqual([1, 1, -2, 0]);
    expect(directionToFourIndices([0, 0, 1])).toEqual([0, 0, 0, 1]);
    expect(directionToFourIndices([1, 1, 1])).toEqual([1, 1, -2, 3]);
    expect(directionToFourIndices([2, 0, 0])).toEqual([2, -1, -1, 0]); // reduced
  });

  it('directions: [UVTW] → [uvw] with u = U − T, v = V − T, w = W, reduced', () => {
    expect(directionFromFourIndices([2, -1, -1, 0])).toEqual([1, 0, 0]);
    expect(directionFromFourIndices([1, 1, -2, 3])).toEqual([1, 1, 1]);
    expect(directionFromFourIndices([0, 0, 0, 1])).toEqual([0, 0, 1]);
    expect(() => directionFromFourIndices([1, 1, 1, 0])).toThrow(RangeError);
  });

  it('round trip over all small directions', () => {
    for (let u = -3; u <= 3; u++)
      for (let v = -3; v <= 3; v++)
        for (let w = -3; w <= 3; w++) {
          if (u === 0 && v === 0 && w === 0) continue;
          const four = directionToFourIndices([u, v, w]);
          expect(four[0] + four[1] + four[2]).toBe(0);
          expect(directionFromFourIndices(four)).toEqual(reduceIndices([u, v, w]));
        }
  });
});

describe('zoneAxis: the zone law hu + kv + lw = 0', () => {
  it('(100) and (010) lie in the zone [001]', () => {
    expect(zoneAxis([1, 0, 0], [0, 1, 0])).toEqual([0, 0, 1]);
  });

  it('(111) and (11-1) lie in the zone [-110]: the cross product, reduced', () => {
    expect(zoneAxis([1, 1, 1], [1, 1, -1])).toEqual([-1, 1, 0]);
  });

  it('is reduced, antisymmetric and satisfies the zone law', () => {
    const z = zoneAxis([2, 4, 2], [1, 0, 3]);
    expect(z).toEqual([3, -1, -1]);
    expect(zoneAxis([1, 0, 3], [2, 4, 2])).toEqual([-3, 1, 1]);
    expect(2 * 3 + 4 * -1 + 2 * -1).toBe(0);
    expect(1 * 3 + 0 * -1 + 3 * -1).toBe(0);
  });

  it('parallel planes have no zone axis', () => {
    expect(zoneAxis([1, 1, 0], [2, 2, 0])).toBeUndefined();
    expect(zoneAxis([1, 1, 0], [-1, -1, 0])).toBeUndefined();
  });
});

describe('changeOfAxes', () => {
  // Borchardt-Ott & Sowa, Section 10.6, Example 2: a' = a + b, b' = −a + b, c' = c.
  const P: Mat3 = [
    [1, -1, 0],
    [1, 1, 0],
    [0, 0, 1],
  ];

  it('direction: Q = P⁻¹; the old a becomes ½a′ − ½b′', () => {
    const { direction } = changeOfAxes(P);
    expect(direction).toEqual([
      [0.5, 0.5, 0],
      [-0.5, 0.5, 0],
      [0, 0, 1],
    ]);
    // [100] = a → coordinates (½, −½, 0) in a′, b′, c′
    expect([0, 1, 2].map((i) => direction[i][0])).toEqual([0.5, -0.5, 0]);
  });

  it('plane: (hkl)′ = (hkl)·P, so (100) → (1, −1, 0) and (001) stays (001)', () => {
    const { plane } = changeOfAxes(P);
    const apply = (v: number[]) => [0, 1, 2].map((i) => plane[i][0] * v[0] + plane[i][1] * v[1] + plane[i][2] * v[2]);
    expect(apply([1, 0, 0])).toEqual([1, -1, 0]);
    expect(apply([0, 0, 1])).toEqual([0, 0, 1]);
    expect(apply([1, 1, 0])).toEqual([2, 0, 0]);
  });

  it('property: hu + kv + lw is the same before and after, for P with det 3 (rhombohedral → hexagonal)', () => {
    // a_H = a_R − b_R, b_H = b_R − c_R, c_H = a_R + b_R + c_R, columns of P (ITA 5.1.3, Table 5.1.3.1)
    const R: Mat3 = [
      [1, 0, 1],
      [-1, 1, 1],
      [0, -1, 1],
    ];
    const { direction, plane } = changeOfAxes(R);
    for (const hkl of [
      [1, 0, 0],
      [1, 1, 1],
      [2, -1, 3],
    ])
      for (const uvw of [
        [1, 0, 0],
        [0, 1, 2],
        [3, -1, 1],
      ]) {
        const hkl2 = [0, 1, 2].map((i) => plane[i][0] * hkl[0] + plane[i][1] * hkl[1] + plane[i][2] * hkl[2]);
        const uvw2 = [0, 1, 2].map(
          (i) => direction[i][0] * uvw[0] + direction[i][1] * uvw[1] + direction[i][2] * uvw[2],
        );
        const before = hkl[0] * uvw[0] + hkl[1] * uvw[1] + hkl[2] * uvw[2];
        const after = hkl2[0] * uvw2[0] + hkl2[1] * uvw2[1] + hkl2[2] * uvw2[2];
        expect(after).toBeCloseTo(before, 12);
      }
  });

  it('does not depend on the scale of P, and refuses a P singular within rounding', () => {
    // P = 0.001·I (a basis of edges 0.001): Q = P⁻¹ = 1000·I, plane indices with Pᵀ = 0.001·I.
    const { direction, plane } = changeOfAxes([
      [1e-3, 0, 0],
      [0, 1e-3, 0],
      [0, 0, 1e-3],
    ]);
    direction.forEach((row, i) => row.forEach((x, j) => expect(x).toBeCloseTo(i === j ? 1000 : 0, 9)));
    plane.forEach((row, i) => row.forEach((x, j) => expect(x).toBe(i === j ? 1e-3 : 0)));
    // det P = 30000² − 29999·30001 = 1, but the columns have length ≈ 4.2·10⁴: |det| / ∏ ≈ 5.6·10⁻¹⁰.
    expect(() =>
      changeOfAxes([
        [30000, 29999, 0],
        [30001, 30000, 0],
        [0, 0, 1],
      ]),
    ).toThrow(/P is singular within rounding/);
  });

  it('refuses a transformation of a left-handed or singular basis (det P ≤ 0, ITA 5.1.3)', () => {
    expect(() =>
      changeOfAxes([
        [0, 1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ]),
    ).toThrow(RangeError);
    expect(() =>
      changeOfAxes([
        [1, 1, 0],
        [1, 1, 0],
        [0, 0, 1],
      ]),
    ).toThrow(RangeError);
  });
});

describe('edge cases', () => {
  it('no −0 in plane indices, and zero vectors are refused alike', () => {
    expect(Object.is(planeToFourIndices([-0, 0, 1])[0], 0)).toBe(true);
    expect(Object.is(planeFromFourIndices([-0, 0, 0, 1])[0], 0)).toBe(true);
    expect(() => planeToFourIndices([0, 0, 0])).toThrow(RangeError);
    expect(() => zoneAxis([0, 0, 0], [1, 0, 0])).toThrow(RangeError);
    expect(() => directionFromFourIndices([0, 0, 0, 0])).toThrow(RangeError);
  });
  it('zoneAxis names itself when the product leaves the safe integers', () => {
    expect(() => zoneAxis([2 ** 40, 1, 0], [0, 2 ** 40, 1])).toThrow(/zoneAxis/);
  });
  it('rhombohedral → hexagonal: (h k l) becomes (h−k, k−l, h+k+l) for P = columns a−b, b−c, a+b+c', () => {
    const { plane } = changeOfAxes([
      [1, 0, 1],
      [-1, 1, 1],
      [0, -1, 1],
    ]);
    const h = [2, 1, 3];
    const out = [0, 1, 2].map((i) => plane[i][0] * h[0] + plane[i][1] * h[1] + plane[i][2] * h[2]);
    expect(out).toEqual([1, -2, 6]);
  });
});
