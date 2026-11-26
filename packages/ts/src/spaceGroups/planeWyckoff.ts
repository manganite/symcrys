/**
 * The Wyckoff positions of the plane groups, computed from the group (docs/conventions.md, "Plane
 * groups", "Wyckoff positions"): a special position is the orbit of a rotation point or a mirror
 * line, its multiplicity the order of the group over that of the site-symmetry group, its oriented
 * site-symmetry symbol read along the symmetry directions of the lattice, its coordinates the
 * images of a first representative under the operations in their order. ITA's letters and first
 * representatives follow from a rule, except four first representatives, which are convention data.
 */

import { deepFreeze } from '../freeze.js';
import { applyToPoint, determinant, formatOperation, type ExactOperation, type IntMatrix } from './affine.js';
import { planeGroupEntry, planeGroupOperations, type PLANE_GROUP_KEYS } from './planeGroups.js';
import type { PlaneSystem, PlaneWyckoffRow } from './planeGroupData.js';
import {
  add,
  isInteger,
  mod1,
  multiply,
  negate,
  rational,
  rationalsEqual,
  subtract,
  toNumber,
  type Rational,
} from './rational.js';

type Vec = readonly [Rational, Rational];
type Direction = readonly [number, number];

/** A special element of a plane group: a rotation point, or a mirror line through `point` along `direction`. */
type Element =
  | { readonly kind: 'point'; readonly point: Vec }
  | { readonly kind: 'line'; readonly point: Vec; readonly direction: Direction };

/**
 * The symmetry directions of the plane lattices after the rotation point, by set (ITA 2016 Table
 * 2.1.3.1, p. 151, "Two dimensions"): convention data of ITA, the order of the positions of the
 * symbols.
 */
const SYMMETRY_DIRECTIONS: Readonly<Record<PlaneSystem, readonly (readonly Direction[])[]>> = {
  oblique: [],
  rectangular: [[[1, 0]], [[0, 1]]],
  square: [
    [
      [1, 0],
      [0, 1],
    ],
    [
      [1, -1],
      [1, 1],
    ],
  ],
  hexagonal: [
    [
      [1, 0],
      [0, 1],
      [-1, -1],
    ],
    [
      [1, -1],
      [1, 2],
      [-2, -1],
    ],
  ],
};

/**
 * First representatives that ITA prints where the rule (the point of the orbit lowest by y, then x)
 * gives another point of the same orbit: convention data, as ITA typed the first representatives in
 * by hand (ITA 2016 § 2.1.4, p. 173). The other first representatives follow from the rule.
 */
const PRINTED_REPRESENTATIVES: Readonly<Partial<Record<(typeof PLANE_GROUP_KEYS)[number], readonly string[]>>> = {
  c2mm: ['0,1/2'],
  p31m: ['1/3,2/3'],
  p6: ['1/3,2/3'],
  p6mm: ['1/3,2/3'],
};

const r = (n: number, d = 1): Rational => rational(n, d);
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const cmp = (a: Rational, b: Rational): number => toNumber(a) - toNumber(b);
const vecMod1 = (v: readonly Rational[]): Vec => [mod1(v[0]), mod1(v[1])];
const vecEqual = (a: Vec, b: Vec): boolean => rationalsEqual(a[0], b[0]) && rationalsEqual(a[1], b[1]);

/** The shortest integer vector along `v` with its first non-zero component positive. */
function primitive(v: readonly number[]): Direction {
  const g = gcd(v[0], v[1]);
  const sign = v[0] < 0 || (v[0] === 0 && v[1] < 0) ? -1 : 1;
  return [(sign * v[0]) / g + 0, (sign * v[1]) / g + 0];
}

const applyLinear = (m: IntMatrix, d: Direction): Direction => [
  m[0][0] * d[0] + m[0][1] * d[1],
  m[1][0] * d[0] + m[1][1] * d[1],
];

/**
 * The fixed set of an operation with a lattice translation added, if it is a point or a line: the
 * solutions of (W − 1)x = −(w + t). A rotation fixes one point; a reflection a line, a glide
 * reflection none.
 */
