/**
 * The change of the coordinate system by a matrix–column pair (P, p) after ITA (6th ed., 2016)
 * Chapter 1.5 (§§ 1.5.1.3, 1.5.2, pp. 83–85), for d = 2 and d = 3 (#120, #137 G2). Internal; the
 * entry points wrap it with their matrix types (docs/conventions.md, "Change of the coordinate
 * system").
 *
 * The linear part P, the origin shift p and the operations (W, w) are read each number as the
 * simplest fraction within the tolerance and transformed exactly, so that W′ = P⁻¹WP is exactly
 * integral where it is and every result, the inverse pair included, is read back exactly; points,
 * direction and plane coefficients and the metric are floating point.
 */

import { checkObject, checkOptions, shown, TOLERANCE_KEYS } from './checks.js';
import { toleranceOf, type ToleranceOptions } from './tolerances.js';
import { deepFreeze } from './freeze.js';
import type { Mat3, Vec3 } from './linalg.js';
import {
  ONE,
  add,
  isInteger,
  multiply,
  simplestFraction,
  negate,
  rational,
  subtract,
  toNumber,
  ZERO,
  type Rational,
} from './spaceGroups/rational.js';

/** A matrix as rows of numbers. */
type Rows = readonly (readonly number[])[];
type RMatrix = readonly (readonly Rational[])[];

/** The pair (P, p): the new basis (a′, b′, c′) = (a, b, c)·P and the new origin O′ = O + p. */
export interface GenericTransformation {
  /** P, the linear part: its columns are the new basis vectors in the old basis (ITA eq. (1.5.1.4)). */
  readonly linearPart: Rows;
  /** p, the origin shift: the coordinates of the new origin in the old coordinate system; default zero. */
  readonly originShift?: readonly number[];
}

/** An operation (W, w) in the lattice basis, x ↦ W·x + w. */
export interface GenericOperation {
  /** The linear part W, integer entries. */
  readonly matrix: Rows;
  /** The translation part w; default zero (an operation of a point group). */
  readonly translation?: readonly number[];
}

/** The quantities to transform; each is optional. */
export interface GenericQuantities {
  /** Point coordinates x: x′ = P⁻¹(x − p), eq. (1.5.1.7). */
  readonly points?: readonly (readonly number[])[];
  /** Coefficients [uvw] of vectors (directions): [uvw]′ = P⁻¹[uvw], eq. (1.5.2.3). */
  readonly directions?: readonly (readonly number[])[];
  /** Miller indices (hkl) of planes, or coefficients of reciprocal vectors: (hkl)′ = (hkl)P, eq. (1.5.2.2). */
  readonly planes?: readonly (readonly number[])[];
  /** The metric tensor G: G′ = PᵀGP, eq. (1.5.2.4). */
  readonly metric?: Rows;
  /** Operations (W, w): W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p), eqs. (1.5.2.12), (1.5.2.13). */
  readonly operations?: readonly GenericOperation[];
}

/** The result: the inverse pair and every given quantity in the new coordinate system. */
export interface GenericChange {
  /** The inverse pair (Q, q) = (P, p)⁻¹ = (P⁻¹, −P⁻¹p), eq. (1.5.1.7), which takes the new coordinates back. */
  readonly inverse: { readonly linearPart: Rows; readonly originShift: readonly number[] };
  readonly points?: Rows;
  readonly directions?: Rows;
  readonly planes?: Rows;
  readonly metric?: Rows;
  readonly operations?: readonly { readonly matrix: Rows; readonly translation: readonly number[] }[];
}

const QUANTITY_KEYS = ['points', 'directions', 'planes', 'metric', 'operations'] as const;

function isRows(m: unknown, d: number): m is Rows {
  return (
    Array.isArray(m) &&
    m.length === d &&
    m.every((r) => Array.isArray(r) && r.length === d && r.every((x) => typeof x === 'number' && Number.isFinite(x)))
  );
}

function isVector(v: unknown, d: number): v is readonly number[] {
  return Array.isArray(v) && v.length === d && v.every((x) => typeof x === 'number' && Number.isFinite(x));
}

function product(a: RMatrix, b: RMatrix): RMatrix {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => add(s, multiply(x, b[k][j])), ZERO)));
}

function apply(a: RMatrix, v: readonly Rational[]): Rational[] {
  return a.map((row) => row.reduce((s, x, k) => add(s, multiply(x, v[k])), ZERO));
}

