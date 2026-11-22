/**
 * Points of a plane group: their orbit, site symmetry and Wyckoff position (CLAUDE.md, "Plane
 * groups (and later space groups)"). Points come from callers as floating-point coordinates in the
 * lattice basis; whether an operation fixes a point is decided within a tolerance, as for the
 * point groups (`siteSymmetry`). Internal for now.
 */

import { parseOperation, toPlain, type PlainOperation } from './affine.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import { EPSILON } from '../tolerances.js';

/** Options of the functions that take a point. */
export interface PointOptions {
  /**
   * Two points count as the same, modulo the lattice, if each coordinate differs by less than this
   * from an integer (coordinates in the lattice basis). Default 10⁻⁶.
   */
  readonly tolerance?: number;
}

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

function tolerance(options?: PointOptions): number {
  const t = options?.tolerance ?? EPSILON;
  if (!(t > 0)) throw new RangeError(`The tolerance must be positive, not ${String(t)}`);
  return t;
}

function checkPoint(point: readonly number[]): void {
  if (point.length !== 2 || !point.every(Number.isFinite)) {
    throw new RangeError(`A point of the plane has two finite coordinates, not ${JSON.stringify(point)}`);
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

const plainCache = new Map<string, PlainOperation[]>();
function plainOperations(key: string): PlainOperation[] {
  const k = planeGroupEntry(key).symbol;
  let ops = plainCache.get(k);
  if (!ops) {
    ops = planeGroupOperations(k).map(toPlain);
    plainCache.set(k, ops);
  }
  return ops;
}

/**
 * The orbit of a point under a plane group: its distinct images in the conventional cell, each in
 * [0, 1), in the order of the operations that first produce them. Coinciding images (within the
 * tolerance) are merged.
 */
export function planeOrbit(key: string, point: readonly number[], options?: PointOptions): number[][] {
  checkPoint(point);
  const tol = tolerance(options);
  const out: number[][] = [];
  for (const op of plainOperations(key)) {
    const q = image(op, point).map(mod1);
    if (!out.some((r) => sameModLattice(r, q, tol))) out.push(q);
  }
  return out;
}

/** The site symmetry of a point under a plane group. */
export function planeSiteSymmetry(key: string, point: readonly number[], options?: PointOptions): PlaneSiteSymmetry {
  checkPoint(point);
  const tol = tolerance(options);
  const ops = plainOperations(key);
  const indices: number[] = [];
  const fixing: PlainOperation[] = [];
  ops.forEach((op, i) => {
    const q = image(op, point);
    const n = q.map((v, k) => Math.round(v - point[k]));
    if (q.every((v, k) => Math.abs(v - point[k] - n[k]) < tol)) {
      indices.push(i);
      fixing.push({ matrix: op.matrix.map((r) => [...r]), translation: op.translation.map((t, k) => t - n[k]) });
    }
  });
  // The mean of the images under the fixing operations lies on their common fixed space.
  const mean = [0, 1].map((k) => fixing.reduce((s, op) => s + image(op, point)[k], 0) / fixing.length);
  return {
    operations: indices,
    fixing,
    point: mean.map(mod1),
    multiplicity: ops.length / indices.length,
  };
}

/**
 * True if some parameters x, y make the printed coordinate expression (e.g. `x,2x`, `-x+1/2,y`) give
 * the point modulo the lattice within `tol`: least squares over the nearby lattice translations.
 */
function onExpression(expression: string, p: readonly number[], tol: number): boolean {
  const { matrix, translation } = toPlain(parseOperation(expression));
  const c = translation;
  const ex = [matrix[0][0], matrix[1][0]];
  const ey = [matrix[0][1], matrix[1][1]];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const r = [p[0] - c[0] - i, p[1] - c[1] - j];
      // Solve min |a·ex + b·ey − r| over the columns that are not zero.
      const cols = [ex, ey].filter((v) => v[0] !== 0 || v[1] !== 0);
      let fit = [0, 0];
      if (cols.length === 1) {
        const v = cols[0];
        const t = (v[0] * r[0] + v[1] * r[1]) / (v[0] * v[0] + v[1] * v[1]);
        fit = [t * v[0], t * v[1]];
      } else if (cols.length === 2) {
        const det = ex[0] * ey[1] - ex[1] * ey[0];
        if (Math.abs(det) < 1e-12) {
          const v = ex;
          const t = (v[0] * r[0] + v[1] * r[1]) / (v[0] * v[0] + v[1] * v[1]);
          fit = [t * v[0], t * v[1]];
        } else {
          fit = r;
        }
      }
      if (Math.abs(fit[0] - r[0]) < tol && Math.abs(fit[1] - r[1]) < tol) return true;
    }
  }
  return false;
}

/**
 * The Wyckoff position of a point under a plane group, as ITA prints it: the point is first set
 * onto the fixed space of its site symmetry (`planeSiteSymmetry`), then found among the printed
 * coordinates of the positions with its multiplicity, the centring included.
 */
export function planeWyckoffPositionOf(
  key: string,
  point: readonly number[],
  options?: PointOptions,
): PlaneWyckoffPosition {
  const tol = tolerance(options);
  const site = planeSiteSymmetry(key, point, options);
  const entry = planeGroupEntry(key);
  const centrings = [[0, 0], ...entry.centring.map((t) => toPlain(parseOperation(t)).translation)];
  for (const [multiplicity, letter, siteSymmetry, coordinates] of entry.wyckoff) {
    if (multiplicity !== site.multiplicity) continue;
    for (const t of centrings) {
      const shifted = [site.point[0] - t[0], site.point[1] - t[1]];
      if (coordinates.some((expression) => onExpression(expression, shifted, tol))) {
        return { letter, multiplicity, siteSymmetry };
      }
    }
  }
  throw new Error(`No Wyckoff position of ${entry.symbol} holds the point ${JSON.stringify(point)}`);
}