function fixedSet(op: ExactOperation, t: Direction): Element | undefined {
  const w = op.matrix;
  const b: Vec = [negate(add(op.translation[0], r(t[0]))), negate(add(op.translation[1], r(t[1])))];
  const a = [
    [w[0][0] - 1, w[0][1]],
    [w[1][0], w[1][1] - 1],
  ];
  const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
  if (det !== 0) {
    // Cramer's rule.
    const x = multiply(subtract(multiply(r(a[1][1]), b[0]), multiply(r(a[0][1]), b[1])), r(1, det));
    const y = multiply(subtract(multiply(r(a[0][0]), b[1]), multiply(r(a[1][0]), b[0])), r(1, det));
    return { kind: 'point', point: vecMod1([x, y]) };
  }
  if (determinant(w) !== -1) return undefined;
  // A reflection: the rows of W − 1 are proportional; its kernel is the direction of the line.
  const row = a[0][0] !== 0 || a[0][1] !== 0 ? 0 : 1;
  const [p, q] = a[row];
  const direction = primitive([-q, p]);
  // One solution: the row equation p·x + q·y = b[row], consistent with the other row if a fixed line exists.
  const point: Vec = p !== 0 ? [multiply(b[row], r(1, p)), r(0)] : [r(0), multiply(b[row], r(1, q))];
  const other = 1 - row;
  const lhs = add(multiply(r(a[other][0]), point[0]), multiply(r(a[other][1]), point[1]));
  if (!rationalsEqual(lhs, b[other])) return undefined;
  return { kind: 'line', point, direction };
}

/** cross(p, d) = p_x d_y − p_y d_x, which two parallel lines share modulo 1 exactly when they are equal modulo the lattice. */
const cross = (p: Vec, d: Direction): Rational => subtract(multiply(p[0], r(d[1])), multiply(p[1], r(d[0])));

function sameElement(a: Element, b: Element): boolean {
  if (a.kind === 'point' && b.kind === 'point') return vecEqual(vecMod1(a.point), vecMod1(b.point));
  if (a.kind === 'line' && b.kind === 'line') {
    return (
      a.direction[0] === b.direction[0] &&
      a.direction[1] === b.direction[1] &&
      isInteger(subtract(cross(a.point, a.direction), cross(b.point, a.direction)))
    );
  }
  return false;
}

/** The image of an element under an operation. */
function image(op: ExactOperation, e: Element): Element {
  const point = applyToPoint(op, e.point) as unknown as Vec;
  if (e.kind === 'point') return { kind: 'point', point: vecMod1(point) };
  return { kind: 'line', point, direction: primitive(applyLinear(op.matrix, e.direction)) };
}

/** True if the operation, with some lattice translation, fixes the element pointwise. */
function fixes(op: ExactOperation, e: Element): boolean {
  const moved = applyToPoint(op, e.point);
  if (!isInteger(subtract(moved[0], e.point[0])) || !isInteger(subtract(moved[1], e.point[1]))) return false;
  if (e.kind === 'point') return true;
  const d = applyLinear(op.matrix, e.direction);
  return d[0] === e.direction[0] && d[1] === e.direction[1];
}

/**
 * A line in ITA's form: the point with the coordinate of the free parameter 0, the other
 * coordinate in [0, 1). The parameter is named after the first non-zero component of the direction.
 */
function lineForm(e: Element & { kind: 'line' }): { point: Vec; pivot: 0 | 1 } {
  const d = e.direction;
  const pivot = d[0] !== 0 ? 0 : 1;
  const s = multiply(negate(e.point[pivot]), r(1, d[pivot]));
  const point: Vec = [add(e.point[0], multiply(s, r(d[0]))), add(e.point[1], multiply(s, r(d[1])))];
  return { point: pivot === 0 ? [r(0), mod1(point[1])] : [mod1(point[0]), r(0)], pivot };
}

/**
 * The order of lines among those of equal multiplicity, and of the lines of one orbit for its first
 * representative: the parameter x before y, then the direction with fewer non-zero components,
 * smaller components and fewer minus signs, then the constant ascending.
 */
