/**
 * Site symmetry of a direction under any list of point operations: which operations leave it
 * fixed (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { apply, matricesEqual, multiply, type Vec3 } from './linalg.js';
import { checkOrthogonalWithin, type Operation } from './operations.js';
import { EPSILON } from './tolerances.js';

/** Options of `siteSymmetry` and `wyckoffPositionOf`. */
export interface SiteSymmetryOptions {
  /**
   * A direction counts as fixed by an operation if the operation moves its unit vector by less
   * than this (Euclidean distance). Default 10⁻⁶; a caller whose directions carry
   * rounding errors (e.g. read from a rounded link) passes a larger value.
   */
  readonly tolerance?: number;
}

/** The site symmetry of a direction. */
export interface SiteSymmetry {
  /**
   * Indices into the given operations of those that leave the direction fixed, ascending: for a group,
   * a subgroup (the operations fixing within the tolerance, closed under products, see `siteSymmetry`).
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
  const n = Math.hypot(v[0], v[1], v[2]);
  if (!(n > 0) || !Number.isFinite(n)) throw new RangeError(`Not a direction: ${JSON.stringify(v)}`);
  return [v[0] / n, v[1] / n, v[2] / n];
}

function fixes(op: Operation, v: Vec3, tolerance: number): boolean {
  const w = apply(op.matrix, v);
  return Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < tolerance;
}

function isIdentity(op: Operation): boolean {
  return op.matrix.every((row, i) => row.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < EPSILON));
}

/**
 * The products of a list of operations, looked up as needed: `i * n + j` → index of op[i]·op[j] in
 * the list, or -1. Made per call, not kept between calls: a caller may change its list in place
 * (#90).
 */
function productLookup(operations: readonly Operation[]): (i: number, j: number) => number {
  const table = new Map<number, number>();
  return (i, j) => {
    const key = i * operations.length + j;
    let k = table.get(key);
    if (k === undefined) {
      const product = multiply(operations[i].matrix, operations[j].matrix);
      k = operations.findIndex((op) => matricesEqual(op.matrix, product));
      table.set(key, k);
    }
    return k;
  };
}

/** The indices plus those of every product of two of them that is itself in the list, until closed. */
function closeWithin(product: (i: number, j: number) => number, indices: readonly number[]): number[] {
  const set = [...indices];
  const inSet = new Set(set);
  // Each element is multiplied with every element before it once, in both orders, as it is added.
  for (let i = 0; i < set.length; i++) {
    for (let j = 0; j <= i; j++) {
      for (const k of [product(set[i], set[j]), product(set[j], set[i])]) {
        if (k >= 0 && !inSet.has(k)) {
          inSet.add(k);
          set.push(k);
        }
      }
    }
  }
  return set.sort((x, y) => x - y);
}

/** The normalised mean of the images of v under the operations at `indices`; undefined if it vanishes. */
function meanImage(operations: readonly Operation[], indices: readonly number[], v: Vec3): Vec3 | undefined {
  if (indices.length === 0) return v;
  const sum: [number, number, number] = [0, 0, 0];
  for (const i of indices) {
    const w = apply(operations[i].matrix, v);
    sum[0] += w[0];
    sum[1] += w[1];
    sum[2] += w[2];
  }
  const n = Math.hypot(sum[0], sum[1], sum[2]);
  return n > 1e-9 * indices.length ? [sum[0] / n, sum[1] / n, sum[2] / n] : undefined;
}

const sameIndices = (a: readonly number[], b: readonly number[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** The tolerance of the options, checked. */
export function siteTolerance(options?: SiteSymmetryOptions): number {
  const t = options?.tolerance ?? EPSILON;
  if (!(typeof t === 'number' && t > 0 && t < 1)) throw new RangeError(`Invalid tolerance: ${String(t)}`);
  return t;
}

/**
 * The site symmetry of `direction` (any non-zero vector, Cartesian) under `operations`, which may
 * be any list of point operations (for instance those of a distorted crystal). Time reversal is
 * ignored: a direction or a face normal is not changed by it. The operations fixing the direction
 * within the tolerance are closed under the products found in the list and the direction is set onto
 * their fixed space, repeated until stable, so that for a group the result is a subgroup and the
 * set direction lies exactly on its elements. For a list that is not a group, `multiplicity` may
 * not be an integer. The matrices must be Cartesian and orthogonal (not those of
 * `latticeOperations`). Throws a RangeError for a matrix that is not orthogonal (within
 * `tolerance`, at least `EPSILON`), for a zero vector, and if the closed operations fix no common
 * direction (a tolerance far too large, e.g. 0.5).
 */
export function siteSymmetry(
  operations: readonly Operation[],
  direction: Vec3,
  options?: SiteSymmetryOptions,
): SiteSymmetry {
  const tolerance = siteTolerance(options);
  operations.forEach((op, i) => checkOrthogonalWithin(op.matrix, `Operation ${i}`, tolerance));
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
  const product = productLookup(operations);
  let set = closeWithin(product, fixing(v));
  let settled: { indices: number[]; projected: Vec3 } | undefined;
  for (let pass = 0; pass < 8 && !settled; pass++) {
    const mean = meanImage(operations, set, v);
    if (mean === undefined) {
      throw new RangeError(
        `No common fixed direction for the operations fixing ${JSON.stringify(direction)} within ${tolerance} (tolerance too large?)`,
      );
    }
    const next = closeWithin(product, fixing(mean));
    if (sameIndices(next, set)) settled = { indices: set, projected: mean };
    else set = next;
  }
  if (!settled) {
    // Not seen in practice; the site symmetry would be neither closed nor its direction projected (#91).
    throw new RangeError(
      `The site symmetry of ${JSON.stringify(direction)} does not settle within ${tolerance} (tolerance too large?)`,
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
