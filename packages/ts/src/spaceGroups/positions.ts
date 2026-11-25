/**
 * Points of a plane group: their orbit, site symmetry and Wyckoff position (CLAUDE.md, "Plane
 * groups (and later space groups)"). Points come from callers as floating-point coordinates in the
 * lattice basis; whether an operation fixes a point is decided within a tolerance, as for the
 * point groups (`siteSymmetryOf`). Internal for now.
 */

import { deepFreeze } from '../freeze.js';
import { shown } from '../checks.js';
import { closeIndices } from '../closure.js';
import { compose, equalModLattice, parseOperation, toPlain, type PlainOperation } from './affine.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import { ROUNDING_EPSILON, SINGULAR_RATIO, SITE_PASSES, toleranceOf, type ToleranceOptions } from '../tolerances.js';

/** The site symmetry of a point under a plane group. */
export interface PlaneSiteSymmetry {
  /**
   * Indices into the operations of the group (`planeGroupOperations`) of those that map the point
   * to itself modulo the lattice, ascending.
   */
  readonly operations: readonly number[];
  /**
   * The operations of the site symmetry, each with the lattice translation that makes it fix the
   * point (not only modulo the lattice).
   */
  readonly fixing: readonly PlainOperation[];
  /**
   * The point set onto the fixed space of its site symmetry (the mean of its images under the
   * fixing operations), in [0, 1), which removes rounding errors within the tolerance.
   */
  readonly point: readonly number[];
  /** The number of points in the conventional cell equivalent to it. */
  readonly multiplicity: number;
}

/** The Wyckoff position of a point. */
export interface PlaneWyckoffPosition {
  /** The Wyckoff letter, as ITA prints it. */
  readonly letter: string;
  /** The multiplicity, as ITA prints it. */
  readonly multiplicity: number;
  /** The oriented site-symmetry symbol, as ITA prints it. */
  readonly siteSymmetry: string;
}

function tolerance(options?: ToleranceOptions): number {
  // Modulo the lattice two coordinates differ by at most 1/2, so a tolerance of 1/2 or more says nothing.
  return toleranceOf(options, 'points');
}

function checkPoint(point: readonly number[]): void {
  if (!Array.isArray(point) || point.length !== 2 || !point.every((x) => typeof x === 'number' && Number.isFinite(x))) {
    throw new RangeError(`A point of the plane has two finite coordinates, not ${shown(point)}`);
  }
}

const mod1 = (v: number): number => {
  const r = v - Math.floor(v);
  return r >= 1 ? 0 : r + 0;
};

function image(op: PlainOperation, p: readonly number[]): number[] {
  return op.matrix.map((row, i) => row[0] * p[0] + row[1] * p[1] + op.translation[i]);
}

/** True if the two points agree modulo the lattice within `tol` in each coordinate. */
function sameModLattice(p: readonly number[], q: readonly number[], tol: number): boolean {
  return p.every((v, i) => {
    const d = v - q[i];
    return Math.abs(d - Math.round(d)) < tol;
  });
}

/**
 * Per plane group, computed once: its operations as plain numbers and its group table modulo the
 * lattice (`table[a][b]` is the index of the operation that equals a∘b modulo the lattice), so that
 * closing a set of operations works on indices (#86).
 */
interface GroupData {
  readonly ops: readonly PlainOperation[];
  readonly table: readonly (readonly number[])[];
}

const groupCache = new Map<string, GroupData>();
function groupData(key: string): GroupData {
  const k = planeGroupEntry(key).symbol;
  let data = groupCache.get(k);
  if (!data) {
    const exact = planeGroupOperations(k);
    const table = exact.map((a) =>
      exact.map((b) => {
        const product = compose(a, b);
        const i = exact.findIndex((op) => equalModLattice(op, product));
        if (i < 0) throw new Error(`The operations of ${k} are not closed modulo the lattice`);
        return i;
      }),
    );
    data = deepFreeze({ ops: exact.map(toPlain), table });
    groupCache.set(k, data);
  }
  return data;
}

const plainOperations = (key: string): readonly PlainOperation[] => groupData(key).ops;

