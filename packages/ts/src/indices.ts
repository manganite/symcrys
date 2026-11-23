/**
 * Miller and Bravais–Miller indices, the zone law and the change of axes
 * (docs/conventions.md, "Cell, metric and indices"). Plain integers and matrices in and out.
 */

import { det, inverse, isSingular, transpose, type Mat3, type Vec3 } from './linalg.js';
import { deepFreeze } from './freeze.js';

/** A direction [UVTW] or a plane (hkil) in four indices (Bravais–Miller). */
export type FourIndices = readonly [number, number, number, number];

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function integers(v: readonly number[], who: string, length?: number): void {
  if (
    !Array.isArray(v) ||
    (length !== undefined && v.length !== length) ||
    v.length === 0 ||
    !v.every((x) => Number.isSafeInteger(x))
  ) {
    throw new RangeError(
      `${who}: ${length === undefined ? 'a list of' : length} integers expected, not ${JSON.stringify(v)}`,
    );
  }
}

/** The indices divided by their greatest common divisor, signs kept. Throws a RangeError for non-integers and for all zeros. */
export function reduceIndices(indices: readonly number[]): readonly number[] {
  integers(indices, 'reduceIndices');
  const g = indices.reduce(gcd, 0);
  if (g === 0) throw new RangeError('reduceIndices: all indices are zero');
  return deepFreeze(indices.map((x) => x / g + 0));
}

/** The plane (hkl) of hexagonal axes as (hkil) with i = −(h + k). */
export function planeToFourIndices(hkl: Vec3): FourIndices {
  integers(hkl, 'planeToFourIndices', 3);
  if (hkl.every((x) => x === 0)) throw new RangeError('planeToFourIndices: zero vector');
  return deepFreeze([hkl[0] + 0, hkl[1] + 0, -(hkl[0] + hkl[1]) + 0, hkl[2] + 0]);
}

/** The plane (hkil) as (hkl); throws a RangeError unless i = −(h + k). */
export function planeFromFourIndices(hkil: FourIndices): Vec3 {
  integers(hkil, 'planeFromFourIndices', 4);
  if (hkil[2] !== -(hkil[0] + hkil[1]))
    throw new RangeError(`planeFromFourIndices: i must be −(h + k) in ${JSON.stringify(hkil)}`);
  return deepFreeze([hkil[0] + 0, hkil[1] + 0, hkil[3] + 0]);
}

/**
 * The direction [uvw] of hexagonal axes as [UVTW], reduced: U = (2u − v)/3, V = (2v − u)/3,
 * T = −(U + V), W = w, scaled to the smallest integers.
 */
export function directionToFourIndices(uvw: Vec3): FourIndices {
  integers(uvw, 'directionToFourIndices', 3);
  const [u, v, w] = uvw;
  if (u === 0 && v === 0 && w === 0) throw new RangeError('directionToFourIndices: zero vector');
  return deepFreeze(reduceIndices([2 * u - v, 2 * v - u, -(u + v), 3 * w]) as unknown as FourIndices);
}

/** The direction [UVTW] as [uvw], reduced: u = U − T, v = V − T, w = W; throws a RangeError unless T = −(U + V). */
export function directionFromFourIndices(uvtw: FourIndices): Vec3 {
  integers(uvtw, 'directionFromFourIndices', 4);
  if (uvtw.every((x) => x === 0)) throw new RangeError('directionFromFourIndices: zero vector');
  const [U, V, T, W] = uvtw;
  if (T !== -(U + V)) throw new RangeError(`directionFromFourIndices: T must be −(U + V) in ${JSON.stringify(uvtw)}`);
  return deepFreeze(reduceIndices([U - T, V - T, W]) as unknown as Vec3);
}

/**
 * The zone axis [uvw] of two planes (hkl), which must not be zero vectors: the solution of the zone law hu + kv + lw = 0, the
 * cross product h₁ × h₂ reduced (so its sign follows the order of the planes), or undefined for parallel planes.
 */
export function zoneAxis(h1: Vec3, h2: Vec3): Vec3 | undefined {
  integers(h1, 'zoneAxis', 3);
  integers(h2, 'zoneAxis', 3);
  if (h1.every((x) => x === 0) || h2.every((x) => x === 0)) throw new RangeError('zoneAxis: zero vector');
  const c = [h1[1] * h2[2] - h1[2] * h2[1], h1[2] * h2[0] - h1[0] * h2[2], h1[0] * h2[1] - h1[1] * h2[0]];
  if (!c.every((x) => Number.isSafeInteger(x)))
    throw new RangeError('zoneAxis: the cross product exceeds the safe integers');
  if (c.every((x) => x === 0)) return undefined;
  return deepFreeze(reduceIndices(c) as unknown as Vec3);
}

/** The matrices that carry coordinates of a direction and indices of a plane to a new basis. */
export interface AxisChange {
  /** Q = P⁻¹: the coordinates [uvw]′ = Q·[uvw] of a direction in the new basis. */
  readonly direction: Mat3;
  /** Pᵀ: the indices (hkl)′ = Pᵀ·(hkl) of a plane, i.e. (h′ k′ l′) = (h k l)·P. */
  readonly plane: Mat3;
}

/**
 * The transformation of indices for a change of basis (a′, b′, c′) = (a, b, c)·P (ITA Vol. A, 2006,
 * Section 5.1.3): the columns of `P` are the new basis vectors in the old one. The coordinates of a
 * direction transform with Q = P⁻¹, the indices of a plane with Pᵀ, so that hu + kv + lw is the same in
 * both bases. Throws a RangeError unless det P > 0 (a right-handed basis), and for a P that is
 * singular within rounding (the absolute value of det P at most 10⁻⁹ times the product of its
 * column lengths).
 */
export function changeOfAxes(P: Mat3): AxisChange {
  if (
    !Array.isArray(P) ||
    P.length !== 3 ||
    !P.every((r) => Array.isArray(r) && r.length === 3 && r.every((x) => Number.isFinite(x)))
  ) {
    throw new RangeError('changeOfAxes: P must be a 3×3 matrix of finite numbers');
  }
  if (!(det(P) > 0)) throw new RangeError('changeOfAxes: det P must be positive (a right-handed basis)');
  if (isSingular(P)) throw new RangeError('changeOfAxes: P is singular within rounding');
  const clean = (m: Mat3): Mat3 => m.map((r) => r.map((x) => x + 0)) as unknown as Mat3; // no −0
  return deepFreeze({ direction: clean(inverse(P)), plane: clean(transpose(P)) });
}
