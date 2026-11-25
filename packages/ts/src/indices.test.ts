/**
 * Indices: reduction, three and four indices, the zone law and the change of axes. Expected values
 * are the printed rules (Borchardt-Ott & Sowa, Section 3.5 for the zone law, Section 10.6 for the
 * change of axes; ITA Vol. A, 2006, Section 5.1.3 for the transformation of indices) and hand
 * calculations, not library output.
 */

import { describe, expect, it } from 'vitest';
import {
  millerIndices,
  directionFromFourIndices,
  directionToFourIndices,
  planeFromFourIndices,
  planeToFourIndices,
  reduceIndices,
  zoneAxis,
} from './indices.js';

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
});

describe('millerIndices (#137 G3)', () => {
  it('substitutes the values into printed indices, ITA Table 3.2.3.2 style', () => {
    expect(millerIndices('h,k,l', { h: 3, k: 2, l: 1 })).toEqual([3, 2, 1]);
    expect(millerIndices('h,-h,0', { h: 2 })).toEqual([2, -2, 0]);
    // Four indices (hexagonal axes): i = −(h + k) is dropped, so h,h,-2h,l is (h h l).
    expect(millerIndices('h,h,-2h,l', { h: 3, l: 1 })).toEqual([3, 3, 1]);
    expect(millerIndices('h,k,i,l', { h: 3, k: 2, l: 1 })).toEqual([3, 2, 1]);
    expect(millerIndices('1,0,-1,0', {})).toEqual([1, 0, 0]);
    // Sums, as printed for rhombohedral axes: (h, k, 2k−h) and (h, k, −h−k).
    expect(millerIndices('h,k,2k-h', { h: 5, k: 2 })).toEqual([5, 2, -1]);
    expect(millerIndices('h,k,-h-k', { h: 5, k: 2 })).toEqual([5, 2, -7]);
    // Spaces are ignored; a negative value is substituted as it is; the face is not reduced.
    expect(millerIndices('h, 0, l', { h: -2, l: 4 })).toEqual([-2, 0, 4]);
    expect(Object.isFrozen(millerIndices('h,k,l', { h: 1, k: 1, l: 1 }))).toBe(true);
  });

  it('rejects what it cannot read or substitute', () => {
    expect(() => millerIndices('h,k,l', { h: 1, k: 2 })).toThrow(/needs a value of l/);
    expect(() => millerIndices('h,k,l', { h: 1.5, k: 2, l: 1 })).toThrow(/integer/);
    expect(() => millerIndices('h,k,l', { h: 1, k: 2, l: 1, i: 3 } as never)).toThrow(/unknown value "i"/);
    expect(() => millerIndices('h,0,0', { h: 0 })).toThrow(/\(000\)/);
    expect(() => millerIndices('h,k', { h: 1, k: 2 })).toThrow(RangeError);
    expect(() => millerIndices('hk,l', { h: 1, k: 2, l: 1 })).toThrow(/Unreadable/);
    expect(() => millerIndices('h,k,h,l', { h: 1, k: 2, l: 1 })).toThrow(RangeError); // i ≠ −(h + k)
    expect(() => millerIndices(321 as never, { h: 1 })).toThrow(RangeError);
    expect(() => millerIndices('h,k,l', [3, 2, 1] as never)).toThrow(RangeError);
    // Review of #121 step 11b: unsafe integers, inherited or hidden values, spaces inside an index, i among three.
    expect(() => millerIndices('2h,k,l', { h: 2 ** 53 - 1, k: 0, l: 0 })).toThrow(/safe integer/);
    expect(() => millerIndices('99999999999999999999h,k,l', { h: 1, k: 0, l: 0 })).toThrow(/safe integer/);
    expect(() => millerIndices('h,k,l', Object.create({ h: 1.5, k: 1, l: 1 }) as never)).toThrow(/needs a value of h/);
    const hidden = Object.defineProperty({ k: 1, l: 1 }, 'h', { value: 2.5, enumerable: false });
    expect(() => millerIndices('h,k,l', hidden)).toThrow(/integer/);
    expect(() => millerIndices('1 0,0,1', {})).toThrow(/Unreadable/);
    expect(() => millerIndices('i,k,l', { h: 1, k: 2, l: 3 })).toThrow(/i among three/);
  });
});
