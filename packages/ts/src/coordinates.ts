/**
 * The change of the coordinate system by a matrix–column pair (P, p) after ITA (6th ed., 2016)
 * Chapter 1.5 (§§ 1.5.1.3, 1.5.2, pp. 83–85), for d = 2 and d = 3. Internal; the
 * entry points wrap it with their matrix types (docs/conventions.md, "Change of the coordinate
 * system").
 *
 * The linear part P and the matrices W are read each number as the simplest fraction within the
 * tolerance and transformed exactly, so that W′ = P⁻¹WP is exactly integral where it is; the origin
 * shift p and the translations w are exact when every number of them is a fraction to rounding and
 * floating point otherwise, as are points, direction and plane coefficients and the metric.
 */

import { checkObject, checkOptions, shown, TOLERANCE_KEYS, everyEntry } from './checks.js';
import { EXACT_DENOMINATOR, ROUNDING_EPSILON, toleranceOf, type ToleranceOptions } from './tolerances.js';
import { deepFreeze } from './freeze.js';
import { checkOptionalTimeReversal } from './operations.js';
import {
  rationalApply,
  rationalDeterminant,
  rationalInverse,
  rationalProduct,
  type RMatrix,
} from './spaceGroups/affine.js';
import type { Mat3, Vec3 } from './linalg.js';
import {
  ONE,
  add,
  isInteger,
  simplestFraction,
  negate,
  rational,
  subtract,
  toNumber,
  type Rational,
} from './spaceGroups/rational.js';

/** A matrix as rows of numbers. */
type Rows = readonly (readonly number[])[];

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
    everyEntry(
      m,
      (r) => Array.isArray(r) && r.length === d && everyEntry(r, (x) => typeof x === 'number' && Number.isFinite(x)),
    )
  );
}

