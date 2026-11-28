/**
 * Points of a plane group: their orbit, site symmetry and Wyckoff position (docs/conventions.md,
 * "Plane groups"). Points come from callers as floating-point coordinates in the
 * lattice basis; whether an operation fixes a point is decided within a tolerance, as for the
 * point groups (`siteSymmetryOf`). Internal for now.
 */

import { planeWyckoffRows } from './planeWyckoff.js';
import { deepFreeze } from '../freeze.js';
import { shown, everyEntry } from '../checks.js';
import { gcd } from '../integers.js';
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
import { dot2 } from './planeLattice.js';
import { ROUNDING_EPSILON, toleranceOf, type ToleranceOptions } from '../tolerances.js';

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

type Mat2 = readonly (readonly number[])[];

/** The relative slack of the condition |a·b| ≤ a·a/2 of a reduced basis, for rounding. */
const REDUCED_SLACK = 1e-9;

/** A vector of lattice coordinates in Cartesian coordinates: B·r (B with the columns a, b). */
const cartesian = (b: Mat2, r: readonly number[]): number[] => [
  b[0][0] * r[0] + b[0][1] * r[1],
  b[1][0] * r[0] + b[1][1] * r[1],
];

/** The length of a vector of lattice coordinates: per coordinate (the larger component), or Euclidean in the basis B. */
function norm(r: readonly number[], b: Mat2 | undefined): number {
  if (!b) return Math.max(Math.abs(r[0]), Math.abs(r[1]));
  const x = cartesian(b, r);
  return Math.hypot(x[0], x[1]);
}

/**
 * The smallest distance of r to a multiple of v, and the multiple: Euclidean in the basis B (by
 * projection) or per coordinate (the largest of the two components; the minimum over t of
 * max(|r₁ − t v₁|, |r₂ − t v₂|) lies where a component vanishes or the two are equal).
 */