function lineKey(e: Element & { kind: 'line' }): number[] {
  const { point, pivot } = lineForm(e);
  const d = e.direction;
  return [
    pivot,
    d.filter((c) => c !== 0).length,
    Math.max(...d.map(Math.abs)),
    d.filter((c) => c < 0).length,
    toNumber(point[1 - pivot]),
  ];
}

const compareKeys = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/** The operation x ↦ (the element's point) + parameter · direction, as a matrix acting on (x, y), for writing images. */
function parametrization(e: Element): ExactOperation {
  if (e.kind === 'point') {
    return {
      matrix: [
        [0, 0],
        [0, 0],
      ],
      translation: [e.point[0], e.point[1]],
    };
  }
  const { point, pivot } = lineForm(e);
  const d = e.direction;
  const column = (i: number): number[] => (pivot === 0 ? [d[i], 0] : [0, d[i]]);
  return { matrix: [column(0), column(1)], translation: [point[0], point[1]] };
}

/** g ∘ p with the translation reduced modulo the lattice. */
function composeMod(g: ExactOperation, p: ExactOperation): ExactOperation {
  const matrix = g.matrix.map((row) => [0, 1].map((j) => row[0] * p.matrix[0][j] + row[1] * p.matrix[1][j]));
  const t = applyToPoint(g, p.translation);
  return { matrix, translation: [mod1(t[0]), mod1(t[1])] };
}

/** The normal of a mirror line, its symmetry direction: the non-zero column of W − 1, primitive (as `axis` in describe.ts). */
function mirrorNormal(w: IntMatrix): Direction {
  const first = [w[0][0] - 1, w[1][0]];
  return primitive(first[0] !== 0 || first[1] !== 0 ? first : [w[0][1], w[1][1] - 1]);
}

/** The oriented site-symmetry symbol of a site-symmetry group (ITA 2016 § 2.1.3.12, p. 163). */
function orientedSymbol(system: PlaneSystem, site: readonly ExactOperation[]): string {
  const rotations = site.filter((op) => determinant(op.matrix) === 1).length;
  const mirrors = site.filter((op) => determinant(op.matrix) === -1).map((op) => mirrorNormal(op.matrix));
  const parallel = (a: Direction, b: Direction): boolean => a[0] * b[1] - a[1] * b[0] === 0;
  const sets = SYMMETRY_DIRECTIONS[system].map((set) => {
    // The directions of the set fall into orbits under the site group; one character per orbit
    // that carries a mirror, a dot if none does.
    const orbits: Direction[][] = [];
    for (const d of set) {
      if (orbits.some((o) => o.some((x) => parallel(x, d)))) continue;
      orbits.push(set.filter((x) => site.some((op) => parallel(applyLinear(op.matrix, d), x))) as Direction[]);
    }
    const chars = orbits.filter((o) => o.some((x) => mirrors.some((m) => parallel(m, x)))).map(() => 'm');
    return chars.length === 0 ? '.' : chars.join('');
  });
  const symbol = [rotations === 1 ? '.' : String(rotations), ...sets].join('');
  return /^[.]*$/.test(symbol.replace(/^\./, '')) && rotations === 1 ? '1' : symbol;
}

const cache = new Map<string, readonly PlaneWyckoffRow[]>();

/**
 * The Wyckoff positions of a plane group in ITA's order (general position first, then the letters
 * downwards): multiplicity, letter, oriented site-symmetry symbol and the coordinates of the (0,0)+
 * set as ITA writes them.
 */