function isVector(v: unknown, d: number): v is readonly number[] {
  return Array.isArray(v) && v.length === d && everyEntry(v, (x) => typeof x === 'number' && Number.isFinite(x));
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
  // A number that is a fraction to rounding is that fraction; otherwise the simplest fraction within
  // the tolerance (0.3333333 is 1/3).
  const exact = (x: number): Rational | undefined => {
    const f = simplestFraction(x, ROUNDING_EPSILON, 'number');
    return f[1] <= EXACT_DENOMINATOR ? f : undefined;
  };
  const fraction = (x: number, what: string): Rational =>
    (typeof x === 'number' && Number.isFinite(x) ? exact(x) : undefined) ?? simplestFraction(x, tolerance, what);
  // Every number lies within 1/q² of a fraction p/q (Dirichlet), so a fraction found within the
  // tolerance says something only for small q: a number without one (cos 30°, from a rotation by
  // 30°) meets a fraction with q ≤ Q within the tolerance with a chance of about Q²·tolerance; with
  // Q = tolerance^(-1/3) that chance is tolerance^(1/3), about 2 % at 10⁻⁵ (Q = 46). An entry that
  // is a fraction to rounding (1/16, 2/3) is taken as it is at any tolerance.
  const largest = Math.floor(tolerance ** (-1 / 3) + ROUNDING_EPSILON);
  const P = P0.map((row) =>
    row.map((x) => {
      const f = fraction(x, 'entry of P');
      if (f[1] > largest && !exact(x)) {
        const rotate = d === 3 ? '; to turn a tensor by a rotation, use rotateTensor' : '';
        throw new RangeError(
          `${who}: the linear part P is not rational within the tolerance ${tolerance}: its entry ${shown(x)} is no fraction with a denominator of at most ${largest}. P is a change of basis between lattice bases (entries such as 1, 1/2, 1/3)${rotate}`,
        );
      }
      return f;
    }),
  );
  if (rationalDeterminant(P)[0] === 0) throw new RangeError(`${who}: the linear part P is singular (det P = 0)`);
  // Only a missing origin shift is zero; null is a wrong value, not a missing one.
  const shift0 =
    transformation.originShift === undefined ? Array.from({ length: d }, () => 0) : transformation.originShift;
  if (!isVector(shift0, d))
    throw new RangeError(`${who}: the origin shift p must be ${d} numbers, not ${shown(shift0)}`);
  // p and w are positions, not a basis: a number that is a fraction to rounding (1/3 written as
  // 0.3333333333) is that fraction, any other is taken as it is (0.1234 stays 0.1234). The tolerance
  // reads only the matrices.
  const position = (x: number): Rational | undefined => exact(x);
  const pExact = shift0.map(position);
  const Q = rationalInverse(P);
  const Pf = floats(P);
  const Qf = floats(Q);
  const pf = shift0.map((x, i) => (pExact[i] ? toNumber(pExact[i]) : x) + 0);
  const pAll = pExact.every((x) => x !== undefined) ? (pExact as Rational[]) : undefined;
  const q = pAll ? numbers(rationalApply(Q, pAll).map(negate)) : floatApply(Qf, pf).map((x) => -x + 0);

  const vectors = (name: string, list: unknown): readonly (readonly number[])[] => {
    if (!Array.isArray(list) || !everyEntry(list, (v) => isVector(v, d))) {
      throw new RangeError(`${who}: ${name} must be a list of vectors of ${d} numbers, not ${shown(list)}`);
    }
    return list as readonly (readonly number[])[];
  };

  const result: Record<string, unknown> = { inverse: { linearPart: floats(Q), originShift: q } };
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
    // Array.from: a hole of a sparse list is undefined, and refused, not skipped.
    result.operations = Array.from(ops as unknown[]).map((op: unknown, n) => {
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
      if (rationalDeterminant(W)[1] !== 1 || Math.abs(rationalDeterminant(W)[0]) !== 1) {
        throw new RangeError(`${who}: the matrix W of operation ${n + 1} has det W = ±1, not ${shown(matrix)}`);
      }
      const t0 = translation === undefined ? Array.from({ length: d }, () => 0) : translation;
      if (!isVector(t0, d)) {
        throw new RangeError(`${who}: the translation of operation ${n + 1} must be ${d} numbers, not ${shown(t0)}`);
      }
      const wExact = t0.map(position);
      const W1 = rationalProduct(rationalProduct(Q, W), P);
      if (!W1.every((row) => row.every(isInteger))) {
        throw new RangeError(
          `${who}: operation ${n + 1} has no integral matrix in the new basis (P⁻¹WP = ${shown(floats(W1))}): ` +
            'the new basis does not span a lattice that the operation maps onto itself',
        );
      }
      // w′ = Q(w + (W − I)p), exactly where w and p are fractions, else in floating point.
      const WminusI = W.map((row, i) => row.map((x, j) => (i === j ? subtract(x, ONE) : x)));
      if (pAll && wExact.every((x) => x !== undefined)) {
        const shifted = rationalApply(WminusI, pAll).map((x, i) => add((wExact as Rational[])[i], x));
        return { matrix: floats(W1), translation: numbers(rationalApply(Q, shifted)) };
      }
      const wf = t0.map((x, i) => (wExact[i] ? toNumber(wExact[i]) : x));
      const shifted = floatApply(floats(WminusI), pf).map((x, i) => x + wf[i]);
      return { matrix: floats(W1), translation: floatApply(Qf, shifted) };
    });
  }
  return result as unknown as GenericChange;
}

// --- the three-dimensional API (symcrys, symcrys/magnetic) -------------------------------------------

/**
 * A change of the coordinate system (P, p): (a′, b′, c′) = (a, b, c)·P, origin O′ = O + p.
 *
 * @remarks Source: ITA (2016), § 1.5.1.3, p. 83.
 */