function nearestOnLine(r: readonly number[], v: readonly number[], b: Mat2 | undefined): { t: number; d: number } {
  if (b) {
    const x = cartesian(b, r);
    const y = cartesian(b, v);
    const t = dot2(x, y) / dot2(y, y);
    return { t, d: Math.hypot(x[0] - t * y[0], x[1] - t * y[1]) };
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

/** A reduced basis of a lattice: the integer columns u (lattice coordinates) and the Cartesian columns a, b they give. */
export interface ReducedBasis {
  readonly u: readonly (readonly number[])[];
  readonly a: readonly number[];
  readonly b: readonly number[];
}

/**
 * A reduced basis of the lattice of the basis B (columns a, b), by Lagrange and Gauss: |a′·b′| ≤
 * a′·a′/2 and a′·a′ ≤ b′·b′. Each step subtracts the nearest multiple of the shorter Cartesian
 * vector from the longer, as Euclid's algorithm does, so the number of steps grows with the
 * logarithm of the shear; the Cartesian vectors are reduced themselves, not through their metric,
 * which would lose the short ones to rounding. In a reduced basis both triangles of the cell are
 * non-obtuse, so the lattice vector nearest to a vector is a corner of the cell that holds it,
 * within ±1 of its rounded coordinates.
 */
export function reducedBasis(basis: Mat2): ReducedBasis {
  let a = [basis[0][0], basis[1][0]];
  let b = [basis[0][1], basis[1][1]];
  let ua = [1, 0];
  let ub = [0, 1];
  for (let step = 0; step < 200; step++) {
    if (dot2(a, a) > dot2(b, b)) [a, b, ua, ub] = [b, a, ub, ua];
    const mu = dot2(a, b) / dot2(a, a);
    // Reduced up to rounding: a hexagonal cell has |a·b| = a·a/2 exactly, where rounding the ratio
    // either way would step back and forth between two reduced bases.
    if (Math.abs(mu) <= 0.5 * (1 + REDUCED_SLACK)) return { u: [ua, ub], a, b };
    const m = Math.round(mu);
    b = [b[0] - m * a[0], b[1] - m * a[1]];
    ub = [ub[0] - m * ua[0], ub[1] - m * ua[1]];
  }
  throw new Error(`reducedBasis: no reduced basis of ${shown(basis)} after 200 steps`);
}

/** An integer vector w with det[v w] = 1, for a primitive integer vector v (extended Euclid). */
function complement(v: readonly number[]): number[] {
  // x·v₀ + y·v₁ = 1, then w = (−y, x).
  let [r0, r1, x0, x1, y0, y1] = [v[0], v[1], 1, 0, 0, 1];
  while (r1 !== 0) {
    const q = Math.floor(r0 / r1);
    [r0, r1, x0, x1, y0, y1] = [r1, r0 - q * r1, x1, x0 - q * x1, y1, y0 - q * y1];
  }
  // r0 = ±1 for a primitive v.
  return [-y0 * r0, x0 * r0];
}

/**
 * The distance of a point (lattice basis) to every Wyckoff position of a plane group, in
 * ITA's order, with the nearest point of each: the point set of a position is the union of its
 * coordinate expressions with every centring and lattice translation, a point, a line or
 * the plane. Without a basis the distance is the larger of the two coordinate differences, with
 * one (the Cartesian columns a, b) Euclidean. A point position is sought within ±1 of the rounded
 * coordinates in a reduced basis; the lines along a primitive direction v are the family
 * c + k·w + ℝv (w with det[v w] = 1), and the nearest is k = round(s) for the w-coordinate s of the
 * point, in any basis.
 */
export function planeWyckoffDistances(key: string, given: readonly number[], basis?: Mat2): PositionDistance[] {
  checkPlanePoint(given);
  const reduced = basis ? reducedBasis(basis) : undefined;
  // Modulo the lattice first, so that large coordinates keep their digits (review of step 10a).
  const point = given.map(mod1);
  const entry = planeGroupEntry(key);
  const centrings = [[0, 0], ...entry.centring.map((t) => parsed(t).translation)];
  return planeWyckoffRows(key).map(([, , , coordinates], row) => {
    let best = { point: [...point], distance: Infinity };
    const consider = (origin: readonly number[], v: readonly number[] | undefined) => {
      const r = [point[0] - origin[0], point[1] - origin[1]];
      const { t, d } = v ? nearestOnLine(r, v, basis) : { t: 0, d: norm(r, basis) };
      if (d < best.distance) {
        best = { point: v ? [origin[0] + t * v[0], origin[1] + t * v[1]] : [...origin], distance: d };
      }
    };
    for (const expression of coordinates) {
      const op = parsed(expression);
      const free = freeDirections(op);
      for (const shift of centrings) {
        const c = [op.translation[0] + shift[0], op.translation[1] + shift[1]];
        if (free.length === 2) {
          best = { point: [...point], distance: 0 };
          continue;
        }
        if (free.length === 1) {
          // The family of lines c + k·w + ℝv: every lattice translate lies on one of them.
          const g = gcd(free[0][0], free[0][1]);
          const v = [free[0][0] / g, free[0][1] / g];
          const w = complement(v);
          const q = [point[0] - c[0], point[1] - c[1]];
          const k0 = Math.round(v[0] * q[1] - v[1] * q[0]);
          for (let k = k0 - 1; k <= k0 + 1; k++) consider([c[0] + k * w[0], c[1] + k * w[1]], v);
          continue;
        }
        const base = [Math.round(point[0] - c[0]), Math.round(point[1] - c[1])];
        if (!reduced) {
          for (let i = -1; i <= 1; i++)
            for (let j = -1; j <= 1; j++) consider([c[0] + base[0] + i, c[1] + base[1] + j], undefined);
          continue;
        }
        // The point in the reduced basis: R = B·q = x·a′ + y·b′; the translates within ±1 of (x, y).
        const { u, a, b } = reduced;
        const R = cartesian(basis!, [point[0] - c[0] - base[0], point[1] - c[1] - base[1]]);
        const det = a[0] * b[1] - a[1] * b[0];
        const m0 = [Math.round((R[0] * b[1] - R[1] * b[0]) / det), Math.round((a[0] * R[1] - a[1] * R[0]) / det)];
        for (let i = -1; i <= 1; i++)
          for (let j = -1; j <= 1; j++) {
            const m = [m0[0] + i, m0[1] + j];
            // Measured in the reduced Cartesian vectors, not through B·(q − U·m), which would cancel.
            const d = Math.hypot(R[0] - m[0] * a[0] - m[1] * b[0], R[1] - m[0] * a[1] - m[1] * b[1]);
            if (d < best.distance) {
              best = {
                point: [
                  c[0] + base[0] + u[0][0] * m[0] + u[1][0] * m[1],
                  c[1] + base[1] + u[0][1] * m[0] + u[1][1] * m[1],
                ],
                distance: d,
              };
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
