/**
 * The Wyckoff positions of the crystal classes for directions, computed from the operations of a
 * setting: the positions are the orbits of the lines and planes through the origin that are the
 * fixed spaces of their stabilisers; multiplicity, oriented site-symmetry symbol, coordinate
 * triplets and first face follow from them. Where ITA's choice follows no rule, the choice is
 * named convention data below (docs/conventions.md, "Site symmetry and Wyckoff positions").
 * Compared with ITA (6th ed., 2016), Table 3.2.3.2, pp. 745–769, by wyckoff.reference.test.ts.
 */

import { deepFreeze } from '../freeze.js';
import { gcd } from '../integers.js';
import { crystalFamily } from '../lattice.js';
import { formatOperation } from '../spaceGroups/affine.js';
import { classData, classSettingData, settingLatticeOperations, settingSymmetryDirections } from './classData.js';
import type { PointGroupKey } from './keys.js';

/** [letter, multiplicity, oriented site symmetry, coordinate triplets, Miller indices of the first face]. */
export type WyckoffRow = readonly [string, number, string, readonly string[], string];

/**
 * Convention data: the order of the Wyckoff letters among positions of equal multiplicity and
 * equal dimension, for which print states no rule (ITA 2016 § 2.1.3.11 (ii), p. 162: the letter
 * "is merely a coding scheme"; § 3.2.1.2.3, p. 727), as the oriented site-symmetry symbols of
 * those positions in letter order, by the short symbol of the setting.
 */
export const LETTER_ORDER: Readonly<Record<string, readonly string[]>> = deepFreeze({
  '222': ['2..', '.2.', '..2'],
  mm2: ['.m.', 'm..'],
  mmm: ['2mm', 'm2m', 'mm2', 'm..', '.m.', '..m'],
  '422': ['..2', '.2.'],
  '4mm': ['..m', '.m.'],
  '4/mmm': ['m.m2', 'm2m.', 'm..', '..m', '.m.'],
  '622': ['.2.', '..2'],
  '6mm': ['..m', '.m.'],
  '-6m2': ['.m.', 'm..'],
  '-62m': ['..m', 'm..'],
  '6/mmm': ['m2m', 'mm2', '..m', '.m.', 'm..'],
  'm-3m': ['m..', '..m'],
});

/**
 * Convention data: the first representatives of the positions where ITA prints another element
 * of the orbit than the rule gives (`firstElement`), by the short symbol of the setting.
 */
export const FIRST_POINT_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = deepFreeze({
  '32': ['x,-x,0'],
  '-3m': ['x,-x,0'],
  '6/mmm': ['x,2x,0', 'x,2x,z'],
  'm-3': ['0,y,z'],
  '432': ['0,y,y'],
  '-43m': ['x,x,z'],
  'm-3m': ['0,y,y', '0,y,z', 'x,x,z'],
});

/** Convention data: the first faces where ITA prints another face of the orbit than the rule gives. */
export const FIRST_FACE_EXCEPTIONS: Readonly<Record<string, readonly string[]>> = deepFreeze({
  '32': ['0,1,-1'],
  '-3m': ['0,1,-1'],
});

export type Vec = readonly number[];
export type Mat = readonly Vec[];

export const apply = (w: Mat, v: Vec): number[] => w.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
/** h·W, the face (row vector) h carried by the transpose; over a group the same set as h·W⁻¹. */
export const applyToFace = (w: Mat, h: Vec): number[] =>
  [0, 1, 2].map((j) => h[0] * w[0][j] + h[1] * w[1][j] + h[2] * w[2][j]);

/** A primitive integer vector: divided by the gcd of its components. */
export function primitive(v: Vec): number[] {
  const g = v.reduce((a, x) => gcd(a, x), 0);
  return g === 0 ? [...v] : v.map((x) => x / g + 0);
}

/**
 * The reduced row echelon form of the span of integer vectors, each row scaled to a primitive
 * integer vector with a positive pivot: the canonical form of a subspace, and the notation of ITA's
 * first representatives (`x,-x,z` is the span of (1,−1,0) and (0,0,1)).
 */
