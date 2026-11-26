/**
 * The Wyckoff positions of the plane groups, computed from the group (docs/conventions.md, "Plane
 * groups", "Wyckoff positions"): a special position is the orbit of a rotation point or a mirror
 * line, its multiplicity the order of the group over that of the site-symmetry group, its oriented
 * site-symmetry symbol read along the symmetry directions of the lattice, its coordinates the
 * images of a first representative under the operations in their order. ITA's letters and first
 * representatives follow from rules, except two first representatives, kept as convention data.
 *
 * @remarks Two dimensions only: in the plane every special position is a rotation point or a mirror
 * line, the fixed set of one operation (cell.ts, `planeElements`), and a site symbol has only `m`
 * after the rotation. The space groups need the fixed spaces of site subgroups and the full
 * characters of the symbols.
 */

import { deepFreeze } from '../freeze.js';
import { gcd } from '../integers.js';
import {
  applyToPoint,
  compose,
  determinant,
  equalModLattice,
  formatOperation,
  reduceModLattice,
  type ExactOperation,
  type IntMatrix,
} from './affine.js';
import { planeElements } from './cell.js';
import { describePlaneOperation } from './describe.js';
import { centringOperations, planeGroupEntry, planeGroupOperations } from './planeGroups.js';
import type { PlaneSystem } from './planeGroupData.js';
import {
  add,
  isInteger,
  mod1,
  multiply,
  negate,
  parseRational,
  rational,
  subtract,
  toNumber,
  type Rational,
} from './rational.js';

/** [multiplicity, Wyckoff letter, oriented site symmetry, coordinates of the (0,0)+ set]. */
export type PlaneWyckoffRow = readonly [number, string, string, readonly string[]];

type Vec = readonly [Rational, Rational];
type Direction = readonly [number, number];

/** A special element of a plane group: a rotation point, or a mirror line through `point` along `direction`. */
type Element =
  | { readonly kind: 'point'; readonly point: Vec }
  | { readonly kind: 'line'; readonly point: Vec; readonly direction: Direction };
type Line = Element & { readonly kind: 'line' };

/**
 * The symmetry directions of the plane lattices after the rotation point, by set: convention data of
 * ITA (2016 Table 2.1.3.1, p. 151, "Two dimensions"), which fix the order of the positions of the
 * symbols; compared with the transcription by `planeWyckoff.reference.test.ts`.
 */
export const PLANE_SYMMETRY_DIRECTIONS: Readonly<Record<PlaneSystem, readonly (readonly Direction[])[]>> = deepFreeze({
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
});

/**
 * The first representative of a point position where ITA prints another point of the orbit than the
 * rule gives (the point lowest by y, then x, its coordinates taken in (−1/2, 1/2]): convention data,
 * as ITA typed its first representatives in by hand (2016 § 2.1.4, p. 173). Both are in c2mm: its
 * position b is the orbit {0,1/2; 1/2,0}, which p2gg b shares, and ITA prints 0,1/2 in one and 1/2,0
 * in the other, so no rule on the orbit gives both; its position c is printed 1/4,1/4.
 */
export const FIRST_REPRESENTATIVE_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = deepFreeze({
  c2mm: ['0,1/2', '1/4,1/4'],
});

const r = (n: number, d = 1): Rational => rational(n, d);
const cmp = (a: Rational, b: Rational): number => toNumber(a) - toNumber(b);
const vecMod1 = (v: readonly Rational[]): Vec => [mod1(v[0]), mod1(v[1])];
const sameMod1 = (a: readonly Rational[], b: readonly Rational[]): boolean =>
  isInteger(subtract(a[0], b[0])) && isInteger(subtract(a[1], b[1]));
/** A coordinate in (−1/2, 1/2]. */
const centred = (a: Rational): Rational => {
  const m = mod1(a);
  return toNumber(m) > 0.5 ? subtract(m, r(1)) : m;
};

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

/** cross(p, d) = p_x d_y − p_y d_x: two parallel lines with a primitive direction d are equal modulo the lattice exactly when it agrees modulo 1. */
const cross = (p: readonly Rational[], d: Direction): Rational =>
  subtract(multiply(p[0], r(d[1])), multiply(p[1], r(d[0])));

function sameElement(a: Element, b: Element): boolean {
  if (a.kind === 'point' && b.kind === 'point') return sameMod1(a.point, b.point);
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
  if (!sameMod1(applyToPoint(op, e.point), e.point)) return false;
  if (e.kind === 'point') return true;
  const d = applyLinear(op.matrix, e.direction);
  return d[0] === e.direction[0] && d[1] === e.direction[1];
}

/**
 * A line in ITA's form: the point with the coordinate of the free parameter 0, the other coordinate
 * in [0, 1). The parameter is named after the first non-zero component of the direction.
 *
 * @remarks For a direction whose first non-zero component is ±2 the constant is unique only modulo
 * 1/2; no such line is a first representative in the plane groups.
 */
