/**
 * The asymmetric unit of a plane group and its symmetry elements in the conventional cell, as numbers
 * (CLAUDE.md, "The API of `symcrys/plane`"): the asymmetric unit as inequalities with its vertices,
 * the elements as rotation points with their n and as mirror and glide lines with the segment
 * that lies in the cell [0, 1]². Exact, in the lattice basis; drawing them stays with the
 * applications. Internal for now.
 */

import { type ExactOperation } from './affine.js';
import { describePlaneOperation } from './describe.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import {
  ONE,
  safeProduct,
  safeSum,
  ZERO,
  add,
  multiply,
  parseRational,
  rational,
  rationalsEqual,
  scale,
  subtract,
  toNumber,
  type Rational,
} from './rational.js';

/** An inequality a·x + b·y ≤ c with integer coefficients without a common factor. */
export type Inequality = readonly [a: number, b: number, c: number];

/** The asymmetric unit of a plane group, a convex polygon in the lattice basis. */
export interface AsymmetricUnit {
  /** Its vertices, counter-clockwise in the lattice basis (a towards b), starting at the vertex with the smallest y, then x. */
  readonly vertices: readonly (readonly Rational[])[];
  /** Its edges as inequalities: inequality i holds the edge from vertex i to vertex i + 1. */
  readonly inequalities: readonly Inequality[];
}

/** A rotation point in the cell (ITA 2016 Table 2.1.2.1, p. 145: the symmetry element of a rotation in the plane). */
export interface RotationPoint {
  /** The highest n of an n-fold rotation about it. */
  readonly n: number;
  /** Its position in [0, 1]². */
  readonly point: readonly Rational[];
}

/** A mirror or glide line, the part of it in the cell. */
export interface SymmetryLine {
  /** `'mirror'` or `'glide'`. */
  readonly kind: 'mirror' | 'glide';
  /** The direction of the line, the shortest integer vector, first non-zero component positive. */
  readonly direction: readonly [number, number];
  /** The normal of the line in the lattice basis, as `PlaneOperationDescription.normal`. */
  readonly normal: readonly [number, number];
  /** For a glide line: its glide vector s·direction with 0 < s < 1; for a mirror line (0, 0). */
  readonly glide: readonly Rational[];
  /** The ends of the segment of the line in the cell [0, 1]², in the order of `direction`. */
  readonly segment: readonly [readonly Rational[], readonly Rational[]];
}

/** The symmetry elements of a plane group in the cell [0, 1]². */
export interface CellElements {
  /** The rotation points, by descending n, then by y and x. */
  readonly rotationPoints: readonly RotationPoint[];
  /** The mirror and glide lines with a segment of non-zero length in the cell, by direction, then by the start of the segment (y, then x). */
  readonly lines: readonly SymmetryLine[];
}

// ---------------------------------------------------------------------------------------------
// Asymmetric unit

/** A linear expression c₀ + cx·x + cy·y. */
type Linear = readonly [cx: Rational, cy: Rational, c0: Rational];

const linAdd = (p: Linear, q: Linear): Linear => [add(p[0], q[0]), add(p[1], q[1]), add(p[2], q[2])];
const linScale = (k: Rational, p: Linear): Linear => [multiply(k, p[0]), multiply(k, p[1]), multiply(k, p[2])];
const isConstant = (p: Linear): boolean => p[0][0] === 0 && p[1][0] === 0;

/**
 * Reads a linear expression as ITA prints the bounds of an asymmetric unit: `x`, `2/3`, `1/2 - x`,
 * `(1 + y)/2`, `x/2`, `2x`. Throws on anything else.
 */