export function echelon(vectors: readonly Vec[]): { rows: number[][]; pivots: number[] } {
  // Fraction-free elimination on integers, then each row made primitive.
  const m = vectors.map((v) => [...v]).filter((v) => v.some((x) => x !== 0));
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < 3 && r < m.length; c++) {
    const p = m.findIndex((row, i) => i >= r && row[c] !== 0);
    if (p < 0) continue;
    [m[r], m[p]] = [m[p], m[r]];
    if (m[r][c] < 0) m[r] = m[r].map((x) => -x);
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c] === 0) continue;
      const a = m[r][c];
      const b = m[i][c];
      m[i] = primitive(m[i].map((x, j) => a * x - b * m[r][j]));
    }
    m[r] = primitive(m[r]);
    pivots.push(c);
    r++;
  }
  return { rows: m.slice(0, r), pivots };
}

export const keyOf = (vectors: readonly Vec[]): string => JSON.stringify(echelon(vectors).rows);

/** A basis of the integer vectors v with A·v = 0 for the given rows A. */
export function nullspace(rows: readonly Vec[]): number[][] {
  const { rows: e, pivots } = echelon(rows);
  const free = [0, 1, 2].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    // v[f] = L, v[pivot p] = −e[i][f]·L / e[i][p] with L the lcm of the pivots.
    const l = e.reduce((acc, row, i) => (acc * row[pivots[i]]) / gcd(acc, row[pivots[i]]), 1);
    const v = [0, 0, 0];
    v[f] = l;
    e.forEach((row, i) => (v[pivots[i]] = (-row[f] * l) / row[pivots[i]]));
    return primitive(v);
  });
}

const minusIdentity = (w: Mat): number[][] => w.map((row, i) => row.map((x, j) => x - (i === j ? 1 : 0)));
const transposeMinusIdentity = (w: Mat): number[][] =>
  [0, 1, 2].map((i) => [0, 1, 2].map((j) => w[j][i] - (i === j ? 1 : 0)));

/** The indices of the operations that fix every vector of a basis. */
export const stabiliser = (ops: readonly Mat[], basis: readonly Vec[]): number[] =>
  ops.flatMap((w, i) => (basis.every((v) => apply(w, v).every((x, k) => x === v[k])) ? [i] : []));

/**
 * The order in which a rule picks the first element of an orbit of subspaces (points and faces):
 * by their reduced row echelon form, the smallest greatest coefficient, then the fewest negative
 * coefficients, then the fewest nonzero ones, then the earliest pivots, then the greatest
 * coefficients in reading order.
 */
export function pointRank(vectors: readonly Vec[]): number[] {
  const { rows, pivots } = echelon(vectors);
  const flat = rows.flat();
  return [
    Math.max(...flat.map(Math.abs)),
    flat.filter((x) => x < 0).length,
    flat.filter((x) => x !== 0).length,
    ...pivots,
    ...flat.map((x) => -x),
  ];
}

/**
 * The order of the rule for faces with hexagonal or rhombohedral axes: smallest greatest
 * coefficient, then the greatest coefficients in reading order.
 */
export function faceRank(vectors: readonly Vec[]): number[] {
  const flat = echelon(vectors).rows.flat();
  return [Math.max(...flat.map(Math.abs)), ...flat.map((x) => -x)];
}

export const compareRanks = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

/** The subspace spanned by a printed pattern (`x,2x,z`, `h,h,l`, `0,1,-1`): the span of its columns, or of the vector. */
export function patternSpan(pattern: string, letters: string): number[][] {
  const parts = pattern.split(',');
  const coefficient = (text: string, letter: string): number => {
    const m = new RegExp(`(^|[+-])(\\d*)${letter}`).exec(text);
    if (!m) return 0;
    return (m[1] === '-' ? -1 : 1) * (m[2] ? Number(m[2]) : 1);
  };
  if (!/[a-z]/.test(pattern)) return [parts.map(Number)];
  return [...letters].map((letter) => parts.map((p) => coefficient(p, letter))).filter((v) => v.some((x) => x !== 0));
}

