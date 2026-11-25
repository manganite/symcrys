/**
 * Numeric tolerances, in one place. The values differ on purpose: each gates a different quantity.
 * The tolerance a caller passes is one contract for every function (docs/conventions.md,
 * "Tolerances"): one option, one metric per kind of object, one check.
 */

import { shown } from './checks.js';

/**
 * The default tolerance of every function that compares numbers a caller passes in (operations,
 * directions, points): two numbers closer than this count as equal, in the metric of their kind
 * (docs/conventions.md, "Tolerances").
 */
export const EPSILON = 1e-6;

/**
 * During group closure, an entry closer than this to one of the exact values in `SNAP_VALUES`
 * (linalg.ts) is replaced by it, so rounding errors cannot accumulate over repeated products.
 */
export const SNAP_EPSILON = 1e-9;

/** The tolerance of a function that compares numbers a caller passes in. */
export interface ToleranceOptions {
  /**
   * Two numbers closer than this count as equal; default `EPSILON` (10⁻⁶). It is measured per
   * matrix entry for operations, as the distance of unit vectors for directions and per coordinate
   * modulo the lattice for points (docs/conventions.md, "Tolerances").
   */
  readonly tolerance?: number;
}

/**
 * The upper bound of the tolerance per kind of object, above which it says nothing: two distinct
 * operations A, B of a crystallographic point group differ in some entry by at least √2/3 ≈ 0.47 in
 * any orthonormal frame (‖A − B‖ = ‖1 − A⁻¹B‖ ≥ √2 in the Frobenius norm, the least for a sixfold
 * rotation), so 0.1 keeps them apart; two unit vectors are at most 2 apart; two points modulo the
 * lattice at most 1/2 per coordinate; a relative deviation of the metric tensor is at most of the
 * order of 1.
 */
export const TOLERANCE_BOUND = Object.freeze({ operations: 0.1, directions: 1, points: 0.5, metric: 1 });

/**
 * The tolerance of the options, checked: a finite number above 0 and below the bound of the kind
 * of object it measures; the default `EPSILON`.
 */
export function toleranceOf(options: ToleranceOptions | undefined, kind: keyof typeof TOLERANCE_BOUND): number {
  // Only a missing tolerance takes the default; null is a wrong value, not a missing one.
  const t: unknown = options?.tolerance === undefined ? EPSILON : options.tolerance;
  const bound = TOLERANCE_BOUND[kind];
  if (!(typeof t === 'number' && t > 0 && t < bound)) {
    throw new RangeError(`The tolerance must be a number above 0 and below ${bound}, not ${shown(t)}`);
  }
  return t;
}

/**
 * Making a group of a caller exact (`idealGroup`, closure.ts): a product is matched to the nearest
 * element of the group, which must lie closer than `PRODUCT_MATCH` per entry (distinct operations
 * of a point group differ by at least √2/3 ≈ 0.47 in some entry, so a nearer one is the product);
 * the averaging has settled when no entry changes by `IDEAL_SETTLED` or more in a pass, and fails
 * if after `IDEAL_PASSES` passes an entry still changes by `IDEAL_UNSETTLED` (it settles in one to
 * six passes for every point group, exact or rounded); entries within `IDEAL_SNAP` of an exact value
 * are set to it, which catches the rounding of the last bits but not a group turned by a small
 * angle.
 */
export const PRODUCT_MATCH = 0.25;
export const IDEAL_SETTLED = 1e-15;
export const IDEAL_UNSETTLED = 1e-12;
export const IDEAL_PASSES = 50;
export const IDEAL_SNAP = 1e-12;

/**
 * The largest pivot threshold of a tensor form (tensorForm.ts, `reduce`): the threshold is raised
 * up to this only in a general orientation, when components of the order of 10⁻⁷ would otherwise be
 * taken for independent ones; a genuine pivot of a form of a point group is far larger.
 */