function parseLinear(text: string): Linear {
  const s = text.replace(/\s+/g, '');
  let i = 0;
  const fail = (): never => {
    throw new RangeError(`Cannot read the linear expression "${text}"`);
  };
  function number(): Rational | undefined {
    const m = /^\d+(?:\/\d+)?/.exec(s.slice(i));
    if (!m) return undefined;
    i += m[0].length;
    return parseRational(m[0]);
  }
  function factor(): Linear {
    if (s[i] === '(') {
      i++;
      const e = sum();
      if (s[i++] !== ')') fail();
      return e;
    }
    const k = number();
    if (s[i] === 'x' || s[i] === 'y') {
      const v = s[i++];
      const c = k ?? ONE;
      return v === 'x' ? [c, ZERO, ZERO] : [ZERO, c, ZERO];
    }
    if (k === undefined) return fail();
    return [ZERO, ZERO, k];
  }
  function term(): Linear {
    let e = factor();
    while (s[i] === '/') {
      i++;
      const d = number() ?? fail();
      e = linScale(rational(d[1], d[0]), e);
    }
    return e;
  }
  function sum(): Linear {
    let sign = 1;
    if (s[i] === '-' || s[i] === '+') sign = s[i++] === '-' ? -1 : 1;
    let e = linScale(rational(sign), term());
    while (s[i] === '+' || s[i] === '-') {
      const k = s[i++] === '-' ? -1 : 1;
      e = linAdd(e, linScale(rational(k), term()));
    }
    return e;
  }
  const e = sum();
  if (i !== s.length) fail();
  return e;
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** p ≤ 0 as an inequality with integer coefficients without a common factor. */
function toInequality(p: Linear): Inequality {
  const lcm = p.reduce((l, r) => safeProduct(l, r[1]) / gcd(l, r[1]), 1);
  const [a, b, c0] = p.map((r) => safeProduct(r[0], lcm / r[1]));
  const g = gcd(gcd(a, b), c0) || 1;
  return [a / g + 0, b / g + 0, -c0 / g + 0];
}

/** Reads the printed block "Asymmetric unit", e.g. `0 <= x <= 1/2; y <= min(1 - x, (1 + x)/2)`. */
export function parseAsymmetricUnit(text: string): Inequality[] {
  const out: Inequality[] = [];
  for (const clause of text.split(';')) {
    const sides = clause.split('<=').map((side) => {
      const m = /^\s*min\((.*)\)\s*$/.exec(side);
      if (!m) return [parseLinear(side)];
      // min(A, B): split at the comma outside parentheses.
      let depth = 0;
      const inner = m[1];
      for (let k = 0; k < inner.length; k++) {
        if (inner[k] === '(') depth++;
        else if (inner[k] === ')') depth--;
        else if (inner[k] === ',' && depth === 0)
          return [parseLinear(inner.slice(0, k)), parseLinear(inner.slice(k + 1))];
      }
      throw new RangeError(`Cannot read "${side}"`);
    });
    if (sides.length < 2) throw new RangeError(`Not an inequality: "${clause}"`);
    for (let k = 0; k + 1 < sides.length; k++) {
      for (const lhs of sides[k]) {
        for (const rhs of sides[k + 1]) {
          const p = linAdd(lhs, linScale(rational(-1), rhs));
          if (isConstant(p)) throw new RangeError(`No variable in "${clause}"`);
          out.push(toInequality(p));
        }
      }
    }
  }
  return out;
}

const r = (n: number): Rational => rational(n);

/** a·x + b·y − c for a point. */
const excess = (q: Inequality, p: readonly Rational[]): Rational =>
  subtract(add(scale(q[0], p[0]), scale(q[1], p[1])), r(q[2]));

/** The vertices of the polygon {q_i ≤ 0}, counter-clockwise from the lowest (y, then x). */
function polygon(inequalities: readonly Inequality[]): Rational[][] {
  const points: Rational[][] = [];
  for (let i = 0; i < inequalities.length; i++) {
    for (let j = i + 1; j < inequalities.length; j++) {
      const [a1, b1, c1] = inequalities[i];
      const [a2, b2, c2] = inequalities[j];
      const cross = (u: number, v: number, x: number, y: number) => safeSum(safeProduct(u, v), -safeProduct(x, y));
      const det = cross(a1, b2, a2, b1);
      if (det === 0) continue;
      const p = [rational(cross(c1, b2, c2, b1), det), rational(cross(a1, c2, a2, c1), det)];
      if (inequalities.every((q) => excess(q, p)[0] <= 0) && !points.some((v) => samePoint(v, p))) points.push(p);
    }
  }
  if (points.length < 3) throw new RangeError('The asymmetric unit is not a polygon');
  const cx = points.reduce((s, p) => s + toNumber(p[0]), 0) / points.length;
  const cy = points.reduce((s, p) => s + toNumber(p[1]), 0) / points.length;
  const angle = (p: readonly Rational[]) => Math.atan2(toNumber(p[1]) - cy, toNumber(p[0]) - cx);
  points.sort((p, q) => angle(p) - angle(q));
  const lowest = points.reduce((k, p, i) => {
    const q = points[k];
    const dy = toNumber(subtract(p[1], q[1]));
    return dy < 0 || (dy === 0 && toNumber(subtract(p[0], q[0])) < 0) ? i : k;
  }, 0);
  return [...points.slice(lowest), ...points.slice(0, lowest)];
}

const samePoint = (p: readonly Rational[], q: readonly Rational[]): boolean =>
  rationalsEqual(p[0], q[0]) && rationalsEqual(p[1], q[1]);

const unitCache = new Map<string, AsymmetricUnit>();

/**
 * The asymmetric unit of a plane group as ITA prints it, a convex polygon: its vertices and, for each
 * edge, the inequality a·x + b·y ≤ c that holds it. Printed inequalities that hold no edge are
 * left out. Frozen.
 */
export function planeAsymmetricUnit(key: string | number): AsymmetricUnit {
  const entry = planeGroupEntry(key);
  let unit = unitCache.get(entry.symbol);
  if (!unit) {
    const printed = parseAsymmetricUnit(entry.asymmetricUnit);
    const vertices = polygon(printed);
    const inequalities = vertices.map((p, i) => {
      const q = vertices[(i + 1) % vertices.length];
      const edge = printed.find((e) => excess(e, p)[0] === 0 && excess(e, q)[0] === 0);
      if (!edge) throw new Error(`No printed inequality of ${entry.symbol} holds an edge`);
      return Object.freeze(edge);
    });
    unit = Object.freeze({
      vertices: Object.freeze(vertices.map((v) => Object.freeze(v))),
      inequalities: Object.freeze(inequalities),
    });
    unitCache.set(entry.symbol, unit);
  }
  return unit;
}

// ---------------------------------------------------------------------------------------------
// Symmetry elements in the cell

const inCell = (p: readonly Rational[]): boolean => p.every((v) => v[0] >= 0 && v[0] <= v[1]);

/**
 * The lattice shifts t, |t_i| ≤ 3, added to each coset representative (W, w), w in [0, 1). Enough to
 * reach every element that meets the cell: a centre p in [0, 1]² of (W, w + t) has
 * t = (I − W)p − w, and the entries of I − W (at most 2 on the diagonal, 1 off it) give
 * (I − W)p in [−2, 3]; a line through p in the cell, taken with its glide g along it reduced to
 * g = d/2 (in a plane group s is 0 or 1/2, and |d_i| ≤ 2, so |g_i| ≤ 1), has t = (I − W)p + g − w, where for a reflection (I − W)p lies in [−1, 2].
 */
const SHIFTS: Rational[][] = [];
for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) SHIFTS.push([r(i), r(j)]);