/** The determinant of a 2 × 2 or 3 × 3 rational matrix. */
function determinant(m: RMatrix): Rational {
  const t = (i: number, j: number) => m[i][j];
  if (m.length === 2) return subtract(multiply(t(0, 0), t(1, 1)), multiply(t(0, 1), t(1, 0)));
  const minor = (i: number, j: number, k: number, l: number) =>
    subtract(multiply(t(i, j), t(k, l)), multiply(t(i, l), t(k, j)));
  return add(
    subtract(multiply(t(0, 0), minor(1, 1, 2, 2)), multiply(t(0, 1), minor(1, 0, 2, 2))),
    multiply(t(0, 2), minor(1, 0, 2, 1)),
  );
}

/** The inverse of a regular 2 × 2 or 3 × 3 rational matrix, by the adjugate. */
function inverse(m: RMatrix): RMatrix {
  const det = determinant(m);
  const over = (x: Rational) => multiply(x, rational(det[1], det[0]));
  if (m.length === 2) {
    return [
      [over(m[1][1]), over(negate(m[0][1]))],
      [over(negate(m[1][0])), over(m[0][0])],
    ];
  }
  const c = (i: number, j: number) => {
    const rows = [0, 1, 2].filter((r) => r !== i);
    const cols = [0, 1, 2].filter((k) => k !== j);
    const minor = subtract(
      multiply(m[rows[0]][cols[0]], m[rows[1]][cols[1]]),
      multiply(m[rows[0]][cols[1]], m[rows[1]][cols[0]]),
    );
    return (i + j) % 2 === 0 ? minor : negate(minor);
  };
  // The inverse is the transposed matrix of cofactors over the determinant.
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => over(c(j, i))));
}

const numbers = (v: readonly Rational[]): number[] => v.map((x) => toNumber(x) + 0);
const floats = (m: RMatrix): number[][] => m.map((row) => numbers(row));

function floatProduct(a: Rows, b: Rows): number[][] {
  return a.map((row) => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0) + 0));
}

function floatApply(a: Rows, v: readonly number[]): number[] {
  return a.map((row) => row.reduce((s, x, k) => s + x * v[k], 0) + 0);
}

/**
 * The change of the coordinate system (P, p) applied to the given quantities, in d = 2 or 3
 * dimensions (ITA 2016 §§ 1.5.1.3, 1.5.2). `who` names the calling function in the messages.
 */
export function changeCoordinates(
  d: 2 | 3,
  transformation: GenericTransformation,
  quantities: GenericQuantities,
  options: ToleranceOptions | undefined,
  who: string,
): GenericChange {
  try {
    return transform(d, transformation, quantities, options, who);
  } catch (e) {
    // Exact arithmetic that leaves the safe integers names the function too.
    if (e instanceof RangeError && !e.message.startsWith(`${who}`))
      throw new RangeError(`${who}: ${e.message}`, { cause: e });
    throw e;
  }
}

