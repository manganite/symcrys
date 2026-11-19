/**
 * Site symmetry of a direction under any list of point operations: which operations leave it
 * fixed (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { apply, type Vec3 } from './linalg.js';
import type { Operation } from './operations.js';
import { EPSILON } from './tolerances.js';

export interface SiteSymmetryOptions {
  /**
   * A direction counts as fixed by an operation if the operation moves its unit vector by less
   * than this (Euclidean distance). Default `EPSILON` (10⁻⁶); a caller whose directions carry
   * rounding errors (e.g. read from a rounded link) passes a larger value.
   */
  readonly tolerance?: number;
}

/** The site symmetry of a direction. */
export interface SiteSymmetry {
  /** Indices into the given operations of those that leave the direction fixed, ascending. */
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

/** The tolerance of the options, checked. */
export function siteTolerance(options?: SiteSymmetryOptions): number {
  const t = options?.tolerance ?? EPSILON;
  if (!(typeof t === 'number' && t > 0 && t < 1)) throw new RangeError(`Invalid tolerance: ${String(t)}`);
  return t;
}

/**
 * The site symmetry of `direction` (any non-zero vector, Cartesian) under `operations`, which may
 * be any list of point operations (for instance those of a distorted crystal). Time reversal is
 * ignored: a direction or a face normal is not changed by it. `direction` and `multiplicity` are
 * meaningful when the operations form a group (then the fixing ones do too); for another list
 * `multiplicity` may not be an integer. Throws a RangeError for a zero vector.
 */
export function siteSymmetry(
  operations: readonly Operation[],
  direction: Vec3,
  options?: SiteSymmetryOptions,
): SiteSymmetry {
  const tolerance = siteTolerance(options);
  const v = unit(direction);
  const indices: number[] = [];
  operations.forEach((op, i) => {
    if (fixes(op, v, tolerance)) indices.push(i);
  });
  const sum: [number, number, number] = [0, 0, 0];
  for (const i of indices) {
    const w = apply(operations[i].matrix, v);
    sum[0] += w[0];
    sum[1] += w[1];
    sum[2] += w[2];
  }
  const projected = indices.length > 0 ? unit(sum) : v;
  return Object.freeze({
    operations: Object.freeze(indices),
    direction: Object.freeze(projected) as Vec3,
    multiplicity: indices.length > 0 ? operations.length / indices.length : operations.length,
    general: indices.every((i) => isIdentity(operations[i])),
  });
}