export const MAX_PIVOT_THRESHOLD = 1e-2;

// --- internal tolerances of the computations -------------------------------------------------------
//
// The constants below gate numbers that symcrys computes itself, not those of a caller: they sit far
// below anything a crystallographic quantity can differ by and far above the rounding of a double
// (about 10⁻¹⁶ relative), so they decide nothing but rounding. One convention: a difference strictly
// below the constant counts as equal or as zero (`<`), and a bound that refuses (a singular matrix, a
// flat cell) refuses a value on it too. Every literal tolerance of the library is one of these.

/**
 * A computed number within this of an integer is that integer: the entries of a matrix W in the
 * lattice basis computed from Cartesian matrices (pointGroups.ts, `integer`), or passed as the
 * integer `matrix` of an operation (cell.ts, `residualOperations`).
 */
export const INTEGER_EPSILON = 1e-9;

/**
 * Two numbers computed from exact data in floating point are equal within this: a point of a plane
 * group that its fixing operations map onto itself modulo the lattice (spaceGroups/positions.ts),
 * and, per vector averaged, the length below which a mean of unit vectors counts as zero
 * (siteSymmetry.ts).
 */
export const ROUNDING_EPSILON = 1e-9;

/**
 * The margin of a floor, a ceiling or a closed interval taken of a number that is exact up to
 * rounding (a rational turned into a double): the translates of a symmetry element that meet a box
 * and the class of a line (spaceGroups/cell.ts), the dependence of two integer columns
 * (spaceGroups/positions.ts), so that a boundary value counts as inside.
 */
export const BOUNDARY_EPSILON = 1e-12;

/**
 * The ratio |det| / (product of the column lengths) below which a matrix counts as singular; for a
 * cell it is V/(abc), for a plane cell the area over ab. One criterion for `inverse`, the cell
 * functions and the plane bases (linalg.ts, `isSingular`; spaceGroups/planeLattice.ts;
 * spaceGroups/positions.ts). It depends neither on the unit of the entries nor on the lengths of the
 * columns relative to each other.
 */
export const SINGULAR_RATIO = 1e-9;

/**
 * A cell is flat when V/(abc) (in the plane sin γ, the area over ab) is below this: `isValidCell`
 * compares its square, the radicand 1 − cos²α − cos²β − cos²γ + 2 cos α cos β cos γ, with
 * `FLAT_CELL_RADICAND`, and `latticeFromParameters` of the plane refuses such a γ.
 */
export const FLAT_CELL_RATIO = 1e-6;
/** `FLAT_CELL_RATIO` squared, the bound of the radicand of the volume (cell.ts, `isValidCell`). */
export const FLAT_CELL_RADICAND = 1e-12;

/**
 * Two unit vectors whose dot product is within this of ±1 are parallel (the axis of an operation
 * along a symmetry direction, pointGroups/elements.ts), and a rotation by an angle (radians) below
 * this is the identity.
 */
export const AXIS_EPSILON = 1e-6;

/**
 * Row reduction (tensors/rowEchelon.ts): an entry below `PIVOT_EPSILON` does not serve as a pivot,
 * so float noise is never a new direction; one below `ELIMINATION_EPSILON` is not eliminated and is
 * set to zero in the result. The values are those of birss-app's `linalg.ts`, where the tensor code
 * comes from; `MAX_PIVOT_THRESHOLD` (above) bounds the raised threshold.
 */
export const PIVOT_EPSILON = 1e-7;
export const ELIMINATION_EPSILON = 1e-12;

// --- bounds --------------------------------------------------------------------------------------

/** No point group has more than 96 operations (m-3m1'): a closure beyond that is no point group. */
export const MAX_POINT_GROUP_ORDER = 96;

/**
 * The bound of a closure of Cartesian operations a caller passes in (closure.ts), well above the
 * largest point group, so that the error message can say the operations generate no finite group.
 */
export const MAX_GROUP_ORDER = 200;
