/**
 * Site symmetry of a direction under a point group given as its list of operations: which
 * operations leave it fixed (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { checkNumbers, checkOptions, shown, TOLERANCE_KEYS } from './checks.js';
import { apply, IDENTITY, multiply, operatorNorm, type Mat3, type Vec3 } from './linalg.js';
import { checkGroup, idealOfList } from './closure.js';
import {
  checkCartesianOperations,
  checkOptionalTimeReversal,
  type CartesianOperation,
  type DirectionOperation,
} from './operations.js';
import { EPSILON, ROUNDING_EPSILON, TOLERANCE_BOUND, toleranceOf, type ToleranceOptions } from './tolerances.js';

/** The site symmetry of a direction. */
export interface SiteSymmetry {
  /**
   * Indices into the given operations of those that leave the direction fixed, ascending: a
   * subgroup, the operations that fix the most special symmetry element within the tolerance of the
   * direction (see `siteSymmetryOf`).
   */
  readonly operations: readonly number[];
  /**
   * The unit vector of the direction, set onto that element (its fixed space), which removes the
   * deviation within the tolerance.
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

/** True if the Cartesian matrix is the identity within `EPSILON` (time reversal aside). */
function isIdentity(op: CartesianOperation): boolean {
  return op.cartesian.every((row, i) => row.every((v, j) => Math.abs(v - (i === j ? 1 : 0)) < EPSILON));
}

/**
 * The products of a list of operations, looked up as needed: `i * n + j` → index of op[i]·op[j] in
 * the list, or -1. The product is the whole operation, time reversal included, so that in a grey
 * group, where every matrix occurs twice, it finds the copy with the right time reversal.
 * Matrices count as equal per entry within `within`.
 */
function productLookup(operations: readonly CartesianOperation[], within: number): (i: number, j: number) => number {
  const table = new Map<number, number>();
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

/** The tolerance of the options for directions, checked. */
export function siteTolerance(options?: ToleranceOptions): number {
  return toleranceOf(options, 'directions');
}

// --- a list of a caller made exact -----------------------------------------------------------------

/**
 * A list of operations of a caller and the exact group it approximates, index for index: the exact
 * operation nearest to each given one, and the deviation, the largest operator distance ‖A − E‖₂ of a
 * given matrix A from its exact counterpart E, which is how far the given operations move a unit
 * vector from where the exact ones move it.
 */
interface ExactList {
  readonly operations: readonly CartesianOperation[];
  readonly deviation: number;
}

/** Lists made exact, by content (a caller may change a list in place); the oldest goes first. */
const exactLists = new Map<string, ExactList>();
const EXACT_LISTS = 64;

/** The exact group of a list that `checkGroup` has accepted, index for index with the list. */
function exactList(operations: readonly CartesianOperation[], within: number): ExactList {
  const key = `${within}|${operations
    .map((op) => `${op.timeReversal === true ? 1 : 0}${op.cartesian.flat().join(',')}`)
    .join(';')}`;
  const known = exactLists.get(key);
  if (known) return known;
  // The list itself is made exact, index for index: checkGroup has found it closed within the
  // tolerance, and closing it again would count the errors of products of products against it.
  const aligned = idealOfList(operations, within).operations;
  const deviation = Math.max(
    ...operations.map((op, i) =>
      operatorNorm(op.cartesian.map((row, a) => row.map((v, b) => v - aligned[i].cartesian[a][b])) as unknown as Mat3),
    ),
  );
  const result = { operations: aligned, deviation };
  if (exactLists.size >= EXACT_LISTS) exactLists.delete(exactLists.keys().next().value!);
  exactLists.set(key, result);
  return result;
}

/**
 * The exact group of a list of a caller, checked: orthogonal matrices, a group within the
 * tolerance, and a tolerance not below the deviation of the list from it. Below it the caller's
 * matrices cannot tell whether a direction lies on an element, and a smaller site symmetry than the
 * one meant would be found without notice.
 */
function checkedExactList(
  operations: readonly DirectionOperation[],
  tolerance: number,
  who: string,
): readonly CartesianOperation[] {
  // Operations are checked in their own metric, at most with the bound for operations.
  const within = Math.min(tolerance, TOLERANCE_BOUND.operations);
  checkCartesianOperations(operations, within);
  // Left out, time reversal is false (it does not move a direction).
  checkOptionalTimeReversal(operations, who);
  const ops = operations.map((op) => ({ cartesian: op.cartesian, timeReversal: op.timeReversal === true }));
  checkGroup(ops, Math.max(within, EPSILON), who);
  const exact = exactList(ops, Math.max(within, EPSILON));
  if (tolerance < exact.deviation) {
    throw new RangeError(
      `${who}: the tolerance ${shown(tolerance)} is below the deviation ${exact.deviation.toPrecision(2)} of the ` +
        'operations from the exact group they approximate (the largest distance by which one moves a unit ' +
        'vector from where the exact operation moves it): pass a tolerance of at least the deviation, or ' +
        'more accurate operations',
    );
  }
  return exact.operations;
}

// --- the site symmetry in an exact group -------------------------------------------------------------

const near = (a: Mat3, b: Mat3): boolean =>
  a.every((row, i) => row.every((v, j) => Math.abs(v - b[i][j]) < ROUNDING_EPSILON));

/**
 * The projector onto the fixed space of an exact orthogonal matrix of finite order: the mean of its
 * powers (zero for the inversion and the rotoinversions, which fix no direction).
 */
function fixedSpaceProjector(w: Mat3): Mat3 {
  const powers: Mat3[] = [IDENTITY];
  for (let p = w; !near(p, IDENTITY); p = multiply(p, w)) {
    powers.push(p);
    if (powers.length > 6) throw new Error(`Not an operation of a point group: ${shown(w)}`);
  }
  return [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => powers.reduce((s, m) => s + m[i][j], 0) / powers.length),
  ) as unknown as Mat3;
}

/** A symmetry element of an exact group: the projector onto it and the operations that fix it pointwise. */
interface Element {
  readonly projector: Mat3;
  readonly indices: readonly number[];
}

/** The elements of an exact group, by the identity of its list (an exact list is not changed). */
const elementCache = new WeakMap<readonly CartesianOperation[], readonly Element[]>();

/**
 * The elements of an exact group: the whole space and the fixed space of each operation, once each,
 * with the operations that fix them pointwise.
 */
function elementsOf(operations: readonly CartesianOperation[]): readonly Element[] {
  let elements = elementCache.get(operations);
  if (!elements) {
    const projectors: Mat3[] = [IDENTITY];
    for (const op of operations) {
      const P = fixedSpaceProjector(op.cartesian);
      // The inversion and the rotoinversions fix no direction: no element.
      if (P.every((row) => row.every((x) => Math.abs(x) < ROUNDING_EPSILON))) continue;
      if (!projectors.some((Q) => near(P, Q))) projectors.push(P);
    }
    elements = projectors.map((P) => ({
      projector: P,
      indices: operations.flatMap((op, i) => (near(multiply(op.cartesian, P), P) ? [i] : [])),
    }));
    elementCache.set(operations, elements);
  }
  return elements;
}

/**
 * The site symmetry of the unit vector `v` in an exact group: the most special symmetry element
 * within the tolerance. The candidates are the fixed spaces of the operations (the whole space, a
 * mirror plane, a rotation axis; the fixed space of a site symmetry is always one of them); the
 * distance of v to one is ‖v − Pv‖ with its projector P. Of those closer than the tolerance, the one
 * fixed by the most operations wins, and of equal ones the nearest; the site symmetry is the
 * operations that fix it pointwise, and the direction is v set onto it. The rule applies to v: the set
 * direction can lie within the tolerance of a more special element than v does, so its site symmetry
 * is not to be taken again at the tolerance.
 */
function siteInExactGroup(operations: readonly CartesianOperation[], v: Vec3, tolerance: number): SiteSymmetry {
  let best: { indices: readonly number[]; distance: number; projected: Vec3 } | undefined;
  for (const { projector: P, indices } of elementsOf(operations)) {
    const projected = apply(P, v);
    const distance = Math.hypot(v[0] - projected[0], v[1] - projected[1], v[2] - projected[2]);
    if (!(distance < tolerance)) continue;
    if (
      !best ||
      indices.length > best.indices.length ||
      (indices.length === best.indices.length && distance < best.distance)
    ) {
      best = { indices, distance, projected };
    }
  }
  // The whole space is always a candidate, at distance 0.
  const { indices, projected } = best!;
  const n = Math.hypot(projected[0], projected[1], projected[2]);
  return Object.freeze({
    operations: Object.freeze([...indices]),
    direction: Object.freeze([projected[0] / n, projected[1] / n, projected[2] / n]) as unknown as Vec3,
    multiplicity: indices.length > 0 ? operations.length / indices.length : operations.length,
    general: indices.every((i) => isIdentity(operations[i])),
  });
}

/**
 * The site symmetry of `direction` (any non-zero vector, Cartesian) under `operations`, a point
 * group given as the list of all its operations (for instance those of a distorted crystal). Time
 * reversal is ignored: a direction or a face normal is not changed by it. The list is made an exact
 * group once, near it (its own matrices averaged over its product table); the site symmetry is that
 * of the most special symmetry element (a mirror plane or a rotation axis) whose distance to the
 * unit vector of the direction is below the tolerance, the direction set onto it; of elements fixed
 * by equally many operations, the nearest. The indices refer to the given list. An empty list is
 * the group 1. Each operation is read by its Cartesian matrix (`cartesian`). Throws a RangeError for
 * an operation without an orthogonal Cartesian matrix (`cartesian`; within `tolerance`, at least
 * `EPSILON`), for a list that is not closed under products (only generators, for instance; the error
 * names the missing product), for a tolerance below the deviation of the operations from the exact
 * group (the error names both), and for a zero vector.
 */
export function siteSymmetryOf(
  operations: readonly DirectionOperation[],
  direction: Vec3,
  options?: ToleranceOptions,
): SiteSymmetry {
  checkOptions(options, TOLERANCE_KEYS, 'siteSymmetryOf');
  const tolerance = siteTolerance(options);
  const v = unit(direction);
  if (Array.isArray(operations) && operations.length === 0) {
    return Object.freeze({
      operations: Object.freeze([]),
      direction: Object.freeze(v),
      multiplicity: 1,
      general: true,
    });
  }
  return siteInExactGroup(checkedExactList(operations, tolerance, 'siteSymmetryOf'), v, tolerance);
}

/** `siteSymmetryOf` for the operations of a key, which are an exact group, so that only the direction is checked. */
export function siteSymmetryOfGroup(
  operations: readonly CartesianOperation[],
  direction: Vec3,
  tolerance: number,
): SiteSymmetry {
  return siteInExactGroup(operations, unit(direction), tolerance);
}

/**
 * The orbit of a direction under a list of a caller: one pole per left coset g·H of its site
 * symmetry H (`siteSymmetryOf`), in the order in which the operations reach them, each the exact
 * image of the direction set onto the element of H, a unit vector. Images merged by a distance
 * would not be transitive at the tolerance and could split a coset; the cosets cannot disagree with
 * the site symmetry.
 */
export function orbitOfList(
  operations: readonly DirectionOperation[],
  direction: Vec3,
  tolerance: number,
): { direction: Vec3; operations: number[] }[] {
  const exact = checkedExactList(operations, tolerance, 'orbitOf');
  const site = siteInExactGroup(exact, unit(direction), tolerance);
  // The exact operations are a group to rounding: their products are found within it.
  const product = productLookup(exact, 1e-6);
  const done = new Set<number>();
  const poles: { direction: Vec3; operations: number[] }[] = [];
  exact.forEach((op, i) => {
    if (done.has(i)) return;
    const coset = [...new Set(site.operations.map((h) => product(i, h)))].sort((a, b) => a - b);
    if (coset.some((k) => k < 0)) throw new Error('orbitOf: a product of the exact group is not in it');
    for (const k of coset) done.add(k);
    // A unit vector to rounding: the exact group is orthogonal to about 10⁻¹².
    const image = apply(op.cartesian, site.direction);
    const n = Math.hypot(image[0], image[1], image[2]);
    poles.push({ direction: [image[0] / n, image[1] / n, image[2] / n], operations: coset });
  });
  return poles;
}