export interface CoordinateTransformation {
  /**
   * P, the linear part: its columns are the new basis vectors a′, b′, c′ in the old basis; det P ≠ 0,
   * also negative.
   *
   * @remarks Source: ITA (2016), eq. (1.5.1.4).
   */
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
  /**
   * Point coordinates x: x′ = P⁻¹(x − p).
   *
   * @remarks Source: ITA (2016), eq. (1.5.1.7).
   */
  readonly points?: readonly Vec3[];
  /**
   * Coefficients [uvw] of vectors, e.g. directions: [uvw]′ = P⁻¹[uvw]; not changed by the origin
   * shift.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.3).
   */
  readonly directions?: readonly Vec3[];
  /**
   * Miller indices (hkl) of planes: (hkl)′ = (hkl)P; not changed by the origin shift.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.2).
   */
  readonly planes?: readonly Vec3[];
  /**
   * The metric tensor G: G′ = PᵀGP.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.4).
   */
  readonly metric?: Mat3;
  /**
   * Operations (W, w): W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p).
   *
   * @remarks Source: ITA (2016), eqs. (1.5.2.12), (1.5.2.13).
   */
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
  /**
   * (Q, q) = (P⁻¹, −P⁻¹p), which takes the new coordinates back to the old.
   *
   * @remarks Source: ITA (2016), eq. (1.5.1.7).
   */
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

/** An operation (W, w) of the magnetic API passed to `changeOfCoordinates`: an `AffineOperation` that may say whether it carries time reversal. */
export interface MagneticAffineOperation extends AffineOperation {
  /** Whether the operation is combined with time reversal; given for every operation of the list or for none. */
  readonly timeReversal?: boolean;
}

/** An operation (W′, w′) of the magnetic API in the new coordinate system. */
export interface MagneticTransformedOperation extends TransformedOperation {
  /** The time reversal of the operation given; present when the operations given have it. */
  readonly timeReversal?: boolean;
}

/** The quantities that `changeOfCoordinates` of the magnetic API transforms; each is optional. */
export interface MagneticCoordinateQuantities extends CoordinateQuantities {
  /**
   * Operations (W, w): W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p); each keeps its time reversal.
   *
   * @remarks Source: ITA (2016), eqs. (1.5.2.12), (1.5.2.13).
   */
  readonly operations?: readonly MagneticAffineOperation[];
}

/** The result of `changeOfCoordinates` of the magnetic API. */
export interface MagneticCoordinateChange extends CoordinateChange {
  /** The operations, as given, in the new coordinate system, each with its time reversal if given. */
  readonly operations?: readonly MagneticTransformedOperation[];
}

/**
 * Changes the coordinate system by the pair (P, p): the new basis is (a′, b′, c′) = (a, b, c)·P and
 * the new origin lies at p. Transforms the given quantities by ITA's equations: point coordinates
 * x′ = P⁻¹(x − p), vector coefficients [uvw]′ = P⁻¹[uvw], Miller indices (hkl)′ = (hkl)P, the
 * metric tensor G′ = PᵀGP, and operations W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p); and gives the inverse
 * pair (Q, q) = (P⁻¹, −P⁻¹p). det P may be negative (a change of handedness, which ITA allows).
 *
 * P and the matrices W are read each number as a fraction and transformed exactly, so that every
 * result, the inverse pair included, can be passed back: a number that is a fraction to rounding is
 * that fraction, another is read as the simplest fraction within the tolerance (default `EPSILON`;
 * 0.3333333 is 1/3). The origin shift p and the translations w are positions: a fraction to rounding
 * (1/3 as 0.3333333333) is that fraction, another number is taken as it is (0.1234 stays 0.1234). P is rational in a change between
 * lattice bases, as in ITA: an entry of P that needs a fraction with a denominator above
 * tolerance^(−1/3) (46 at 10⁻⁵), such as cos 30° of a rotation, is refused
 * (docs/conventions.md, "Tolerances").
 * A transformed
 * operation has a `matrix` and a `translation` alone: other fields of the record (`cartesian`) are
 * not carried over, so they are matched by index. Throws a RangeError for a singular P, an entry of P that is not rational within the tolerance, a quantity
 * of the wrong shape, an unknown quantity, an operation with
 * det W ≠ ±1, and one whose W′ is not integral (the new basis does not span a lattice that the
 * operation maps onto itself).
 *
 * @remarks Source: ITA (6th ed., 2016), § 1.5.1.3, p. 83 (the pair (P, p)); § 1.5.2, pp. 83–85 (the
 * equations); § 1.5.1.2, p. 76 (a negative det P).
 */
export function changeOfCoordinates(
  transformation: CoordinateTransformation,
  quantities: CoordinateQuantities,
  options?: ToleranceOptions,
): CoordinateChange {
  // Not a boolean is a mistake of the caller in either entry point.
  const ops = (quantities as { readonly operations?: unknown } | null)?.operations;
  if (Array.isArray(ops)) checkOptionalTimeReversal(ops, 'changeOfCoordinates');
  return deepFreeze(
    changeCoordinates(3, transformation, quantities, options, 'changeOfCoordinates') as unknown as CoordinateChange,
  );
}

/**
 * Changes the coordinate system by the pair (P, p): the new basis is (a′, b′, c′) = (a, b, c)·P and
 * the new origin lies at p. Transforms the given quantities by ITA's equations: point coordinates
 * x′ = P⁻¹(x − p), vector coefficients [uvw]′ = P⁻¹[uvw], Miller indices (hkl)′ = (hkl)P, the
 * metric tensor G′ = PᵀGP, and operations W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p); and gives the inverse
 * pair (Q, q) = (P⁻¹, −P⁻¹p). det P may be negative (a change of handedness, which ITA allows).
 *
 * P and the matrices W are read each number as a fraction and transformed exactly, so that every
 * result, the inverse pair included, can be passed back: a number that is a fraction to rounding is
 * that fraction, another is read as the simplest fraction within the tolerance (default `EPSILON`;
 * 0.3333333 is 1/3). The origin shift p and the translations w are positions: a fraction to rounding
 * (1/3 as 0.3333333333) is that fraction, another number is taken as it is (0.1234 stays 0.1234). P is rational in a change between
 * lattice bases, as in ITA: an entry of P that needs a fraction with a denominator above
 * tolerance^(−1/3) (46 at 10⁻⁵), such as cos 30° of a rotation, is refused
 * (docs/conventions.md, "Tolerances").
 * A transformed operation keeps the time reversal of the operation given (`timeReversal`), so that
 * it can be passed on to the functions that read the matrices W (`residualOperations`, a further
 * `changeOfCoordinates`); when no operation has `timeReversal`, none of the results has it. Other
 * fields of the record (`cartesian`) are not carried over. Throws a RangeError for a list in which
 * some operations have `timeReversal` and others do not, a singular P, an entry of P that is not
 * rational within the tolerance, a quantity of the wrong shape, an unknown quantity, an operation
 * with det W ≠ ±1, and one whose W′ is not integral (the new basis does not span a lattice that the
 * operation maps onto itself).
 *
 * @remarks Source: ITA (6th ed., 2016), § 1.5.1.3, p. 83 (the pair (P, p)); § 1.5.2, pp. 83–85 (the
 * equations); § 1.5.1.2, p. 76 (a negative det P).
 */
export function changeOfMagneticCoordinates(
  transformation: CoordinateTransformation,
  quantities: MagneticCoordinateQuantities,
  options?: ToleranceOptions,
): MagneticCoordinateChange {
  const ops = (quantities as { readonly operations?: unknown } | null)?.operations;
  // Array.from: a hole is undefined, refused by the transformation below.
  const given = Array.isArray(ops) ? Array.from(ops as unknown[]) : undefined;
  const reversal = given?.map((op) => (op as { readonly timeReversal?: unknown } | null)?.timeReversal);
  if (given !== undefined && reversal !== undefined) {
    checkOptionalTimeReversal(given, 'changeOfCoordinates');
    const without = reversal.findIndex((x) => x === undefined);
    const withIt = reversal.findIndex((x) => x !== undefined);
    if (without >= 0 && withIt >= 0) {
      throw new RangeError(
        `changeOfCoordinates: operation ${withIt} has timeReversal and operation ${without} has not: ` +
          'give timeReversal for every operation or for none',
      );
    }
  }
  const change = changeOfCoordinates(transformation, quantities, options);
  if (reversal === undefined || reversal.every((x) => x === undefined)) return change;
  return deepFreeze({
    ...change,
    operations: (change.operations ?? []).map((op, n) => ({ ...op, timeReversal: reversal[n] as boolean })),
  });
}