/** The orbit of a subspace under the operations (images of its basis), each once, by canonical key. */
export function orbit(ops: readonly Mat[], basis: readonly Vec[], image: (w: Mat, v: Vec) => number[]): number[][][] {
  const out: number[][][] = [];
  const keys = new Set<string>();
  for (const w of ops) {
    const im = basis.map((v) => image(w, v));
    const k = keyOf(im);
    if (!keys.has(k)) {
      keys.add(k);
      out.push(echelon(im).rows);
    }
  }
  return out;
}

/**
 * The coordinate matrix of a subspace from its echelon form: column p (a pivot) holds the row with
 * pivot p, so that the coordinates are linear in the parameters named after the pivots (x, y, z).
 */
function coordinateMatrix(basis: readonly Vec[]): number[][] {
  const { rows, pivots } = echelon(basis);
  const m = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  rows.forEach((row, r) => [0, 1, 2].forEach((i) => (m[i][pivots[r]] = row[i])));
  return m;
}

const ZERO_TRANSLATION = [
  [0, 1],
  [0, 1],
  [0, 1],
] as const;

/** A triplet in ITA's notation for the coordinate matrix M (`x,-x,z`, `-x+y,-x,0`). */
const formatTriplet = (m: Mat): string => formatOperation({ matrix: m, translation: [...ZERO_TRANSLATION] });

/**
 * A face in ITA's notation: numbers for a single face, otherwise the indices as linear forms in the
 * parameters named after the pivots (h, k, l); with hexagonal axes Bravais–Miller indices with
 * i = −(h + k), written `i` where it is −h − k of two parameters.
 */
export function formatFace(basis: readonly Vec[], bravaisMiller: boolean): string {
  const { rows, pivots } = echelon(basis);
  const names = 'hkl';
  // components[j]: coefficients of the parameters in index j
  const components = [0, 1, 2].map((j) => rows.map((row) => row[j]));
  // A sum with its positive terms first, as ITA writes indices (`2k-h`, `h,k,-h-k`).
  const linear = (coefficients: readonly number[]): string => {
    const terms = coefficients
      .map((c, r) => ({ c, name: names[pivots[r]] }))
      .filter(({ c }) => c !== 0)
      .sort((a, b) => Number(b.c > 0) - Number(a.c > 0));
    let s = '';
    for (const { c, name } of terms) {
      const magnitude = Math.abs(c) === 1 ? name : `${Math.abs(c)}${name}`;
      s += c < 0 ? `-${magnitude}` : s === '' ? magnitude : `+${magnitude}`;
    }
    return s === '' ? '0' : s;
  };
  const single = rows.length === 1;
  const text = (coefficients: readonly number[]): string =>
    single ? String(coefficients[0] + 0) : linear(coefficients);
  const out = components.map(text);
  if (!bravaisMiller) return out.join(',');
  const i = components[0].map((c, r) => -(c + components[1][r]));
  const both =
    !single && pivots[0] === 0 && pivots[1] === 1 && i[0] === -1 && i[1] === -1 && i.slice(2).every((c) => c === 0);
  return [out[0], out[1], both ? 'i' : text(i), out[2]].join(',');
}

/**
 * The character of a symmetry direction d in an oriented symbol: the order n of the rotations about
 * d in the site group, `m` for a reflection with normal d, or '' for neither.
 */
function directionCharacter(site: readonly Mat[], d: Vec): string {
  const det = (w: Mat): number =>
    w[0][0] * (w[1][1] * w[2][2] - w[1][2] * w[2][1]) -
    w[0][1] * (w[1][0] * w[2][2] - w[1][2] * w[2][0]) +
    w[0][2] * (w[1][0] * w[2][1] - w[1][1] * w[2][0]);
  const fixes = (w: Mat): boolean => apply(w, d).every((x, k) => x === d[k]);
  const n = site.filter((w) => det(w) === 1 && fixes(w)).length;
  if (n >= 2) return String(n);
  if (site.some((w) => det(w) === -1 && apply(w, d).every((x, k) => x === -d[k]))) return 'm';
  return '';
}

