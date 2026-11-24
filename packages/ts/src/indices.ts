/**
 * Miller and Bravais–Miller indices, the zone law and the change of axes
 * (docs/conventions.md, "Cell, metric and indices"). Plain integers and matrices in and out.
 */

import { shown } from './checks.js';
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
    throw new RangeError(`${who}: ${length === undefined ? 'a list of' : length} integers expected, not ${shown(v)}`);
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
    throw new RangeError(`planeFromFourIndices: i must be −(h + k) in ${shown(hkil)}`);
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
  if (T !== -(U + V)) throw new RangeError(`directionFromFourIndices: T must be −(U + V) in ${shown(uvtw)}`);
  return deepFreeze(reduceIndices([U - T, V - T, W]) as unknown as Vec3);
}

/**
 * The zone axis [uvw] of two planes (hkl), which must not be zero vectors: the solution of the zone law hu + kv + lw = 0, the
 * cross product h₁ × h₂ reduced (so its sign follows the order of the planes), or `undefined` for parallel planes.
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

/** The values of h, k, l substituted into printed Miller indices. */
export interface MillerValues {
  /** The value of h, an integer. */
  readonly h?: number;
  /** The value of k, an integer. */
  readonly k?: number;
  /** The value of l, an integer. */
  readonly l?: number;
}

/**
 * One printed index as a number: a term (`h`, `-2h`, `0`, `1`) or a sum of terms (`-h-k`, `2k-h`, as
 * printed for rhombohedral axes); `i` is −(h + k). `fail` makes the error: a RangeError for a
 * caller's string, a plain Error for the transcribed data.
 */
function printedIndex(component: string, values: MillerValues, fail: (message: string) => Error): number {
  // A term is a signed number, or a signed letter with an optional factor; terms after the first
  // begin with their sign, so that run-together terms (`hk`, `h2`) are unreadable.
  if (!/^-?(\d+|\d*[hkil])([+-](\d+|\d*[hkil]))*$/.test(component)) throw fail(`Unreadable Miller index: ${component}`);
  const terms = component.match(/[+-]?\d*[hkil]?/g)!.filter((t) => t !== '');
  const value = (letter: 'h' | 'k' | 'l'): number => {
    const v = values[letter];
    if (v === undefined) throw fail(`The Miller index ${component} needs a value of ${letter}`);
    return v;
  };
  const result = terms.reduce((sum, term) => {
    const m = /^([+-]?)(\d*)([hkil]?)$/.exec(term)!;
    const sign = m[1] === '-' ? -1 : 1;
    const factor = m[2] === '' ? 1 : Number(m[2]);
    if (!Number.isSafeInteger(factor)) throw fail(`The factor in ${component} is not a safe integer`);
    if (m[3] === '') return sum + sign * factor;
    if (m[3] === 'i') return sum + sign * factor * -(value('h') + value('k'));
    return sum + sign * factor * value(m[3] as 'h' | 'k' | 'l');
  }, 0);
  if (!Number.isSafeInteger(result)) throw fail(`The Miller index ${component} is not a safe integer: ${result}`);
  return result;
}

/**
 * Printed Miller indices, three or four (Bravais–Miller, hexagonal axes) separated by commas, as
 * three numbers (hkl) with the given values of h, k, l; four lose i, which must be −(h + k). Internal:
 * `fail` makes the error.
 */
export function substituteMillerIndices(printed: string, values: MillerValues, fail: (message: string) => Error): Vec3 {
  const components = printed.split(',').map((c) => c.trim());
  // i is the third of four indices; ITA prints no i among three.
  if (components.length === 3 && components.some((c) => c.includes('i'))) {
    throw fail(`Unreadable Miller indices: ${printed} (i among three indices)`);
  }
  const parts = components.map((c) => printedIndex(c, values, fail) + 0);
  if (parts.length === 3) return [parts[0], parts[1], parts[2]];
  if (parts.length === 4 && parts[2] === -(parts[0] + parts[1])) return [parts[0], parts[1], parts[3]];
  throw fail(`Unreadable Miller indices: ${printed}`);
}

/**
 * The face (hkl) of printed Miller indices with the caller's values of h, k, l substituted (#137 G3):
 * the printed `h,h,-2h,l` with h = 3 and l = 1 gives (3, 3, 1). The printed strings are those of
 * `wyckoffPositions` and `crystalForms` (`millerIndices`), as ITA prints them: three indices, or four
 * for hexagonal axes, of which i = −(h + k) is dropped, so that the face can be passed to `orbit`
 * (`planeToFourIndices` gives the four). Each value is an integer; only the letters the string uses
 * are needed. The face is not reduced, and whether the values keep it in its position (a general
 * face (hkl) with h = k lies on a special one) is the caller's choice. Throws a RangeError for an
 * unreadable string, a missing or non-integer value, an unknown key and the face (000).
 */
export function millerIndices(printed: string, values: MillerValues): Vec3 {
  if (typeof printed !== 'string')
    throw new RangeError(`millerIndices: printed Miller indices expected, not ${shown(printed)}`);
  if (values === null || typeof values !== 'object' || Array.isArray(values)) {
    throw new RangeError(`millerIndices: values { h, k, l } expected, not ${shown(values)}`);
  }
  for (const key of Object.keys(values)) {
    if (!['h', 'k', 'l'].includes(key)) throw new RangeError(`millerIndices: unknown value ${shown(key)} (h, k or l)`);
  }
  // The own values only, each checked as it is read (an inherited or non-enumerable one included).
  const own: { h?: number; k?: number; l?: number } = {};
  for (const letter of ['h', 'k', 'l'] as const) {
    if (!Object.hasOwn(values, letter)) continue;
    const v: unknown = values[letter];
    if (v === undefined) continue;
    if (!Number.isSafeInteger(v)) throw new RangeError(`millerIndices: ${letter} must be an integer, not ${shown(v)}`);
    own[letter] = v as number;
  }
  // Spaces around the commas are allowed; a space inside an index is unreadable.
  const hkl = substituteMillerIndices(printed, own, (m) => new RangeError(`millerIndices: ${m}`));
  if (hkl.every((x) => x === 0))
    throw new RangeError(`millerIndices: ${printed} gives the face (000) with ${shown(values)}`);
  return deepFreeze(hkl);
}