/**
 * The segment of the line through p along d in [0, 1]², or undefined if it has no length there.
 * Exact: the parameter λ of p + λd is bounded by each coordinate.
 */
function clip(
  p: readonly Rational[],
  d: readonly [number, number],
): [readonly Rational[], readonly Rational[]] | undefined {
  let lo: Rational | undefined;
  let hi: Rational | undefined;
  for (let k = 0; k < 2; k++) {
    if (d[k] === 0) {
      if (p[k][0] < 0 || p[k][0] > p[k][1]) return undefined;
      continue;
    }
    // 0 ≤ p_k + λ d_k ≤ 1
    const a = rational(-p[k][0], p[k][1] * d[k]);
    const b = rational(p[k][1] - p[k][0], p[k][1] * d[k]);
    const [l, h] = d[k] > 0 ? [a, b] : [b, a];
    if (lo === undefined || toNumber(subtract(l, lo)) > 0) lo = l;
    if (hi === undefined || toNumber(subtract(h, hi)) < 0) hi = h;
  }
  if (lo === undefined || hi === undefined || toNumber(subtract(hi, lo)) <= 0) return undefined;
  const at = (lambda: Rational) => [add(p[0], scale(d[0], lambda)), add(p[1], scale(d[1], lambda))];
  return [at(lo), at(hi)];
}