/**
 * The orbit of a point under a plane group: the images of the point set onto its Wyckoff position
 * (`planeSiteOfPosition`), each in [0, 1), in the order of the operations that first produce them,
 * with the operations that map the point there: one entry per coset of the site symmetry.
 */
export function planeOrbit(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): { point: number[]; operations: number[] }[] {
  // The point is first set onto its Wyckoff position (#137 F1), and the entries are the left cosets
  // g·H of its site symmetry H: merging images by a distance is not transitive and depends on a
  // threshold (reviews of #153 and of step 10a).
  const site = planeSiteOfPosition(key, point, options);
  const { ops, table } = groupData(key);
  const done = new Set<number>();
  const out: { point: number[]; operations: number[] }[] = [];
  ops.forEach((op, i) => {
    if (done.has(i)) return;
    const coset = [...new Set(site.operations.map((h) => table[i][h]))].sort((a, b) => a - b);
    for (const j of coset) done.add(j);
    out.push({ point: image(op, site.point).map(mod1), operations: coset });
  });
  return out;
}

/** Indices of `set` closed under products, modulo the lattice, within the operations of the group. */
function closeSet(key: string, set: readonly number[]): number[] {
  const { table } = groupData(key);
  return closeIndices((i, j) => table[i][j], set);
}

/** The operations of `indices`, each shifted by the lattice translation that brings its image of `p` nearest to `p`. */
function fixingOperations(ops: readonly PlainOperation[], indices: readonly number[], p: readonly number[]) {
  return indices.map((i) => {
    const op = ops[i];
    const n = image(op, p).map((v, k) => Math.round(v - p[k]));
    return { matrix: op.matrix.map((r) => [...r]), translation: op.translation.map((t, k) => t - n[k]) };
  });
}

/**
 * The site symmetry of a point under a plane group. The operations that fix the point modulo the
 * lattice within the tolerance are closed under products and the point is set onto the fixed space
 * of the closure (the mean of its images), repeated until stable, as `siteSymmetryOf` does for the point
 * groups; so the result is always a subgroup and the set point lies exactly on its elements. Throws a
 * RangeError if that does not settle (a tolerance far too large).
 */
