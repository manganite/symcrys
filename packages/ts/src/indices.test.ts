/**
 * Indices: reduction, three and four indices and the zone law. Expected values are the printed
 * rules (Borchardt-Ott & Sowa, Section 3.5 for the zone law) and hand calculations, not library
 * output. The change of the coordinate system is tested in coordinates.test.ts.
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
import { faceNormal, latticeBasis, orbit } from './index.js';
import type { Vec3 } from './linalg.js';
import { seededRandom } from './testUtils/noise.js';

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

describe('millerIndices', () => {
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

// --- the safety net of #234: tests that fail on 0.15.0 (it.fails); each fix removes its mark -------

describe('#236: integer arithmetic beyond 2⁵³', () => {
  it.fails('zoneAxis refuses planes whose cross product needs products beyond the safe integers', () => {
    // n² − (n − 1)(n + 1) = 1: the exact zone axis is [0, 0, 1], but n² = 10¹⁶ is no safe integer,
    // and checked arithmetic refuses an intermediate value outside them.
    const n = 1e8;
    expect(() => zoneAxis([n, n - 1, 0], [n + 1, n, 0])).toThrow(RangeError);
  });

  it.fails('planeToFourIndices refuses an index i = −(h + k) beyond the safe integers', () => {
    expect(() => planeToFourIndices([Number.MAX_SAFE_INTEGER, 2, 0])).toThrow(RangeError);
  });

  /**
   * Pairs of indices, seeded: of every magnitude up to the safe integers, and nearly parallel ones
   * (b = a + a small shift), whose cross product is small while its products are large, so that
   * rounding would not show in the size of the result.
   */
  const random = seededRandom(3);
  const draws: (readonly [number, number, number])[] = [];
  for (let k = 0; k < 300; k++) {
    const scale = k % 2 === 0 ? 10 ** (k % 16) : Math.floor(Number.MAX_SAFE_INTEGER / 2);
    const one = () => Math.round((2 * random() - 1) * scale);
    const a = [one(), one(), one()] as const;
    const shift = () => Math.round((2 * random() - 1) * 10);
    draws.push(a, k % 3 === 0 ? ([a[0] + shift(), a[1] + shift(), a[2] + shift()] as const) : [one(), one(), one()]);
  }
  const reduceBig = (v: readonly bigint[]) => {
    const abs = (x: bigint) => (x < 0n ? -x : x);
    const gcdBig = (a: bigint, b: bigint): bigint => (b === 0n ? abs(a) : gcdBig(b, a % b));
    const g = v.reduce(gcdBig, 0n);
    return v.map((x) => x / g);
  };
  /** The exact result, from BigInt in this test; the library must give it or throw. */
  const exactOrThrows = (f: () => readonly number[] | undefined, exact: readonly bigint[] | undefined): string => {
    let got: readonly number[] | undefined;
    try {
      got = f();
    } catch (e) {
      return e instanceof RangeError ? '' : `threw ${String(e)}`;
    }
    const want = exact?.map(String).join();
    return got?.map((x) => BigInt(x).toString()).join() === want ? '' : `${got?.join()} ≠ ${want}`;
  };

  it.fails('zoneAxis, planeToFourIndices and directionToFourIndices are exact or throw (BigInt in the test)', () => {
    const wrong: string[] = [];
    for (let k = 0; k + 1 < draws.length; k += 2) {
      const [a, b] = [draws[k], draws[k + 1]];
      if (a.every((x) => x === 0) || b.every((x) => x === 0)) continue;
      const [A, B] = [a.map(BigInt), b.map(BigInt)];
      const cross = [A[1] * B[2] - A[2] * B[1], A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
      const zone = cross.every((x) => x === 0n) ? undefined : reduceBig(cross);
      const w1 = exactOrThrows(() => zoneAxis([...a], [...b]), zone);
      if (w1) wrong.push(`zoneAxis ${a} ${b}: ${w1}`);
      const four = [A[0], A[1], -(A[0] + A[1]), A[2]];
      const w2 = exactOrThrows(() => planeToFourIndices([...a]), four);
      if (w2) wrong.push(`planeToFourIndices ${a}: ${w2}`);
      const dir = reduceBig([2n * A[0] - A[1], 2n * A[1] - A[0], -(A[0] + A[1]), 3n * A[2]]);
      const w3 = exactOrThrows(() => directionToFourIndices([...a]), dir);
      if (w3) wrong.push(`directionToFourIndices ${a}: ${w3}`);
    }
    expect(wrong.slice(0, 5)).toEqual([]);
  });
});

describe('#236: a sparse array is refused as indices', () => {
  /** [x, <hole>, z]: `.every()` skips the hole. */
  const sparse = (x: number, z: number): Vec3 => {
    const v = new Array<number>(3);
    v[0] = x;
    v[2] = z;
    return v as unknown as Vec3;
  };
  it.fails('reduceIndices', () => expect(() => reduceIndices(sparse(1, 3))).toThrow(RangeError));
  it.fails('planeToFourIndices', () => expect(() => planeToFourIndices(sparse(1, 0))).toThrow(RangeError));
  it.fails('orbit of a key', () => expect(() => orbit('4', { hkl: sparse(1, 0) })).toThrow(RangeError));
  it.fails('faceNormal', () => expect(() => faceNormal(latticeBasis('m-3m'), sparse(1, 0))).toThrow(RangeError));
});
