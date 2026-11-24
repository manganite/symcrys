/**
 * Numeric tolerances, in one place. The values differ on purpose: each gates a different quantity.
 * The tolerance a caller passes is one contract for every function (docs/conventions.md,
 * "Tolerances"): one option, one metric per kind of object, one check.
 */

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
 * The upper bound of the tolerance per kind of object, above which it says nothing: entries of the
 * Cartesian matrices of the point groups differ by at least 2 − √3 ≈ 0.27, so 0.1 keeps two of them
 * apart; two unit vectors are at most 2 apart; two points modulo the lattice at most 1/2 per
 * coordinate; a relative deviation of the metric tensor is at most of the order of 1.
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
    throw new RangeError(`The tolerance must be a number above 0 and below ${bound}, not ${JSON.stringify(t)}`);
  }
  return t;
}