export function planeSiteSymmetry(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneSiteSymmetry {
  checkPoint(point);
  const tol = tolerance(options);
  const ops = plainOperations(key);
  const fixingAt = (p: readonly number[]): number[] =>
    ops.flatMap((op, i) => (sameModLattice(image(op, p), p, tol) ? [i] : []));
  let p: readonly number[] = point;
  let set = closeSet(key, fixingAt(p));
  for (let pass = 0; pass < SITE_PASSES; pass++) {
    const fixing = fixingOperations(ops, set, p);
    const mean = [0, 1].map((k) => fixing.reduce((s, op) => s + image(op, p)[k], 0) / fixing.length);
    const next = closeSet(key, fixingAt(mean));
    const settled = fixing.every((op) => sameModLattice(image(op, mean), mean, ROUNDING_EPSILON));
    if (settled && next.length === set.length && next.every((x, i) => x === set[i])) {
      const q = mean.map(mod1);
      return {
        operations: set,
        fixing: fixingOperations(ops, set, q),
        point: q,
        multiplicity: ops.length / set.length,
      };
    }
    p = mean;
    set = next;
  }
  throw new RangeError(
    `No common fixed point for the operations fixing ${shown(point)} within ${tol} (tolerance too large?)`,
  );
}

/** A printed coordinate expression, parsed once. */
const expressionCache = new Map<string, PlainOperation>();
function parsed(expression: string): PlainOperation {
  let op = expressionCache.get(expression);
  if (!op) {
    op = toPlain(parseOperation(expression));
    expressionCache.set(expression, op);
  }
  return op;
}

/** The distance of a point to one printed Wyckoff position, and the nearest point of the position. */
export interface PositionDistance {
  /** The index of the position in the printed order (`entry.wyckoff`). */
  readonly row: number;
  /** The nearest point of the position's point set, in [0, 1). */
  readonly point: number[];
  /** The distance: per lattice coordinate without a basis, Euclidean with one. */
  readonly distance: number;
}

/** The free directions of a printed coordinate expression (the columns of W that are not zero, independent ones). */
function freeDirections(op: PlainOperation): number[][] {
  const cols = [0, 1].map((k) => [op.matrix[0][k], op.matrix[1][k]]).filter((v) => v[0] !== 0 || v[1] !== 0);
  if (cols.length === 2 && Math.abs(cols[0][0] * cols[1][1] - cols[0][1] * cols[1][0]) === 0) return [cols[0]];
  return cols;
}

/**
 * The smallest distance of r to a multiple of v, and the multiple: in the metric G (Euclidean with
 * a basis, by projection) or per coordinate (the largest of the two components; the minimum over t
 * of max(|r₁ − t v₁|, |r₂ − t v₂|) lies where a component vanishes or the two are equal).
 */
function nearestOnLine(r: readonly number[], v: readonly number[], g: Mat2 | undefined): { t: number; d: number } {
  if (g) {
    const gv = [g[0][0] * v[0] + g[0][1] * v[1], g[1][0] * v[0] + g[1][1] * v[1]];
    const t = (r[0] * gv[0] + r[1] * gv[1]) / (v[0] * gv[0] + v[1] * gv[1]);
    return { t, d: norm([r[0] - t * v[0], r[1] - t * v[1]], g) };
  }
  const candidates: number[] = [];
  if (v[0] !== 0) candidates.push(r[0] / v[0]);
  if (v[1] !== 0) candidates.push(r[1] / v[1]);
  if (v[0] !== v[1]) candidates.push((r[0] - r[1]) / (v[0] - v[1]));
  if (v[0] !== -v[1]) candidates.push((r[0] + r[1]) / (v[0] + v[1]));
  let best = { t: 0, d: Infinity };
  for (const t of candidates) {
    const d = norm([r[0] - t * v[0], r[1] - t * v[1]], undefined);
    if (d < best.d) best = { t, d };
  }
  return best;
}

type Mat2 = readonly (readonly number[])[];

/** The length of a vector of lattice coordinates: per coordinate (the larger component) or in the metric G. */
function norm(r: readonly number[], g: Mat2 | undefined): number {
  if (!g) return Math.max(Math.abs(r[0]), Math.abs(r[1]));
  return Math.sqrt(Math.max(0, r[0] * (g[0][0] * r[0] + g[0][1] * r[1]) + r[1] * (g[1][0] * r[0] + g[1][1] * r[1])));
}

/** The metric tensor G = BᵀB of a basis (columns a, b), checked: two rows of two finite numbers, not singular. */
export function planeMetric(basis: unknown): Mat2 {
  const ok =
    Array.isArray(basis) &&
    basis.length === 2 &&
    basis.every(
      (row) => Array.isArray(row) && row.length === 2 && row.every((x) => typeof x === 'number' && Number.isFinite(x)),
    );
  const b = basis as Mat2;
  // Singular if V/(ab) is below 10⁻⁹, computed with the columns scaled to unit length so that no
  // product overflows or underflows (review of step 10a).
  const na = ok ? Math.hypot(b[0][0], b[1][0]) : 0;
  const nb = ok ? Math.hypot(b[0][1], b[1][1]) : 0;
  const ratio = na > 0 && nb > 0 ? (b[0][0] / na) * (b[1][1] / nb) - (b[0][1] / nb) * (b[1][0] / na) : 0;
  if (!ok || !(Math.abs(ratio) > SINGULAR_RATIO)) {
    throw new RangeError(
      `The basis of a plane lattice is a non-singular 2 × 2 matrix (columns a, b), not ${shown(basis)}`,
    );
  }
  const col = (k: number) => [b[0][k], b[1][k]];
  const dot = (u: number[], w: number[]) => u[0] * w[0] + u[1] * w[1];
  return [
    [dot(col(0), col(0)), dot(col(0), col(1))],
    [dot(col(1), col(0)), dot(col(1), col(1))],
  ];
}

/**
 * The distance of a point (lattice basis) to every printed Wyckoff position of a plane group, in
 * printed order, with the nearest point of each: the point set of a position is the union of its
 * printed coordinate expressions with every centring and lattice translation, a point, a line or
 * the plane. Without a metric the distance is the larger of the two coordinate differences, with
 * one (G = BᵀB) Euclidean.
 */
export function planeWyckoffDistances(key: string, given: readonly number[], g?: Mat2): PositionDistance[] {
  checkPoint(given);
  // Modulo the lattice first, so that large coordinates keep their digits (review of step 10a).
  const point = given.map(mod1);
  const entry = planeGroupEntry(key);
  const centrings = [[0, 0], ...entry.centring.map((t) => parsed(t).translation)];
  return entry.wyckoff.map(([, , , coordinates], row) => {
    let best = { point: [...point], distance: Infinity };
    for (const expression of coordinates) {
      const op = parsed(expression);
      const free = freeDirections(op);
      for (const shift of centrings) {
        const c = [op.translation[0] + shift[0], op.translation[1] + shift[1]];
        if (free.length === 2) {
          best = { point: [...point], distance: 0 };
          continue;
        }
        const base = [Math.round(point[0] - c[0]), Math.round(point[1] - c[1])];
        for (let i = -2; i <= 2; i++) {
          for (let j = -2; j <= 2; j++) {
            const origin = [c[0] + base[0] + i, c[1] + base[1] + j];
            const r = [point[0] - origin[0], point[1] - origin[1]];
            const { t, d } = free.length === 1 ? nearestOnLine(r, free[0], g) : { t: 0, d: norm(r, g) };
            if (d < best.distance) {
              const v = free.length === 1 ? free[0] : [0, 0];
              best = { point: [origin[0] + t * v[0], origin[1] + t * v[1]], distance: d };
            }
          }
        }
      }
    }
    return { row, point: best.point.map(mod1), distance: best.distance };
  });
}

/**
 * The Wyckoff position a point lies on within the tolerance (#137 F1): the most special printed
 * position (the smallest multiplicity) whose point set lies within the tolerance of the point,
 * measured per coordinate modulo the lattice, the nearest among positions of equal multiplicity;
 * the general position always holds the point. Returns the row and the nearest point on it.
 */
export function planePosition(key: string, point: readonly number[], options?: ToleranceOptions): PositionDistance {
  const tol = tolerance(options);
  const entry = planeGroupEntry(key);
  const within = planeWyckoffDistances(key, point).filter((d) => d.distance < tol);
  within.sort((a, b) => entry.wyckoff[a.row][0] - entry.wyckoff[b.row][0] || a.distance - b.distance);
  return within[0];
}

/**
 * The site symmetry of a point under a plane group, as one notion with its Wyckoff position
 * (#137 F1): the point is set onto the position it lies on within the tolerance (`planePosition`),
 * and the site symmetry is that of the point there.
 */
export function planeSiteOfPosition(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneSiteSymmetry {
  const { row, point: onPosition } = planePosition(key, point, options);
  const multiplicity = planeGroupEntry(key).wyckoff[row][0];
  // The site symmetry follows from the position, not from a second tolerance (review of step 10a):
  // the point lies on it, so its |G|/multiplicity operations are those whose images of the point
  // lie nearest to it (all of them at rounding distance).
  const ops = plainOperations(key);
  const order = ops.length / multiplicity;
  const offset = (op: PlainOperation) =>
    Math.max(
      ...image(op, onPosition).map((v, k) => {
        const d = v - onPosition[k];
        return Math.abs(d - Math.round(d));
      }),
    );
  const indices = ops
    .map((op, i) => ({ i, d: offset(op) }))
    .sort((a, b) => a.d - b.d || a.i - b.i)
    .slice(0, order)
    .map((e) => e.i)
    .sort((a, b) => a - b);
  const { table } = groupData(key);
  if (!indices.every((a) => indices.every((b) => indices.includes(table[a][b])))) {
    throw new Error(`${key}: the operations nearest to fixing ${shown(onPosition)} on position ${row} form no group`);
  }
  return { operations: indices, fixing: fixingOperations(ops, indices, onPosition), point: onPosition, multiplicity };
}

/**
 * The Wyckoff position of a point under a plane group, as ITA prints it: the position it lies on
 * within the tolerance (`planePosition`).
 */
export function planeWyckoffPositionOf(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneWyckoffPosition {
  const { row } = planePosition(key, point, options);
  const [multiplicity, letter, siteSymmetry] = planeGroupEntry(key).wyckoff[row];
  return { letter, multiplicity, siteSymmetry };
}
