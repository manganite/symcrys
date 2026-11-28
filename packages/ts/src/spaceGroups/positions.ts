/**
 * Points of a plane group: their orbit, site symmetry and Wyckoff position (docs/conventions.md,
 * "Plane groups"). Points come from callers as floating-point coordinates in the
 * lattice basis; whether an operation fixes a point is decided within a tolerance, as for the
 * point groups (`siteSymmetryOf`). Internal for now.
 */

import { planeWyckoffRows } from './planeWyckoff.js';
import { deepFreeze } from '../freeze.js';
import { shown, everyEntry } from '../checks.js';
import {
  compose,
  equalModLattice,
  formatOperation,
  parseOperation,
  reduceModLattice,
  toPlain,
  type ExactOperation,
  type PlainOperation,
} from './affine.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import { ROUNDING_EPSILON, SINGULAR_RATIO, toleranceOf, type ToleranceOptions } from '../tolerances.js';

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
   * The point set onto the element of its site symmetry, in [0, 1), which removes the deviation
   * within the tolerance.
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

/**
 * The largest coordinate of a point of the plane: beyond about 2⁵² a double has no fractional part,
 * so the position of a point in its cell is lost long before; 10⁶ cells keep about 10 decimals of it.
 */
export const MAX_COORDINATE = 1e6;