function transform(
  d: 2 | 3,
  transformation: GenericTransformation,
  quantities: GenericQuantities,
  options: ToleranceOptions | undefined,
  who: string,
): GenericChange {
  checkOptions(options, TOLERANCE_KEYS, who);
  const tolerance = toleranceOf(options, 'operations');
  checkObject(transformation, `${who} takes the transformation { linearPart, originShift }`);
  checkObject(quantities, `${who} takes the quantities { ${QUANTITY_KEYS.join(', ')} }`);
  for (const key of Object.keys(transformation)) {
    if (key !== 'linearPart' && key !== 'originShift') {
      throw new RangeError(`${who}: unknown field ${shown(key)} of the transformation (linearPart, originShift)`);
    }
  }
  for (const key of Object.keys(quantities)) {
    if (!(QUANTITY_KEYS as readonly string[]).includes(key)) {
      throw new RangeError(`${who}: unknown quantity ${shown(key)} (${QUANTITY_KEYS.join(', ')})`);
    }
  }
  const P0 = transformation.linearPart;
  if (!isRows(P0, d)) throw new RangeError(`${who}: the linear part P must be a ${d} × ${d} matrix, not ${shown(P0)}`);
  const fraction = (x: number, what: string): Rational => simplestFraction(x, tolerance, what);
  const P = P0.map((row) => row.map((x) => fraction(x, 'entry of P')));
  if (determinant(P)[0] === 0) throw new RangeError(`${who}: the linear part P is singular (det P = 0)`);
  // Only a missing origin shift is zero; null is a wrong value, not a missing one.
  const shift0 =
    transformation.originShift === undefined ? Array.from({ length: d }, () => 0) : transformation.originShift;
  if (!isVector(shift0, d))
    throw new RangeError(`${who}: the origin shift p must be ${d} numbers, not ${shown(shift0)}`);
  const p = shift0.map((x) => fraction(x, 'coordinate of p'));
  const Q = inverse(P);
  const q = apply(Q, p).map(negate);
  const Pf = floats(P);
  const Qf = floats(Q);
  const pf = numbers(p);

  const vectors = (name: string, list: unknown): readonly (readonly number[])[] => {
    if (!Array.isArray(list) || !list.every((v) => isVector(v, d))) {
      throw new RangeError(`${who}: ${name} must be a list of vectors of ${d} numbers, not ${shown(list)}`);
    }
    return list as readonly (readonly number[])[];
  };

  const result: Record<string, unknown> = { inverse: { linearPart: floats(Q), originShift: numbers(q) } };
  if (quantities.points !== undefined) {
    result.points = vectors('points', quantities.points).map((x) =>
      floatApply(
        Qf,
        x.map((xi, i) => xi - pf[i]),
      ),
    );
  }
  if (quantities.directions !== undefined) {
    result.directions = vectors('directions', quantities.directions).map((u) => floatApply(Qf, u));
  }
  if (quantities.planes !== undefined) {
    // A row (hkl) times P: the j-th index is Σ_i h_i P_ij.
    result.planes = vectors('planes', quantities.planes).map((h) =>
      Pf[0].map((_, j) => h.reduce((s, hi, i) => s + hi * Pf[i][j], 0) + 0),
    );
  }
  if (quantities.metric !== undefined) {
    const G = quantities.metric;
    if (!isRows(G, d)) throw new RangeError(`${who}: the metric must be a ${d} × ${d} matrix, not ${shown(G)}`);
    const Pt = Pf[0].map((_, j) => Pf.map((row) => row[j]));
    result.metric = floatProduct(floatProduct(Pt, G), Pf);
  }
  if (quantities.operations !== undefined) {
    const ops: unknown = quantities.operations;
    if (!Array.isArray(ops)) throw new RangeError(`${who}: operations must be a list, not ${shown(ops)}`);
    result.operations = ops.map((op: unknown, n) => {
      checkObject(op, `${who}: operation ${n + 1} is a record { matrix, translation }`);
      const { matrix, translation } = op as GenericOperation;
      if (!isRows(matrix, d)) {
        throw new RangeError(`${who}: the matrix W of operation ${n + 1} must be ${d} × ${d}, not ${shown(matrix)}`);
      }
      const W = matrix.map((row) =>
        row.map((x) => {
          if (Math.abs(x - Math.round(x)) >= tolerance) {
            throw new RangeError(
              `${who}: the matrix W of operation ${n + 1} has integer entries, not ${shown(matrix)}`,
            );
          }
          return rational(Math.round(x));
        }),
      );
      if (determinant(W)[1] !== 1 || Math.abs(determinant(W)[0]) !== 1) {
        throw new RangeError(`${who}: the matrix W of operation ${n + 1} has det W = ±1, not ${shown(matrix)}`);
      }
      const t0 = translation === undefined ? Array.from({ length: d }, () => 0) : translation;
      if (!isVector(t0, d)) {
        throw new RangeError(`${who}: the translation of operation ${n + 1} must be ${d} numbers, not ${shown(t0)}`);
      }
      const w = t0.map((x) => fraction(x, 'translation'));
      const W1 = product(product(Q, W), P);
      if (!W1.every((row) => row.every(isInteger))) {
        throw new RangeError(
          `${who}: operation ${n + 1} has no integral matrix in the new basis (P⁻¹WP = ${shown(floats(W1))}): ` +
            'the new basis does not span a lattice that the operation maps onto itself',
        );
      }
      // w′ = Q(w + (W − I)p)
      const WminusI = W.map((row, i) => row.map((x, j) => (i === j ? subtract(x, ONE) : x)));
      const shifted = apply(WminusI, p).map((x, i) => add(w[i], x));
      return { matrix: floats(W1), translation: numbers(apply(Q, shifted)) };
    });
  }
  return result as unknown as GenericChange;
}

// --- the three-dimensional API (symcrys, symcrys/magnetic) -------------------------------------------

/** A change of the coordinate system (P, p) (ITA 2016 § 1.5.1.3, p. 83): (a′, b′, c′) = (a, b, c)·P, origin O′ = O + p. */
export interface CoordinateTransformation {
  /** P, the linear part: its columns are the new basis vectors a′, b′, c′ in the old basis (eq. (1.5.1.4)); det P ≠ 0, also negative. */
  readonly linearPart: Mat3;
  /** p, the origin shift: the coordinates of the new origin in the old coordinate system; default zero. */
  readonly originShift?: Vec3;
}