export function planeWyckoffRows(key: string): readonly PlaneWyckoffRow[] {
  const cached = cache.get(key);
  if (cached) return cached;
  const entry = planeGroupEntry(key);
  const ops = planeGroupOperations(key);
  const centrings = 1 + entry.centring.length;
  const ownOps = ops.slice(0, ops.length / centrings);
  const centringVectors: Vec[] = ops
    .filter((op) => op.matrix[0][0] === 1 && op.matrix[0][1] === 0 && op.matrix[1][0] === 0 && op.matrix[1][1] === 1)
    .map((op) => [op.translation[0], op.translation[1]]);
  // The special elements: the fixed sets of every operation and lattice translation that meet the cell.
  const elements: Element[] = [];
  for (const op of ops) {
    if (op.matrix[0][0] === 1 && op.matrix[0][1] === 0 && op.matrix[1][0] === 0 && op.matrix[1][1] === 1) continue;
    for (const tx of [-1, 0, 1]) {
      for (const ty of [-1, 0, 1]) {
        const e = fixedSet(op, [tx, ty]);
        if (e && !elements.some((x) => sameElement(x, e))) elements.push(e);
      }
    }
  }
  // Their orbits are the special Wyckoff positions; each with its site-symmetry group.
  const orbits: Element[][] = [];
  for (const e of elements) {
    if (orbits.some((o) => o.some((x) => sameElement(x, e)))) continue;
    const orbit: Element[] = [];
    for (const op of ops) {
      const im = image(op, e);
      if (!orbit.some((x) => sameElement(x, im))) orbit.push(im);
    }
    orbits.push(orbit);
  }
  const positions = orbits.map((orbit) => {
    const site = ops.filter((op) => fixes(op, orbit[0]));
    const multiplicity = ops.length / site.length;
    let representative: Element;
    if (orbit[0].kind === 'point') {
      const printed = PRINTED_REPRESENTATIVES[key as keyof typeof PRINTED_REPRESENTATIVES]?.map(
        (s) =>
          s.split(',').map((c) => (c.includes('/') ? r(+c.split('/')[0], +c.split('/')[1]) : r(+c))) as unknown as Vec,
      );
      const listed = printed?.find((p) => orbit.some((x) => vecEqual(vecMod1(x.point), p)));
      representative = listed
        ? { kind: 'point', point: listed }
        : [...orbit].sort((a, b) => cmp(a.point[1], b.point[1]) || cmp(a.point[0], b.point[0]))[0];
    } else {
      representative = [...orbit].sort((a, b) =>
        compareKeys(lineKey(a as Element & { kind: 'line' }), lineKey(b as Element & { kind: 'line' })),
      )[0];
    }
    const siteOfRepresentative = ops.filter((op) => fixes(op, representative));
    return { orbit, representative, multiplicity, site: siteOfRepresentative };
  });
  // Letters: multiplicity ascending, points before lines, then points by their lowest (x, y) and
  // lines by `lineKey`, each over the whole orbit.
  const orderKey = (p: (typeof positions)[number]): number[] => {
    if (p.representative.kind === 'point') {
      const low = [...p.orbit].sort((a, b) => cmp(a.point[0], b.point[0]) || cmp(a.point[1], b.point[1]))[0];
      return [p.multiplicity, 0, toNumber(low.point[0]), toNumber(low.point[1]), 0, 0];
    }
    const low = [...p.orbit].map((x) => lineKey(x as Element & { kind: 'line' })).sort(compareKeys)[0];
    return [p.multiplicity, 1, ...low];
  };
  positions.sort((a, b) => compareKeys(orderKey(a), orderKey(b)));
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const rows: PlaneWyckoffRow[] = positions.map((p, i) => {
    const param = parametrization(p.representative);
    // The images under the operations of the (0,0)+ set, an image left out if it is one before it
    // shifted by a centring translation.
    const images: ExactOperation[] = [];
    for (const op of ownOps) {
      const im = composeMod(op, param);
      const duplicate = images.some((x) =>
        centringVectors.some(
          (c) =>
            formatOperation({
              matrix: x.matrix,
              translation: vecMod1([add(x.translation[0], c[0]), add(x.translation[1], c[1])]),
            }) === formatOperation(im),
        ),
      );
      if (!duplicate) images.push(im);
    }
    const coordinates = images.map((x) => formatOperation(x));
    return [p.multiplicity, letters[i], orientedSymbol(entry.system, p.site), coordinates];
  });
  const general: PlaneWyckoffRow = [
    ops.length,
    letters[positions.length],
    '1',
    ownOps.map((op) => formatOperation(op)),
  ];
  const result = deepFreeze([general, ...rows.reverse()]);
  cache.set(key, result);
  return result;
}