function lineForm(e: Line): { point: Vec; pivot: 0 | 1 } {
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
function lineKey(e: Line): number[] {
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

/**
 * The element as an affine map of the parameters (x, y), to write its images as ITA does: a point is
 * constant; a line maps its parameter, named after the first non-zero component of its direction,
 * to point + parameter · direction.
 */
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
  const row = (i: number): number[] => (pivot === 0 ? [d[i], 0] : [0, d[i]]);
  return { matrix: [row(0), row(1)], translation: [point[0], point[1]] };
}

/** The oriented site-symmetry symbol of a site-symmetry group (ITA 2016 § 2.1.3.12, p. 163). */
function orientedSymbol(system: PlaneSystem, site: readonly ExactOperation[]): string {
  if (site.length === 1) return '1';
  const rotations = site.filter((op) => determinant(op.matrix) === 1).length;
  const normals = site
    .filter((op) => determinant(op.matrix) === -1)
    .map((op) => describePlaneOperation(op).axis as unknown as Direction);
  const parallel = (a: Direction, b: Direction): boolean => a[0] * b[1] - a[1] * b[0] === 0;
  const sets = PLANE_SYMMETRY_DIRECTIONS[system].map((set) => {
    // The directions of the set fall into orbits under the site group; one `m` per orbit that
    // carries a mirror normal to it, a dot if none does.
    const orbits: Direction[][] = [];
    for (const d of set) {
      if (orbits.some((o) => o.some((x) => parallel(x, d)))) continue;
      orbits.push(set.filter((x) => site.some((op) => parallel(applyLinear(op.matrix, d), x))));
    }
    const carrying = orbits.filter((o) => o.some((x) => normals.some((m) => parallel(m, x))));
    return carrying.length === 0 ? '.' : 'm'.repeat(carrying.length);
  });
  return [rotations === 1 ? '.' : String(rotations), ...sets].join('');
}

/** The special elements of a plane group: its rotation points and mirror lines, each once modulo the lattice and the centring. */
function specialElements(key: string): Element[] {
  const { rotationPoints, lines } = planeElements(key);
  return [
    ...rotationPoints.map((p): Element => ({ kind: 'point', point: [p.point[0], p.point[1]] })),
    ...lines
      .filter((l) => l.kind === 'mirror')
      .map((l): Element => ({ kind: 'line', point: [l.point[0], l.point[1]], direction: l.direction })),
  ];
}

const cache = new Map<string, readonly PlaneWyckoffRow[]>();

/**
 * The Wyckoff positions of a plane group in ITA's order (general position first, then the letters
 * downwards): multiplicity, letter, oriented site-symmetry symbol and the coordinates of the (0,0)+
 * set as ITA writes them.
 */
export function planeWyckoffRows(key: string | number): readonly PlaneWyckoffRow[] {
  const entry = planeGroupEntry(key);
  const cached = cache.get(entry.symbol);
  if (cached) return cached;
  const ops = planeGroupOperations(entry.symbol);
  const centrings = centringOperations(entry);
  const ownOps = ops.slice(0, ops.length / centrings.length);
  // The special Wyckoff positions: the orbits of the rotation points and mirror lines.
  const orbits: Element[][] = [];
  for (const e of specialElements(entry.symbol)) {
    if (orbits.some((o) => o.some((x) => sameElement(x, e)))) continue;
    const orbit: Element[] = [];
    for (const op of ops) {
      const im = image(op, e);
      if (!orbit.some((x) => sameElement(x, im))) orbit.push(im);
    }
    orbits.push(orbit);
  }
  const exceptions = (FIRST_REPRESENTATIVE_EXCEPTIONS[entry.symbol] ?? []).map(
    (s) => s.split(',').map(parseRational) as unknown as Vec,
  );
  const used = new Set<number>();
  const positions = orbits.map((orbit) => {
    let representative: Element;
    if (orbit[0].kind === 'point') {
      const listed = exceptions.findIndex((p) => orbit.some((x) => sameMod1(x.point, p)));
      if (listed >= 0) used.add(listed);
      representative =
        listed >= 0
          ? { kind: 'point', point: exceptions[listed] }
          : [...orbit].sort(
              (a, b) => cmp(centred(a.point[1]), centred(b.point[1])) || cmp(centred(a.point[0]), centred(b.point[0])),
            )[0];
    } else {
      representative = [...orbit].sort((a, b) => compareKeys(lineKey(a as Line), lineKey(b as Line)))[0];
    }
    const site = ops.filter((op) => fixes(op, representative));
    return { orbit, representative, multiplicity: ops.length / site.length, site };
  });
  if (used.size !== exceptions.length) {
    throw new Error(`A first representative listed for ${entry.symbol} is in no orbit`);
  }
  // Letters: multiplicity ascending, points before lines, then points by the point of their orbit
  // lowest by x, then y, and lines by the least `lineKey` over their orbit.
  const orderKey = (p: (typeof positions)[number]): number[] => {
    if (p.representative.kind === 'point') {
      const low = [...p.orbit].sort((a, b) => cmp(a.point[0], b.point[0]) || cmp(a.point[1], b.point[1]))[0];
      return [p.multiplicity, 0, toNumber(low.point[0]), toNumber(low.point[1]), 0, 0];
    }
    const low = p.orbit.map((x) => lineKey(x as Line)).sort(compareKeys)[0];
    return [p.multiplicity, 1, ...low];
  };
  positions.sort((a, b) => compareKeys(orderKey(a), orderKey(b)));
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const rows: PlaneWyckoffRow[] = positions.map((p, i) => {
    const param = parametrization(p.representative);
    // The images under the operations of the (0,0)+ set in their order, an image left out that
    // repeats one before it modulo the lattice and the centring (ITA 2016 § 2.1.3.11 (iv), p. 162).
    const images: ExactOperation[] = [];
    for (const op of ownOps) {
      const im = reduceModLattice(compose(op, param));
      if (!images.some((x) => centrings.some((c) => equalModLattice(compose(c, x), im)))) images.push(im);
    }
    return [p.multiplicity, letters[i], orientedSymbol(entry.system, p.site), images.map(formatOperation)];
  });
  const general: PlaneWyckoffRow = [ops.length, letters[positions.length], '1', ownOps.map(formatOperation)];
  const result = deepFreeze([general, ...rows.reverse()]);
  cache.set(entry.symbol, result);
  return result;
}
