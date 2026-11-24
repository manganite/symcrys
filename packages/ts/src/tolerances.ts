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
