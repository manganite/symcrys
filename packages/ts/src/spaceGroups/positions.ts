/**
 * Points of a plane group: their orbit, site symmetry and Wyckoff position (CLAUDE.md, "Plane
 * groups (and later space groups)"). Points come from callers as floating-point coordinates in the
 * lattice basis; whether an operation fixes a point is decided within a tolerance, as for the
 * point groups (`siteSymmetryOf`). Internal for now.
 */

import { compose, equalModLattice, parseOperation, toPlain, type PlainOperation } from './affine.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import { toleranceOf, type ToleranceOptions } from '../tolerances.js';

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
    data = { ops: exact.map(toPlain), table };
    groupCache.set(k, data);
  }
  return data;
}

const plainOperations = (key: string): readonly PlainOperation[] => groupData(key).ops;

/**
 * The orbit of a point under a plane group: the images of the point set onto its site symmetry
 * (`planeSiteSymmetry`), each in [0, 1), in the order of the operations that first produce them,
 * with the operations that map the point there: one entry per coset of the site symmetry.
 */
export function planeOrbit(
  key: string,
  point: readonly number[],
  options?: ToleranceOptions,
): { point: number[]; operations: number[] }[] {
  // The point is first set onto its site symmetry, as planeSiteSymmetry does, so that the images of
  // one coset coincide exactly: merging images within the tolerance pairwise is not transitive, and
  // near an element it could put operations together that form no coset (review of #153).
  const site = planeSiteSymmetry(key, point, options);
  const out: { point: number[]; operations: number[] }[] = [];
  plainOperations(key).forEach((op, i) => {
    const q = image(op, site.point).map(mod1);
    const entry = out.find((r) => sameModLattice(r.point, q, 1e-9));
    if (entry) entry.operations.push(i);
    else out.push({ point: q, operations: [i] });
  });
  return out;
}

/** Indices of `set` closed under products, modulo the lattice, within the operations of the group. */
function closeWithin(key: string, set: readonly number[]): number[] {
  const { table } = groupData(key);
  const out = [...new Set(set)];
  const member = new Set(out);
  // Every product of two members is a member once each new member has been combined with all others.
  for (let i = 0; i < out.length; i++) {
    for (let j = 0; j <= i; j++) {
      for (const k of [table[out[i]][out[j]], table[out[j]][out[i]]]) {
        if (!member.has(k)) {
          member.add(k);
          out.push(k);
        }
      }
    }
  }
  return out.sort((a, b) => a - b);
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
  let set = closeWithin(key, fixingAt(p));
  for (let pass = 0; pass < 8; pass++) {
    const fixing = fixingOperations(ops, set, p);
    const mean = [0, 1].map((k) => fixing.reduce((s, op) => s + image(op, p)[k], 0) / fixing.length);
    const next = closeWithin(key, fixingAt(mean));
    const settled = fixing.every((op) => sameModLattice(image(op, mean), mean, 1e-9));
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
    `No common fixed point for the operations fixing ${JSON.stringify(point)} within ${tol} (tolerance too large?)`,
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

/**
 * True if some parameters x, y make the printed coordinate expression (e.g. `x,2x`, `-x+1/2,y`) give
 * the point modulo the lattice within `tol`: least squares over the nearby lattice translations.
 */
function onExpression(expression: string, p: readonly number[], tol: number): boolean {
  const { matrix, translation } = parsed(expression);
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
  options?: ToleranceOptions,
): PlaneWyckoffPosition {
  const tol = tolerance(options);
  const site = planeSiteSymmetry(key, point, options);
  const entry = planeGroupEntry(key);
  const centrings = [[0, 0], ...entry.centring.map((t) => parsed(t).translation)];
  for (const [multiplicity, letter, siteSymmetry, coordinates] of entry.wyckoff) {
    if (multiplicity !== site.multiplicity) continue;
    for (const t of centrings) {
      const shifted = [site.point[0] - t[0], site.point[1] - t[1]];
      if (coordinates.some((expression) => onExpression(expression, shifted, tol))) {
        return { letter, multiplicity, siteSymmetry };
      }
    }
  }
  throw new RangeError(`No Wyckoff position of ${entry.symbol} holds the point ${JSON.stringify(point)}`);
}