/** s mod 1 in [0, 1). */
function frac(s: Rational): Rational {
  const n = Math.floor(s[0] / s[1]);
  return subtract(s, r(n));
}

const elementCache = new Map<string, CellElements>();

/**
 * The symmetry elements of a plane group in its conventional cell [0, 1]², boundary included: every
 * rotation point with the highest n of a rotation about it, and every mirror and glide line
 * that crosses the cell, with the segment inside it. A line that carries a glide is a glide line
 * with its shortest glide vector along the line (between 0 and the lattice vector). Frozen.
 */
export function planeCellElements(key: string | number): CellElements {
  const entry = planeGroupEntry(key);
  const cached = elementCache.get(entry.symbol);
  if (cached) return cached;
  const rotationPoints: { n: number; point: Rational[] }[] = [];
  const lines: {
    kind: 'mirror' | 'glide';
    direction: [number, number];
    normal: readonly [number, number];
    s: Rational;
    c: Rational;
    segment: [readonly Rational[], readonly Rational[]];
  }[] = [];
  for (const op of planeGroupOperations(entry.symbol)) {
    for (const t of SHIFTS) {
      const shifted: ExactOperation = {
        matrix: op.matrix,
        translation: [add(op.translation[0], t[0]), add(op.translation[1], t[1])],
      };
      const d = describePlaneOperation(shifted);
      if (d.kind === 'rotation') {
        const p = [...(d.location ?? [])];
        if (!inCell(p)) continue;
        const known = rotationPoints.find((x) => samePoint(x.point, p));
        if (!known) rotationPoints.push({ n: d.n, point: p });
        else known.n = Math.max(known.n, d.n);
      } else if (d.kind === 'reflection' || d.kind === 'glide-reflection') {
        const dir = d.direction ?? [0, 0];
        const p = d.location ?? [];
        // The glide vector is s·dir; s modulo 1, since a lattice translation along the line changes nothing.
        const g = d.glide ?? [ZERO, ZERO];
        const s = frac(dir[0] !== 0 ? rational(g[0][0], g[0][1] * dir[0]) : rational(g[1][0], g[1][1] * dir[1]));
        // The line is the set of x with (−dir_y, dir_x)·x = c.
        const c = add(scale(-dir[1], p[0]), scale(dir[0], p[1]));
        if (
          lines.some(
            (l) =>
              l.direction[0] === dir[0] &&
              l.direction[1] === dir[1] &&
              rationalsEqual(l.c, c) &&
              rationalsEqual(l.s, s),
          )
        ) {
          continue;
        }
        const segment = clip(p, dir);
        if (!segment) continue;
        lines.push({
          kind: s[0] === 0 ? 'mirror' : 'glide',
          direction: [dir[0], dir[1]],
          normal: d.normal ?? [0, 0],
          s,
          c,
          segment,
        });
      }
    }
  }
  const num = (v: Rational) => toNumber(v);
  rotationPoints.sort((a, b) => b.n - a.n || num(a.point[1]) - num(b.point[1]) || num(a.point[0]) - num(b.point[0]));
  lines.sort(
    (a, b) =>
      a.direction[0] - b.direction[0] ||
      a.direction[1] - b.direction[1] ||
      num(a.segment[0][1]) - num(b.segment[0][1]) ||
      num(a.segment[0][0]) - num(b.segment[0][0]),
  );
  const result: CellElements = Object.freeze({
    rotationPoints: Object.freeze(rotationPoints.map((x) => Object.freeze({ n: x.n, point: Object.freeze(x.point) }))),
    lines: Object.freeze(
      lines.map((l) =>
        Object.freeze({
          kind: l.kind,
          direction: Object.freeze(l.direction) as readonly [number, number],
          normal: Object.freeze([...l.normal]) as readonly [number, number],
          glide: Object.freeze([scale(l.direction[0], l.s), scale(l.direction[1], l.s)]),
          segment: Object.freeze(l.segment.map((p) => Object.freeze([...p]))) as unknown as SymmetryLine['segment'],
        }),
      ),
    ),
  });
  elementCache.set(entry.symbol, result);
  return result;
}