/**
 * The oriented site-symmetry symbol (ITA 2016 § 2.1.3.12, p. 163): per set of symmetry directions
 * one character per orbit of its directions under the site group that carries an element, in the
 * order of the directions, or a dot if none does; `1` for the trivial group. Monoclinic symbols are
 * not oriented: `2` or `m`.
 */
function orientedSymbol(key: PointGroupKey, setting: number, site: readonly Mat[]): string {
  if (site.length === 1) return '1';
  if (crystalFamily(classData(key).crystalSystem) === 'monoclinic') {
    const w = site.find((x) => x.some((row, i) => row.some((v, j) => v !== (i === j ? 1 : 0))))!;
    return w[0][0] + w[1][1] + w[2][2] === -1 ? '2' : 'm';
  }
  const parallel = (a: Vec, b: Vec): boolean => keyOf([a]) === keyOf([b]);
  return settingSymmetryDirections(key, setting)
    .map((set) => {
      const seen: Vec[] = [];
      let chars = '';
      for (const d of set) {
        if (seen.some((x) => parallel(x, d))) continue;
        for (const w of site) seen.push(apply(w, d));
        chars += directionCharacter(site, d);
      }
      return chars === '' ? '.' : chars;
    })
    .join('');
}

interface Position {
  readonly dimension: number;
  readonly multiplicity: number;
  readonly orbit: readonly (readonly Vec[])[];
}

/** The special positions of directions: orbits of the subspaces V of dimension 1 or 2 with V = Fix(stab(V)). */
function specialPositions(ops: readonly Mat[]): Position[] {
  const candidates = new Map<string, number[][]>();
  const add = (equations: number[][]): void => {
    const basis = nullspace(equations);
    if (basis.length === 0 || basis.length === 3) return;
    const k = keyOf(basis);
    if (!candidates.has(k)) candidates.set(k, equations);
  };
  ops.forEach((w) => add(minusIdentity(w)));
  // Intersections, until no new subspace appears.
  let before: number;
  do {
    before = candidates.size;
    const list = [...candidates.values()];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) add([...list[i], ...list[j]]);
  } while (candidates.size !== before);
  const positions: Position[] = [];
  const done = new Set<string>();
  for (const equations of candidates.values()) {
    const basis = nullspace(equations);
    const k = keyOf(basis);
    if (done.has(k)) continue;
    const stab = stabiliser(ops, basis);
    if (keyOf(nullspace(stab.flatMap((i) => minusIdentity(ops[i])))) !== k) continue;
    const o = orbit(ops, basis, apply);
    for (const v of o) done.add(keyOf(v));
    positions.push({ dimension: basis.length, multiplicity: ops.length / stab.length, orbit: o });
  }
  return positions;
}

const cache = new Map<string, readonly WyckoffRow[]>();

/**
 * The Wyckoff positions of a setting of a crystal class for directions, general position first,
 * then by descending letter (the order of print); the origin is left out.
 *
 * - Letters: multiplicity ascending, then fewer free parameters, then `LETTER_ORDER`.
 * - First representative: the element of the orbit first by `pointRank`, or the one listed in
 *   `FIRST_POINT_EXCEPTIONS`; its coordinates are the images under the operations in their order,
 *   each once.
 * - First face: the face fixed by the site group of the first representative, the face normal to
 *   it; with hexagonal or rhombohedral axes, where ITA prints a face that in general lies on a
 *   conjugate element, the face of the orbit first by `faceRank`, or the one listed in
 *   `FIRST_FACE_EXCEPTIONS`.
 */
export function computedWyckoffRows(key: PointGroupKey, setting: number): readonly WyckoffRow[] {
  const id = `${key}#${setting}`;
  const cached = cache.get(id);
  if (cached) return cached;
  const result = wyckoffRowsWith(key, setting, CONVENTIONS);
  cache.set(id, result);
  return result;
}

/** The convention data of the Wyckoff positions, as `wyckoffRowsWith` takes them. */
export interface WyckoffConventions {
  readonly letterOrder: Readonly<Record<string, readonly string[]>>;
  readonly firstPoints: Readonly<Record<string, readonly string[]>>;
  readonly firstFaces: Readonly<Record<string, readonly string[]>>;
}

