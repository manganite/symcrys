/**
 * Snapping a point of the plane onto the nearest Wyckoff position of a plane group, by the distance
 * of the point to the position (#85; CLAUDE.md, "Snapping onto a Wyckoff position"). Unlike the site
 * symmetry (`positions.ts`), which asks whether the images of a point lie within a tolerance of it,
 * this asks whether the point lies within the tolerance of the point set of a position. Internal.
 */

import { parseOperation, toPlain, type PlainOperation } from './affine.js';
import { planeGroupEntry } from './planeGroups.js';
import { EPSILON } from '../tolerances.js';

/** The point set of one printed coordinate expression, x ↦ M·(x, y) + c, with the columns of M that are not zero. */
interface Expression {
  readonly matrix: readonly (readonly number[])[];
  readonly translation: readonly number[];
  /** The number of free parameters: 0 for a point, 1 for a line, 2 for the general position. */
  readonly freedom: number;
}

const cache = new Map<string, readonly { row: number; expressions: Expression[] }[]>();

function expression(op: PlainOperation, shift: readonly number[]): Expression {
  const m = op.matrix;
  const columns = [0, 1].filter((k) => m[0][k] !== 0 || m[1][k] !== 0);
  const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  return {
    matrix: m,
    translation: [op.translation[0] + shift[0], op.translation[1] + shift[1]],
    freedom: columns.length === 2 && det === 0 ? 1 : columns.length,
  };
}

/** Per printed Wyckoff row (index into `wyckoff`), its coordinate expressions with every centring. */
function positionsOf(symbol: string) {
  let rows = cache.get(symbol);
  if (!rows) {
    const entry = planeGroupEntry(symbol);
    const shifts = [[0, 0], ...entry.centring.map((t) => toPlain(parseOperation(t)).translation)];
    rows = entry.wyckoff.map(([, , , coordinates], row) => ({
      row,
      expressions: coordinates.flatMap((c) => shifts.map((s) => expression(toPlain(parseOperation(c)), s))),
    }));
    cache.set(symbol, rows);
  }
  return rows;
}

/**
 * The nearest point of the set of `e` to `p` modulo the lattice: the parameters by least squares in
 * the lattice coordinates, over the lattice translations that can reach it. Returns the point and
 * its distance, the larger of the two coordinate differences.
 */
function nearest(e: Expression, p: readonly number[]): { point: number[]; distance: number } {
  if (e.freedom === 2) return { point: [...p], distance: 0 };
  const m = e.matrix;
  const c = e.translation;
  let best = { point: [0, 0], distance: Infinity };
  // c lies in [0, 2) (a printed coordinate in [0, 1) plus a centring), p in [0, 1).
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const v = [p[0] - c[0] - i, p[1] - c[1] - j];
      let r: number[];
      if (e.freedom === 0) {
        r = [0, 0];
      } else {
        const k = m[0][0] !== 0 || m[1][0] !== 0 ? 0 : 1;
        const col = [m[0][k], m[1][k]];
        const t = (col[0] * v[0] + col[1] * v[1]) / (col[0] * col[0] + col[1] * col[1]);
        r = [t * col[0], t * col[1]];
      }
      const distance = Math.max(Math.abs(r[0] - v[0]), Math.abs(r[1] - v[1]));
      if (distance < best.distance) best = { point: [r[0] + c[0] + i, r[1] + c[1] + j], distance };
    }
  }
  return best;
}

const mod1 = (v: number): number => {
  const r = v - Math.floor(v);
  return r >= 1 ? 0 : r + 0;
};

/** A point snapped onto a Wyckoff position: the index of the printed row and the point on it, in [0, 1). */
export interface SnappedPoint {
  readonly row: number;
  readonly point: readonly number[];
}

/**
 * Snaps a point (lattice basis) onto the most special Wyckoff position of a plane group that lies
 * within `tolerance` of it (per coordinate, modulo the lattice): positions without a free parameter
 * first, then lines, then the general position, which always holds the point. Among positions with
 * the same number of free parameters the nearest wins. Throws a RangeError for a point that is not
 * two finite numbers or a tolerance outside (0, 1/2).
 */
export function planeSnapToWyckoffPosition(
  key: string,
  point: readonly number[],
  tolerance: number = EPSILON,
): SnappedPoint {
  if (point.length !== 2 || !point.every(Number.isFinite)) {
    throw new RangeError(`A point of the plane has two finite coordinates, not ${JSON.stringify(point)}`);
  }
  if (!(typeof tolerance === 'number' && tolerance > 0 && tolerance < 0.5)) {
    throw new RangeError(`The tolerance must lie between 0 and 1/2, not ${String(tolerance)}`);
  }
  const p = point.map(mod1);
  const rows = positionsOf(planeGroupEntry(key).symbol);
  for (const freedom of [0, 1, 2]) {
    let best: { row: number; point: number[]; distance: number } | undefined;
    for (const { row, expressions } of rows) {
      for (const e of expressions) {
        if (e.freedom !== freedom) continue;
        const n = nearest(e, p);
        if (n.distance < tolerance && (!best || n.distance < best.distance)) best = { row, ...n };
      }
    }
    if (best) return { row: best.row, point: best.point.map(mod1) };
  }
  throw new Error(`The general position of ${key} does not hold ${JSON.stringify(point)}`);
}
