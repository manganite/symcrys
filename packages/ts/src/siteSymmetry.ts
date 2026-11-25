/**
 * Site symmetry of a direction under any list of point operations: which operations leave it
 * fixed (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { checkNumbers, checkOptions, shown, TOLERANCE_KEYS } from './checks.js';
import { apply, multiply, type Vec3 } from './linalg.js';
import { closeIndices } from './closure.js';
import { checkCartesianOperations, type CartesianOperation } from './operations.js';
import {
  EPSILON,
  ROUNDING_EPSILON,
  SITE_PASSES,
  TOLERANCE_BOUND,
  toleranceOf,
  type ToleranceOptions,
} from './tolerances.js';

/** The site symmetry of a direction. */
export interface SiteSymmetry {
  /**
   * Indices into the given operations of those that leave the direction fixed, ascending: for a group,
   * a subgroup (the operations fixing within the tolerance, closed under products, see `siteSymmetryOf`).
   */
  readonly operations: readonly number[];
  /**
   * The unit vector of the direction, set onto the fixed space of its site symmetry (the mean of
   * its images under the site symmetry, normalised), which removes rounding errors within the
   * tolerance.
   */
  readonly direction: Vec3;
  /** Number of operations divided by the order of the site symmetry: the number of equivalent directions. */
  readonly multiplicity: number;
  /** True if no operation other than the identity leaves the direction fixed (general position). */
  readonly general: boolean;
}

function unit(v: Vec3): Vec3 {
  checkNumbers(v, 3, 'A direction');
  const n = Math.hypot(v[0], v[1], v[2]);
  if (!(n > 0) || !Number.isFinite(n)) throw new RangeError(`Not a direction: ${shown(v)}`);
  return [v[0] / n, v[1] / n, v[2] / n];
}

function fixes(op: CartesianOperation, v: Vec3, tolerance: number): boolean {
  const w = apply(op.cartesian, v);
  return Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < tolerance;
}

function isIdentity(op: CartesianOperation): boolean {
  return op.cartesian.every((row, i) => row.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < EPSILON));
}

/**
 * The products of a list of operations, looked up as needed: `i * n + j` → index of op[i]·op[j] in
 * the list, or -1. The product is the whole operation, time reversal included, so that in a grey
 * group, where every matrix occurs twice, it finds the copy with the right time reversal (#133).
 * Matrices count as equal per entry within the tolerance, at least `EPSILON` and at most the bound
 * for operations (a tolerance for directions may be larger). Made per call, not kept between
 * calls: a caller may change its list in place (#90).
 */
function productLookup(operations: readonly CartesianOperation[], tolerance: number): (i: number, j: number) => number {
  const table = new Map<number, number>();
  const within = Math.min(Math.max(tolerance, EPSILON), TOLERANCE_BOUND.operations);
  const reversed = (op: CartesianOperation): boolean => op.timeReversal === true;
  return (i, j) => {
    const key = i * operations.length + j;
    let k = table.get(key);
    if (k === undefined) {
      const product = multiply(operations[i].cartesian, operations[j].cartesian);
      const timeReversal = reversed(operations[i]) !== reversed(operations[j]);
      k = operations.findIndex(
        (op) =>
          reversed(op) === timeReversal &&
          op.cartesian.every((row, a) => row.every((v, b) => Math.abs(v - product[a][b]) < within)),
      );
      table.set(key, k);
    }
    return k;
  };
}

/** The normalised mean of the images of v under the operations at `indices`; undefined if it vanishes. */
function meanImage(operations: readonly CartesianOperation[], indices: readonly number[], v: Vec3): Vec3 | undefined {
  if (indices.length === 0) return v;
  const sum: [number, number, number] = [0, 0, 0];
  for (const i of indices) {
    const w = apply(operations[i].cartesian, v);
    sum[0] += w[0];
    sum[1] += w[1];
    sum[2] += w[2];
  }
  const n = Math.hypot(sum[0], sum[1], sum[2]);
  return n > ROUNDING_EPSILON * indices.length ? [sum[0] / n, sum[1] / n, sum[2] / n] : undefined;
}

const sameIndices = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** The tolerance of the options for directions, checked. */
export function siteTolerance(options?: ToleranceOptions): number {
  return toleranceOf(options, 'directions');
}

/**
 * The site symmetry of `direction` (any non-zero vector, Cartesian) under `operations`, which may
 * be any list of point operations (for instance those of a distorted crystal). Time reversal is
 * ignored: a direction or a face normal is not changed by it. The operations fixing the direction
 * within the tolerance are closed under the products found in the list and the direction is set onto
 * their fixed space, repeated until stable, so that for a group the result is a subgroup and the
 * set direction lies exactly on its elements. For a list that is not a group, `multiplicity` may
 * not be an integer. Each operation is read by its Cartesian matrix
 * (`cartesian`). Throws a RangeError for an operation without an orthogonal Cartesian matrix (`cartesian`; within
 * `tolerance`, at least `EPSILON`), for a zero vector, and if the closed operations fix no common
 * direction or do not settle into a group (a tolerance far too large, e.g. 0.5).
 */
export function siteSymmetryOf(
  operations: readonly CartesianOperation[],
  direction: Vec3,
  options?: ToleranceOptions,
): SiteSymmetry {
  checkOptions(options, TOLERANCE_KEYS, 'siteSymmetryOf');
  const tolerance = siteTolerance(options);
  // Operations are checked in their own metric, at most with the bound for operations.
  checkCartesianOperations(operations, Math.min(tolerance, TOLERANCE_BOUND.operations));
  if (operations.length === 0) throw new RangeError('siteSymmetryOf takes a list of at least one operation');
  const v = unit(direction);
  const fixing = (w: Vec3): number[] => {
    const out: number[] = [];
    operations.forEach((op, i) => {
      if (fixes(op, w, tolerance)) out.push(i);
    });
    return out;
  };
  // Within the tolerance the operations fixing v need not form a group (near an axis a rotation can count
  // as fixing while its square does not). Close them under products found in the list, set v onto the
  // fixed space of the closure (the mean of its images, the projector for a group), and repeat on the
  // projected direction until the set is stable.
  const product = productLookup(operations, tolerance);
  let set = closeIndices(product, fixing(v));
  let settled: { indices: number[]; projected: Vec3 } | undefined;
  for (let pass = 0; pass < SITE_PASSES && !settled; pass++) {
    const mean = meanImage(operations, set, v);
    if (mean === undefined) {
      throw new RangeError(
        `No common fixed direction for the operations fixing ${shown(direction)} within ${tolerance} (tolerance too large?)`,
      );
    }
    const next = closeIndices(product, fixing(mean));
    if (sameIndices(next, set)) settled = { indices: set, projected: mean };
    else set = next;
  }
  if (!settled) {
    // Only for a tolerance far too large; the site symmetry would be neither closed nor its direction
    // projected (#91).
    throw new RangeError(
      `The site symmetry of ${shown(direction)} does not settle within ${tolerance} (tolerance too large?)`,
    );
  }
  const { indices, projected } = settled;
  return Object.freeze({
    operations: Object.freeze(indices),
    direction: Object.freeze(projected) as Vec3,
    multiplicity: indices.length > 0 ? operations.length / indices.length : operations.length,
    general: indices.every((i) => isIdentity(operations[i])),
  });
}