/** Checks a point of the plane: two finite coordinates of at most `MAX_COORDINATE` in magnitude. */
export function checkPlanePoint(point: readonly number[]): void {
  if (
    !Array.isArray(point) ||
    point.length !== 2 ||
    !everyEntry(point, (x) => typeof x === 'number' && Number.isFinite(x))
  ) {
    throw new RangeError(`A point of the plane has two finite coordinates, not ${shown(point)}`);
  }
  if (point.some((x) => Math.abs(x) > MAX_COORDINATE)) {
    throw new RangeError(
      `A point of the plane has coordinates of at most ${MAX_COORDINATE} in magnitude, not ${shown(point)}: reduce it modulo the lattice first`,
    );
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
 * A plane group as a list of operations, one per coset of the lattice translations: the operations
 * as plain numbers and the group table modulo the lattice (`table[a][b]` is the index of the
 * operation that equals a∘b modulo the lattice), so that closing a set of operations works on
 * indices. Computed once per plane group, or per call for a list of a caller (`listGroupData`).
 */
export interface GroupData {
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
 * The group data of a list of operations of a caller (exact, in the lattice basis), checked to be a
 * group modulo the lattice: one operation per coset of the lattice translations, closed under
 * products. Throws a RangeError naming two operations equal modulo the lattice, or a product
 * missing from the list. An empty list is the group 1.
 */
export function listGroupData(operations: readonly ExactOperation[]): GroupData {
  if (operations.length === 0) {
    const one = parseOperation('x,y');
    return { ops: [toPlain(one)], table: [[0]] };
  }
  operations.forEach((a, i) => {
    const j = operations.findIndex((b) => equalModLattice(a, b));
    if (j < i) {
      throw new RangeError(
        `The operations ${j} and ${i} (${formatOperation(a)}) are equal modulo the lattice: give one operation per coset of the lattice translations`,
      );
    }
  });
  const table = operations.map((a, i) =>
    operations.map((b, j) => {
      const product = compose(a, b);
      const k = operations.findIndex((op) => equalModLattice(op, product));
      if (k < 0) {
        throw new RangeError(
          `The operations are not a group: the product of operations ${i} and ${j}, ${formatOperation(reduceModLattice(product))}, is not among them modulo the lattice (give all operations, not only generators)`,
        );
      }
      return k;
    }),
  );
  return { ops: operations.map(toPlain), table };
}

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
  // The point is first set onto its Wyckoff position, and the entries are the left cosets
  // g·H of its site symmetry H: merging images by a distance is not transitive and depends on a
  // threshold.
  return orbitIn(groupData(key), planeSiteOfPosition(key, point, options));
}

/**
 * The orbit of a point under a group (`GroupData`) given its site symmetry: one entry per left coset
 * g·H of the site symmetry H, in the order of the operations, with the image of the point set on
 * the site in [0, 1).
 */
export function orbitIn(
  data: GroupData,
  site: { readonly operations: readonly number[]; readonly point: readonly number[] },
): { point: number[]; operations: number[] }[] {
  const { ops, table } = data;
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

/** The operations of `indices`, each shifted by the lattice translation that brings its image of `p` nearest to `p`. */
function fixingOperations(ops: readonly PlainOperation[], indices: readonly number[], p: readonly number[]) {
  return indices.map((i) => {
    const op = ops[i];
    const n = image(op, p).map((v, k) => Math.round(v - p[k]));
    return { matrix: op.matrix.map((r) => [...r]), translation: op.translation.map((t, k) => t - n[k]) };
  });
}

/** The site symmetry of a point under a plane group, by the distance to the element (`siteSymmetryIn`). */
export function planeSiteSymmetry(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneSiteSymmetry {
  return siteSymmetryIn(groupData(key), point, options);
}

/**
 * `planeSiteSymmetry` under any group (`GroupData`): a plane group, or a list of a caller. The tolerance
 * measures the distance to the symmetry element, per coordinate modulo the lattice, as the Wyckoff
 * position of a key does: the site symmetry is that of the most special element (a rotation point or
 * a mirror line, the fixed set of an operation) within the tolerance of the point, of elements fixed
 * by equally many operations the nearest, and the point is set onto it.
 */
export function siteSymmetryIn(
  data: GroupData,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneSiteSymmetry {
  checkPlanePoint(point);
  const tol = tolerance(options);
  const ops = data.ops;
  const p = point.map(mod1);
  // Each candidate: the nearest translate of the fixed set of one operation, as a point and the
  // direction of a line (none for a point; the whole plane for the identity).
  let best: { indices: number[]; distance: number; on: number[] } | undefined;
  const consider = (on: number[], line: number[] | undefined, distance: number): void => {
    if (!(distance < tol)) return;
    // The operations that fix the element pointwise: the point, and for a line a second point of it.
    const points = line ? [on, [on[0] + line[0], on[1] + line[1]]] : [on];
    const indices = ops.flatMap((op, i) =>
      points.every((x) => sameModLattice(image(op, x), x, ROUNDING_EPSILON)) ? [i] : [],
    );
    if (
      !best ||
      indices.length > best.indices.length ||
      (indices.length === best.indices.length && distance < best.distance)
    ) {
      best = { indices, distance, on };
    }
  };
  /** The distance per coordinate of two points modulo the lattice. */
  const apart = (x: readonly number[], y: readonly number[]): number =>
    Math.max(...x.map((v, k) => Math.abs(v - y[k] - Math.round(v - y[k]))));
  for (const op of ops) {
    const [[a, b], [c, d]] = op.matrix;
    // The translation modulo the lattice, so that the windows below find the nearest elements also for
    // a translation given with whole cells added.
    const w = op.translation.map((x) => x - Math.floor(x));
    const det = a * d - b * c;
    if (a === 1 && b === 0 && c === 0 && d === 1) {
      // The identity fixes the plane; a translation, nothing.
      if (w.every((v) => Math.abs(v - Math.round(v)) < ROUNDING_EPSILON)) consider([...p], undefined, 0);
    } else if (det === 1) {
      // A rotation: the fixed points x = (I − W)⁻¹(w + t), t integer; the nearest to p is reached
      // from t near (I − W)p − w.
      const m = [
        [1 - a, -b],
        [-c, 1 - d],
      ];
      const dm = m[0][0] * m[1][1] - m[0][1] * m[1][0];
      const t0 = [0, 1].map((k) => Math.round(m[k][0] * p[0] + m[k][1] * p[1] - w[k]));
      for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
          const rhs = [w[0] + t0[0] + i, w[1] + t0[1] + j];
          const x = [(m[1][1] * rhs[0] - m[0][1] * rhs[1]) / dm, (-m[1][0] * rhs[0] + m[0][0] * rhs[1]) / dm];
          const nearest = x.map((v, k) => p[k] + (v - p[k] - Math.round(v - p[k])));
          consider(nearest, undefined, apart(p, x));
        }
    } else {
      // A reflection: (I − W)/2 = P is idempotent; (I − W)x = w + t has a solution exactly when
      // P(w + t) = w + t, then x₀ = (w + t)/2 and the line x₀ + s·v with v along (I + W). A glide
      // reflection has no such t.
      const P = [
        [(1 - a) / 2, -b / 2],
        [-c / 2, (1 - d) / 2],
      ];
      const v = [1 + a, c].some((x) => x !== 0) ? [1 + a, c] : [b, 1 + d];
      for (let i = -2; i <= 2; i++)
        for (let j = -2; j <= 2; j++) {
          const rhs = [w[0] + i, w[1] + j];
          const Prhs = [P[0][0] * rhs[0] + P[0][1] * rhs[1], P[1][0] * rhs[0] + P[1][1] * rhs[1]];
          if (Math.abs(Prhs[0] - rhs[0]) > ROUNDING_EPSILON || Math.abs(Prhs[1] - rhs[1]) > ROUNDING_EPSILON) continue;
          const x0 = [rhs[0] / 2, rhs[1] / 2];
          for (let k = -1; k <= 1; k++)
            for (let l = -1; l <= 1; l++) {
              const base = [x0[0] + Math.round(p[0] - x0[0]) + k, x0[1] + Math.round(p[1] - x0[1]) + l];
              const { t, d: distance } = nearestOnLine([p[0] - base[0], p[1] - base[1]], v, undefined);
              consider([base[0] + t * v[0], base[1] + t * v[1]], v, distance);
            }
        }
    }
  }
  // The identity is in every group, at distance 0.
  const { indices, on } = best!;
  const q = on.map(mod1);
  return {
    operations: indices,
    fixing: fixingOperations(ops, indices, q),
    point: q,
    multiplicity: ops.length / indices.length,
  };
}

/**
 * Per Wyckoff position of a plane group, in the order of `planeWyckoffRows`: the indices into the
 * operations of the group of those that fix its first coordinate doublet for every value of its
 * parameters, modulo the lattice (W·p(x, y) + w ≡ p(x, y), exactly), ascending.
 */
export function planeWyckoffSiteOperations(key: string): readonly (readonly number[])[] {
  const k = planeGroupEntry(key).symbol;
  let rows = siteOperationsCache.get(k);
  if (!rows) {
    const ops = planeGroupOperations(k);
    rows = deepFreeze(
      planeWyckoffRows(k).map(([, , , coordinates]) => {
        const position = parseOperation(coordinates[0]);
        return ops.flatMap((op, i) => (equalModLattice(compose(op, position), position) ? [i] : []));
      }),
    );
    siteOperationsCache.set(k, rows);
  }
  return rows;
}
const siteOperationsCache = new Map<string, readonly (readonly number[])[]>();

/** A coordinate expression of a Wyckoff position, parsed once. */
const expressionCache = new Map<string, PlainOperation>();
function parsed(expression: string): PlainOperation {
  let op = expressionCache.get(expression);
  if (!op) {
    op = toPlain(parseOperation(expression));
    expressionCache.set(expression, op);
  }
  return op;
}

/** The distance of a point to one Wyckoff position, and the nearest point of the position. */
export interface PositionDistance {
  /** The index of the position in ITA's order (`planeWyckoffRows`). */
  readonly row: number;
  /** The nearest point of the position's point set, in [0, 1). */
  readonly point: number[];
  /** The distance: per lattice coordinate without a basis, Euclidean with one. */
  readonly distance: number;
}

/** The free directions of a coordinate expression (the columns of W that are not zero, independent ones). */
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
    everyEntry(
      basis,
      (row) =>
        Array.isArray(row) && row.length === 2 && everyEntry(row, (x) => typeof x === 'number' && Number.isFinite(x)),
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
 * The distance of a point (lattice basis) to every Wyckoff position of a plane group, in
 * ITA's order, with the nearest point of each: the point set of a position is the union of its
 * coordinate expressions with every centring and lattice translation, a point, a line or
 * the plane. Without a metric the distance is the larger of the two coordinate differences, with
 * one (G = BᵀB) Euclidean.
 */
export function planeWyckoffDistances(key: string, given: readonly number[], g?: Mat2): PositionDistance[] {
  checkPlanePoint(given);
  // Modulo the lattice first, so that large coordinates keep their digits (review of step 10a).
  const point = given.map(mod1);
  const entry = planeGroupEntry(key);
  const centrings = [[0, 0], ...entry.centring.map((t) => parsed(t).translation)];
  return planeWyckoffRows(key).map(([, , , coordinates], row) => {
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
 * The Wyckoff position a point lies on within the tolerance: the most special
 * position (the smallest multiplicity) whose point set lies within the tolerance of the point,
 * measured per coordinate modulo the lattice, the nearest among positions of equal multiplicity;
 * the general position always holds the point. Returns the row and the nearest point on it.
 */
export function planePosition(key: string, point: readonly number[], options?: ToleranceOptions): PositionDistance {
  const tol = tolerance(options);
  const rows = planeWyckoffRows(key);
  const within = planeWyckoffDistances(key, point).filter((d) => d.distance < tol);
  within.sort((a, b) => rows[a.row][0] - rows[b.row][0] || a.distance - b.distance);
  return within[0];
}

/**
 * The site symmetry of a point under a plane group, as one notion with its Wyckoff position:
 * the point is set onto the position it lies on within the tolerance (`planePosition`),
 * and the site symmetry is that of the point there.
 */
export function planeSiteOfPosition(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): PlaneSiteSymmetry {
  const { row, point: onPosition } = planePosition(key, point, options);
  const multiplicity = planeWyckoffRows(key)[row][0];
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
  const [multiplicity, letter, siteSymmetry] = planeWyckoffRows(key)[row];
  return { letter, multiplicity, siteSymmetry };
}