/** An operation (W, w) in the lattice basis, x ↦ W·x + w; a record of `operations` passes as it is. */
export interface AffineOperation {
  /** The linear part W, integer entries. */
  readonly matrix: Mat3;
  /** The translation part w; default zero, as for the operations of a point group. */
  readonly translation?: Vec3;
}

/** An operation (W′, w′) in the new coordinate system. */
export interface TransformedOperation {
  /** W′ = P⁻¹WP, integer entries. */
  readonly matrix: Mat3;
  /** w′ = P⁻¹(w + (W − I)p), not reduced modulo the lattice. */
  readonly translation: Vec3;
}

/** The quantities that `changeOfCoordinates` transforms; each is optional. */
export interface CoordinateQuantities {
  /** Point coordinates x: x′ = P⁻¹(x − p) (eq. (1.5.1.7)). */
  readonly points?: readonly Vec3[];
  /** Coefficients [uvw] of vectors, e.g. directions: [uvw]′ = P⁻¹[uvw] (eq. (1.5.2.3)); not changed by the origin shift. */
  readonly directions?: readonly Vec3[];
  /** Miller indices (hkl) of planes: (hkl)′ = (hkl)P (eq. (1.5.2.2)); not changed by the origin shift. */
  readonly planes?: readonly Vec3[];
  /** The metric tensor G: G′ = PᵀGP (eq. (1.5.2.4)). */
  readonly metric?: Mat3;
  /** Operations (W, w): W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p) (eqs. (1.5.2.12), (1.5.2.13)). */
  readonly operations?: readonly AffineOperation[];
}

/** The inverse change of the coordinate system (Q, q) = (P, p)⁻¹. */
export interface InverseTransformation {
  /** Q = P⁻¹. */
  readonly linearPart: Mat3;
  /** q = −P⁻¹p. */
  readonly originShift: Vec3;
}

/** The result of `changeOfCoordinates`: the inverse pair and each given quantity in the new coordinate system. */
export interface CoordinateChange {
  /** (Q, q) = (P⁻¹, −P⁻¹p), which takes the new coordinates back to the old (eq. (1.5.1.7)). */
  readonly inverse: InverseTransformation;
  /** The points, as given, in the new coordinates. */
  readonly points?: readonly Vec3[];
  /** The vector coefficients, as given, in the new basis. */
  readonly directions?: readonly Vec3[];
  /** The Miller indices, as given, in the new basis. */
  readonly planes?: readonly Vec3[];
  /** The metric tensor in the new basis. */
  readonly metric?: Mat3;
  /** The operations, as given, in the new coordinate system. */
  readonly operations?: readonly TransformedOperation[];
}

/**
 * Changes the coordinate system by the pair (P, p) of ITA (6th ed., 2016) § 1.5.1.3 (p. 83): the
 * new basis is (a′, b′, c′) = (a, b, c)·P and the new origin lies at p. Transforms the given
 * quantities by ITA's equations (§ 1.5.2, pp. 83–85): point coordinates x′ = P⁻¹(x − p), vector
 * coefficients [uvw]′ = P⁻¹[uvw], Miller indices (hkl)′ = (hkl)P, the metric tensor G′ = PᵀGP, and
 * operations W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p); and gives the inverse pair (Q, q) = (P⁻¹, −P⁻¹p).
 * det P may be negative (a change of handedness, which ITA allows; § 1.5.1.2, p. 76).
 *
 * P, p and the operations are read each number as the simplest fraction within the tolerance
 * (default `EPSILON`; 0.3333333 is 1/3) and transformed exactly, so that every result, the inverse
 * pair included, can be passed back; the other quantities are floating point. P is rational in a
 * change between lattice bases, as in ITA; an irrational P (a rotation by 30°) is read as the
 * nearby fractions, about as exact as the tolerance, and a much smaller tolerance can make the exact
 * products leave the safe integers, a RangeError.
 * A transformed
 * operation has a `matrix` and a `translation` alone: other fields of the record (`cartesian`, in the
 * magnetic API `timeReversal`) are not carried over, so they are matched by index. Throws a
 * RangeError for a singular P, a quantity of the wrong shape, an unknown quantity, an operation with
 * det W ≠ ±1, and one whose W′ is not integral (the new basis does not span a lattice that the
 * operation maps onto itself).
 */
export function changeOfCoordinates(
  transformation: CoordinateTransformation,
  quantities: CoordinateQuantities,
  options?: ToleranceOptions,
): CoordinateChange {
  return deepFreeze(
    changeCoordinates(3, transformation, quantities, options, 'changeOfCoordinates') as unknown as CoordinateChange,
  );
}