const CONVENTIONS: WyckoffConventions = {
  letterOrder: LETTER_ORDER,
  firstPoints: FIRST_POINT_EXCEPTIONS,
  firstFaces: FIRST_FACE_EXCEPTIONS,
};

/** `computedWyckoffRows` with the given convention data, uncached: the tests check that each entry is needed. */
export function wyckoffRowsWith(
  key: PointGroupKey,
  setting: number,
  conventions: WyckoffConventions,
): readonly WyckoffRow[] {
  const data = classSettingData(key, setting);
  const symbol = data.short;
  const ops = settingLatticeOperations(key, setting) as unknown as Mat[];
  const hexagonalFamily = crystalFamily(classData(key).crystalSystem) === 'hexagonal';
  const bravaisMiller = hexagonalFamily && data.axes !== 'rhombohedral';
  const pointExceptions = (conventions.firstPoints[symbol] ?? []).map((p) => keyOf(patternSpan(p, 'xyz')));
  const faceExceptions = (conventions.firstFaces[symbol] ?? []).map((p) => keyOf(patternSpan(p, 'hkl')));
  const used = new Set<string>();
  const rows = specialPositions(ops).map((p) => {
    const listed = p.orbit.find((v) => pointExceptions.includes(keyOf(v)));
    if (listed) used.add(keyOf(listed));
    const first = listed ?? [...p.orbit].sort((a, b) => compareRanks(pointRank(a), pointRank(b)))[0];
    const m = coordinateMatrix(first);
    const coordinates: string[] = [];
    for (const w of ops) {
      const t = formatTriplet(
        w.map((row) => [0, 1, 2].map((j) => row[0] * m[0][j] + row[1] * m[1][j] + row[2] * m[2][j])),
      );
      if (!coordinates.includes(t)) coordinates.push(t);
    }
    const siteIndices = stabiliser(ops, first);
    const site = siteIndices.map((i) => ops[i]);
    let face = nullspace(site.flatMap((w) => transposeMinusIdentity(w)));
    if (hexagonalFamily) {
      const faces = orbit(ops, face, applyToFace);
      const listedFace = faces.find((f) => faceExceptions.includes(keyOf(f)));
      if (listedFace) used.add(keyOf(listedFace));
      face = listedFace ?? [...faces].sort((a, b) => compareRanks(faceRank(a), faceRank(b)))[0];
    }
    return {
      multiplicity: p.multiplicity,
      dimension: p.dimension,
      siteSymmetry: orientedSymbol(key, setting, site),
      coordinates,
      face: formatFace(face, bravaisMiller),
    };
  });
  const listedCount = pointExceptions.length + faceExceptions.length;
  if (used.size !== listedCount) throw new Error(`A first representative listed for ${symbol} is in no orbit`);
  const order = conventions.letterOrder[symbol] ?? [];
  const tie = (s: string): number => order.indexOf(s);
  rows.sort(
    (a, b) => a.multiplicity - b.multiplicity || a.dimension - b.dimension || tie(a.siteSymmetry) - tie(b.siteSymmetry),
  );
  rows.forEach((r, i) => {
    const next = rows[i + 1];
    if (
      next &&
      next.multiplicity === r.multiplicity &&
      next.dimension === r.dimension &&
      (tie(r.siteSymmetry) < 0 || tie(r.siteSymmetry) === tie(next.siteSymmetry))
    ) {
      throw new Error(`Point group ${symbol}: no letter order for ${r.siteSymmetry} and ${next.siteSymmetry}`);
    }
  });
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const general: WyckoffRow = [
    letters[rows.length],
    ops.length,
    '1',
    ops.map((w) => formatTriplet(w)),
    bravaisMiller ? 'h,k,i,l' : 'h,k,l',
  ];
  const special: WyckoffRow[] = rows.map((r, i) => [letters[i], r.multiplicity, r.siteSymmetry, r.coordinates, r.face]);
  return deepFreeze([general, ...special.reverse()]);
}
