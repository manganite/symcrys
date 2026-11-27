/**
 * The asymmetric unit of a plane group and its symmetry elements, as numbers (docs/conventions.md,
 * "Plane groups"): the asymmetric unit as its printed inequalities with the
 * polygon they bound, the elements as rotation points with their n and as mirror and glide lines
 * by a point and a direction, once modulo the lattice or all translates in a box. Exact, in the
 * lattice basis; drawing them stays with the applications. Internal for now.
 */

import { BOUNDARY_EPSILON } from '../tolerances.js';
import { gcd } from '../integers.js';
import { shown } from '../checks.js';
import { type ExactOperation } from './affine.js';
import { describePlaneOperation } from './describe.js';
import { planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import {
  ONE,
  safeProduct,
  safeSum,
  ZERO,
  add,
  mod1,
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

/** The asymmetric unit of a plane group: the printed inequalities, and the convex polygon they bound. */
export interface AsymmetricUnit {
  /** The inequalities as printed, in printed order, also those that hold no edge (p3: x ≤ 2/3). */
  readonly inequalities: readonly Inequality[];
  /** The vertices of the polygon, counter-clockwise in the lattice basis (a towards b), starting at the vertex with the smallest y, then x. */
  readonly vertices: readonly (readonly Rational[])[];
  /** Per edge, from vertex i to vertex i + 1, the index into `inequalities` of the one that holds it. */
  readonly edges: readonly number[];
}

/** A rotation point (ITA 2016 Table 2.1.2.1, p. 145: the symmetry element of a rotation in the plane). */
export interface RotationPoint {
  /** The highest n of an n-fold rotation about it. */
  readonly n: number;
  /** Its location. */
  readonly point: readonly Rational[];
}

/** A mirror or glide line, as a point and a direction. */
export interface SymmetryLine {
  /** `'mirror'` or `'glide'`. */
  readonly kind: 'mirror' | 'glide';
  /** The direction of the line, the shortest integer vector, first non-zero component positive. */
  readonly direction: readonly [number, number];
  /** The normal of the line in the lattice basis, as `PlaneOperationDescription.axis`. */
  readonly axis: readonly [number, number];
  /** For a glide line: its glide vector s·direction with 0 < s < 1; for a mirror line (0, 0). */
  readonly glide: readonly Rational[];
  /** A point of the line: its intersection with y = 0, or with x = 0 for a line along a. */
  readonly point: readonly Rational[];
}

/** Symmetry elements of a plane group. */
export interface CellElements {
  /** The rotation points, by descending n, then by y and x. */
  readonly rotationPoints: readonly RotationPoint[];
  /** The mirror and glide lines, by direction, then by their point (x on y = 0, or y on x = 0), then mirror before glide. */
  readonly lines: readonly SymmetryLine[];
}

/** A box [x₀, y₀] – [x₁, y₁] of the plane, lattice basis, boundary included. */
export type Box = readonly [readonly [number, number], readonly [number, number]];

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
 * The asymmetric unit of a plane group as ITA prints it: the printed inequalities
 * a·x + b·y ≤ c, all of them in printed order (a double inequality and a `min` give one each), and
 * the convex polygon they bound: its vertices and, per edge, the index of the inequality that holds
 * it. Frozen.
 */
export function planeAsymmetricUnit(key: string | number): AsymmetricUnit {
  const entry = planeGroupEntry(key);
  let unit = unitCache.get(entry.symbol);
  if (!unit) {
    const inequalities = parseAsymmetricUnit(entry.asymmetricUnit);
    const vertices = polygon(inequalities);
    const edges = vertices.map((p, i) => {
      const q = vertices[(i + 1) % vertices.length];
      const edge = inequalities.findIndex((e) => excess(e, p)[0] === 0 && excess(e, q)[0] === 0);
      if (edge < 0) throw new Error(`No inequality of ${entry.symbol} holds an edge`);
      return edge;
    });
    unit = Object.freeze({
      inequalities: Object.freeze(inequalities.map((e) => Object.freeze(e))),
      vertices: Object.freeze(vertices.map((v) => Object.freeze(v))),
      edges: Object.freeze(edges),
    });
    unitCache.set(entry.symbol, unit);
  }
  return unit;
}

// ---------------------------------------------------------------------------------------------
// Symmetry elements

const inCell = (p: readonly Rational[]): boolean => p.every((v) => v[0] >= 0 && v[0] <= v[1]);

/**
 * The lattice shifts t, |t_i| ≤ 3, added to each coset representative (W, w), w in [0, 1). Enough to
 * reach every element that meets the cell [0, 1]², and so every element modulo the lattice: a centre
 * p in [0, 1]² of (W, w + t) has t = (I − W)p − w, and the entries of I − W (at most 2 on the
 * diagonal, 1 off it) give (I − W)p in [−2, 3]; a line through p in the cell, taken with its glide
 * g along it reduced to g = d/2 (in a plane group s is 0 or 1/2, and |d_i| ≤ 2, so |g_i| ≤ 1), has
 * t = (I − W)p + g − w, where for a reflection (I − W)p lies in [−1, 2].
 */
const SHIFTS: Rational[][] = [];
for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) SHIFTS.push([r(i), r(j)]);

/** A line: {x : (−d_y, d_x)·x = c} with its glide s·d; for a class, c as `classOffset` chooses it. */
interface LineClass {
  kind: 'mirror' | 'glide';
  direction: [number, number];
  axis: readonly [number, number];
  s: Rational;
  c: Rational;
  /** The step of c between the translates of the line (1, or 1/2 under a centring). */
  step: Rational;
}

/** The point of the line (d, c) on y = 0, or on x = 0 for a line along a. */
function linePoint(d: readonly [number, number], c: Rational): Rational[] {
  return d[1] !== 0 ? [rational(-c[0], c[1] * d[1]), ZERO] : [ZERO, rational(c[0], c[1] * d[0])];
}

/** The coordinate of that point that is not 0: where the line crosses y = 0 (or x = 0). */
const lineParameter = (l: LineClass): number => {
  const p = linePoint(l.direction, l.c);
  return toNumber(l.direction[1] !== 0 ? p[0] : p[1]);
};

/**
 * The offset c of a line class, one for all its lattice translates: a lattice translation t changes c
 * by (−d_y, d_x)·t, which for a primitive lattice is any integer and with the centring (1/2, 1/2) also
 * (d_x − d_y)/2; so the class is c modulo `step` (1, or 1/2 where that is odd in a centred group). Of
 * the translates the one is taken whose point on y = 0 (on x = 0 for a line along a) lies nearest to
 * 0 from above.
 */
function classOffset(d: readonly [number, number], c: Rational, step: Rational): Rational {
  const modulo = (v: Rational, m: Rational): Rational =>
    subtract(v, scale(Math.floor(toNumber(v) / toNumber(m) + BOUNDARY_EPSILON), m));
  const reduced = modulo(c, step);
  if (d[1] === 0) return reduced; // the point is (0, c/d_x) with d_x = 1
  // x = −c/d_y; c' = c − m·step moves x by m·step/d_y: take x in [0, step/|d_y|).
  const x = rational(-reduced[0], reduced[1] * d[1]);
  const shifted = modulo(x, rational(step[0], step[1] * Math.abs(d[1])));
  return rational(-shifted[0] * d[1], shifted[1]);
}

/** The centring translations of a plane group besides (0, 0), exact. */
function centrings(entry: { readonly centring: readonly string[] }): Rational[][] {
  return entry.centring.map((t) => t.split(',').map((v) => parseRational(v.trim())));
}

/** The step of c for a line along d under the lattice with these centrings: 1, or a fraction of it. */
function lineStep(d: readonly [number, number], taus: readonly Rational[][]): Rational {
  let step = r(1);
  for (const tau of taus) {
    const shift = mod1(add(scale(-d[1], tau[0]), scale(d[0], tau[1])));
    if (shift[0] !== 0 && toNumber(shift) < toNumber(step)) step = shift;
  }
  return step;
}

/** Of the points p + τ (mod 1) of one class under the centrings, the lowest (y, then x). */
function classPoint(p: readonly Rational[], taus: readonly Rational[][]): Rational[] {
  let best = [...p];
  for (const tau of taus) {
    const q = [mod1(add(p[0], tau[0])), mod1(add(p[1], tau[1]))];
    const dy = toNumber(subtract(q[1], best[1]));
    if (dy < 0 || (dy === 0 && toNumber(subtract(q[0], best[0])) < 0)) best = q;
  }
  return best;
}

const classCache = new Map<string, { rotations: { n: number; point: Rational[] }[]; lines: LineClass[] }>();

/** The elements of a plane group modulo the lattice: rotation points in [0, 1)², one translate of each line (`classOffset`). */
function elementClasses(key: string | number) {
  const entry = planeGroupEntry(key);
  const cached = classCache.get(entry.symbol);
  if (cached) return cached;
  const rotations: { n: number; point: Rational[] }[] = [];
  const lines: LineClass[] = [];
  const taus = centrings(entry);
  for (const op of planeGroupOperations(entry.symbol)) {
    for (const t of SHIFTS) {
      const shifted: ExactOperation = {
        matrix: op.matrix,
        translation: [add(op.translation[0], t[0]), add(op.translation[1], t[1])],
      };
      const d = describePlaneOperation(shifted);
      if (d.kind === 'rotation') {
        const loc = d.location ?? [];
        if (!inCell(loc)) continue;
        const p = classPoint(loc.map(mod1), taus);
        const known = rotations.find((x) => samePoint(x.point, p));
        if (!known) rotations.push({ n: d.n, point: p });
        else known.n = Math.max(known.n, d.n);
      } else if (d.kind === 'reflection' || d.kind === 'glide-reflection') {
        const dir = d.direction ?? [0, 0];
        const p = d.location ?? [];
        // The glide vector is s·dir; s modulo 1, since a lattice translation along the line changes nothing.
        const g = d.glide ?? [ZERO, ZERO];
        const s = mod1(dir[0] !== 0 ? rational(g[0][0], g[0][1] * dir[0]) : rational(g[1][0], g[1][1] * dir[1]));
        // The line is the set of x with (−dir_y, dir_x)·x = c; the lattice shifts c by multiples of step.
        const step = lineStep([dir[0], dir[1]], taus);
        const c = classOffset([dir[0], dir[1]], add(scale(-dir[1], p[0]), scale(dir[0], p[1])), step);
        const known = lines.some(
          (l) =>
            l.direction[0] === dir[0] && l.direction[1] === dir[1] && rationalsEqual(l.c, c) && rationalsEqual(l.s, s),
        );
        if (!known) {
          lines.push({
            kind: s[0] === 0 ? 'mirror' : 'glide',
            direction: [dir[0], dir[1]],
            axis: d.axis ?? [0, 0],
            s,
            c,
            step,
          });
        }
      }
    }
  }
  const result = { rotations, lines };
  classCache.set(entry.symbol, result);
  return result;
}

const num = (v: Rational) => toNumber(v);

/** The elements as frozen records, sorted. */
function freezeElements(rotations: { n: number; point: Rational[] }[], lines: LineClass[]): CellElements {
  rotations.sort((a, b) => b.n - a.n || num(a.point[1]) - num(b.point[1]) || num(a.point[0]) - num(b.point[0]));
  lines.sort(
    (a, b) =>
      a.direction[0] - b.direction[0] ||
      a.direction[1] - b.direction[1] ||
      lineParameter(a) - lineParameter(b) ||
      num(a.s) - num(b.s),
  );
  return Object.freeze({
    rotationPoints: Object.freeze(rotations.map((x) => Object.freeze({ n: x.n, point: Object.freeze(x.point) }))),
    lines: Object.freeze(
      lines.map((l) =>
        Object.freeze({
          kind: l.kind,
          direction: Object.freeze([...l.direction]) as readonly [number, number],
          axis: Object.freeze([...l.axis]) as readonly [number, number],
          glide: Object.freeze([scale(l.direction[0], l.s), scale(l.direction[1], l.s)]),
          point: Object.freeze(linePoint(l.direction, l.c)),
        }),
      ),
    ),
  });
}

const elementCache = new Map<string, CellElements>();

/** The most rotation points, and the most lines, a box may meet: a guard against a box far larger than any drawing. */
const MAX_ELEMENTS = 1_000_000;

/**
 * The symmetry elements of a plane group, each once modulo the lattice translations (the centring
 * included), as ITA
 * describes them: every rotation point in [0, 1)² with the highest n of a rotation about
 * it, and every mirror and glide line, as a point and a direction. A line that carries a glide is a
 * glide line with its shortest glide vector along the line (between 0 and the lattice vector). Frozen.
 */
export function planeElements(key: string | number): CellElements {
  const entry = planeGroupEntry(key);
  let result = elementCache.get(entry.symbol);
  if (!result) {
    const { rotations, lines } = elementClasses(entry.symbol);
    result = freezeElements(
      rotations.map((x) => ({ n: x.n, point: [...x.point] })),
      lines.map((l) => ({ ...l })),
    );
    elementCache.set(entry.symbol, result);
  }
  return result;
}

/**
 * The symmetry elements of a plane group with all their lattice translates that meet a box
 * (boundary included): the rotation points inside it, and the lines that cross or touch it, as a
 * point and a direction (not clipped). Frozen.
 */
export function planeElementsInBox(key: string | number, box: Box): CellElements {
  const [[x0, y0], [x1, y1]] = box;
  const entry = planeGroupEntry(key);
  const { rotations, lines } = elementClasses(entry.symbol);
  const taus = [[ZERO, ZERO], ...centrings(entry)];
  // A bound on the output: the rotation points of a class in the box.
  const estimate = rotations.length * taus.length * (x1 - x0 + 2) * (y1 - y0 + 2);
  if (!(estimate <= MAX_ELEMENTS)) {
    throw new RangeError(
      `The box ${shown(box)} holds about ${Math.round(estimate)} rotation points, more than ${MAX_ELEMENTS}`,
    );
  }
  // And on the lines: the translates of a class that cross the box.
  const lineCount = lines.reduce((sum, l) => {
    const values = [x0, x1].flatMap((x) => [y0, y1].map((y) => -l.direction[1] * x + l.direction[0] * y));
    return sum + (Math.max(...values) - Math.min(...values)) / num(l.step) + 1;
  }, 0);
  if (!(lineCount <= MAX_ELEMENTS)) {
    throw new RangeError(`The box ${shown(box)} meets about ${Math.round(lineCount)} lines, more than ${MAX_ELEMENTS}`);
  }
  const inside: { n: number; point: Rational[] }[] = [];
  for (const { n, point } of rotations) {
    for (const tau of taus) {
      const base = [add(point[0], tau[0]), add(point[1], tau[1])];
      const [px, py] = base.map(num);
      for (let i = Math.ceil(x0 - px - BOUNDARY_EPSILON); i <= Math.floor(x1 - px + BOUNDARY_EPSILON); i++) {
        for (let j = Math.ceil(y0 - py - BOUNDARY_EPSILON); j <= Math.floor(y1 - py + BOUNDARY_EPSILON); j++) {
          const p = [add(base[0], r(i)), add(base[1], r(j))];
          const [qx, qy] = p.map(num);
          if (
            qx >= x0 - BOUNDARY_EPSILON &&
            qx <= x1 + BOUNDARY_EPSILON &&
            qy >= y0 - BOUNDARY_EPSILON &&
            qy <= y1 + BOUNDARY_EPSILON
          )
            inside.push({ n, point: p });
        }
      }
    }
  }
  const crossing: LineClass[] = [];
  for (const l of lines) {
    // (−d_y, d_x)·x over the corners of the box: the translate c + k·step meets it if that lies within.
    const values = [x0, x1].flatMap((x) => [y0, y1].map((y) => -l.direction[1] * x + l.direction[0] * y));
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const c = num(l.c);
    const step = num(l.step);
    for (
      let k = Math.ceil((lo - c) / step - BOUNDARY_EPSILON);
      k <= Math.floor((hi - c) / step + BOUNDARY_EPSILON);
      k++
    ) {
      crossing.push({ ...l, c: add(l.c, scale(k, l.step)) });
    }
  }
  return freezeElements(inside, crossing);
}
