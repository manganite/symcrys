/**
 * The Wyckoff positions and edge forms of the ten plane point groups, computed: the positions of
 * the directions in the plane with their coordinate doublets, and for each position its edge forms,
 * the crystal forms of a two-dimensional crystal (basic form first, then a limiting form). The point
 * at the origin and the point forms, which concern molecules, are left out, as for the crystal
 * classes. The names of the kinds of edge forms are vocabulary; everything else follows from the
 * operations (docs/conventions.md, "Positions and edge forms of the plane point groups"). Compared with ITA (6th ed., 2016), Table
 * 3.2.3.1, pp. 742–744, by planePointGroupForms.reference.test.ts.
 */

import { deepFreeze } from '../freeze.js';
import { gcd } from '../integers.js';
import { parseOperation } from './affine.js';
import {
  PLANE_POINT_GROUP_KEYS,
  planePointGroupOperations,
  planePointGroupSystem,
  symmorphicPlaneGroup,
  type PlanePointGroupKey,
} from './planePointGroups.js';
import { planeWyckoffRows } from './planeWyckoff.js';

/**
 * A kind of edge form, the crystal form of a two-dimensional crystal: its usual English name in lower
 * case, words joined by `-` (`'pair-of-parallel-edges'`, `'ditetragon'`).
 */
export type CrystalFormTypeKey =
  | 'single-edge'
  | 'pair-of-parallel-edges'
  | 'pair-of-edges'
  | 'rhomb'
  | 'square'
  | 'ditetragon'
  | 'trigon'
  | 'ditrigon'
  | 'hexagon'
  | 'dihexagon';

/** A kind of edge form: its usual English name and its number of edges. */
export interface CrystalFormType {
  /** The usual English name, e.g. `Pair of parallel edges`, `Ditetragon`. */
  readonly name: string;
  /** The number of edges. */
  readonly edges: number;
}

/** The ten kinds of edge forms, by key, in the order in which they first occur among the point groups. */
export const CRYSTAL_FORM_TYPES: Readonly<Record<CrystalFormTypeKey, CrystalFormType>> = Object.freeze({
  'single-edge': Object.freeze({ name: 'Single edge', edges: 1 }),
  'pair-of-parallel-edges': Object.freeze({ name: 'Pair of parallel edges', edges: 2 }),
  'pair-of-edges': Object.freeze({ name: 'Pair of edges', edges: 2 }),
  rhomb: Object.freeze({ name: 'Rhomb', edges: 4 }),
  square: Object.freeze({ name: 'Square', edges: 4 }),
  ditetragon: Object.freeze({ name: 'Ditetragon', edges: 8 }),
  trigon: Object.freeze({ name: 'Trigon', edges: 3 }),
  ditrigon: Object.freeze({ name: 'Ditrigon', edges: 6 }),
  hexagon: Object.freeze({ name: 'Hexagon', edges: 6 }),
  dihexagon: Object.freeze({ name: 'Dihexagon', edges: 12 }),
});

/** An edge form of a position: basic or limiting, its kind, and its first edge. */
type FormRow = readonly [basic: boolean, type: CrystalFormTypeKey, millerIndices: string];

/**
 * A position: letter, multiplicity, oriented site symmetry, coordinate doublets, its edge forms, and
 * the indices of the operations that fix the first edge of its basic form.
 */
type PositionRow = readonly [
  letter: string,
  multiplicity: number,
  siteSymmetry: string,
  coordinates: readonly string[],
  forms: readonly FormRow[],
  siteOperations: readonly number[],
];

/**
 * The kind of an edge form by its number of edges and whether it is regular, that is, whether its
 * edges are permuted cyclically by a rotation of the lattice through 360°/n (for one edge always,
 * for two edges if they are parallel).
 */
const FORM_TYPE_OF: Readonly<Record<string, CrystalFormTypeKey>> = {
  '1 regular': 'single-edge',
  '2 regular': 'pair-of-parallel-edges',
  '2': 'pair-of-edges',
  '3 regular': 'trigon',
  '4 regular': 'square',
  '4': 'rhomb',
  '6 regular': 'hexagon',
  '6': 'ditrigon',
  '8': 'ditetragon',
  '12': 'dihexagon',
};

// General values of h and k, so that only the operations of the site symmetry fix the edge.
const GENERAL_EDGE: readonly [number, number] = [5, 2];

type Edge = readonly [number, number];
type Matrix = readonly (readonly number[])[];

/** The image of the edge (h k) under W: (h k)·W⁻¹; over a group the set of images is that of (h k)·W. */
const edgeImage = (e: Edge, w: Matrix): Edge => [e[0] * w[0][0] + e[1] * w[1][0], e[0] * w[0][1] + e[1] * w[1][1]];
const sameEdge = (a: Edge, b: Edge): boolean => a[0] === b[0] && a[1] === b[1];
const edgeKey = (e: Edge): string => `${e[0]},${e[1]}`;

/** The edges of the form of the edge `e` under the operations, each once. */
function edgeOrbit(e: Edge, ops: readonly Matrix[]): Edge[] {
  const orbit: Edge[] = [];
  for (const w of ops) {
    const im = edgeImage(e, w);
    if (!orbit.some((x) => sameEdge(x, im))) orbit.push(im);
  }
  return orbit;
}

/** The operations that fix the edge `e`, by index. */
const edgeStabiliser = (e: Edge, ops: readonly Matrix[]): number[] =>
  ops.flatMap((w, i) => (sameEdge(edgeImage(e, w), e) ? [i] : []));

/** The kind of the form of the edge `e`: its number of edges, and whether a rotation of the holohedry of that order permutes them. */
function formType(e: Edge, ops: readonly Matrix[], holohedry: readonly Matrix[]): CrystalFormTypeKey {
  const orbit = edgeOrbit(e, ops);
  const n = orbit.length;
  const order = (w: Matrix): number => {
    let m = w;
    for (let k = 1; k <= 6; k++) {
      if (m[0][0] === 1 && m[0][1] === 0 && m[1][0] === 0 && m[1][1] === 1) return k;
      m = [0, 1].map((i) => [0, 1].map((j) => m[i][0] * w[0][j] + m[i][1] * w[1][j]));
    }
    return 0;
  };
  const regular = holohedry.some(
    (w) =>
      w[0][0] * w[1][1] - w[0][1] * w[1][0] === 1 &&
      order(w) === n &&
      orbit.every((x) => orbit.some((y) => sameEdge(edgeImage(x, w), y))),
  );
  const type = FORM_TYPE_OF[regular ? `${n} regular` : String(n)];
  if (!type) throw new Error(`No kind of edge form has ${n} edges`);
  return type;
}

/**
 * The edge that represents a set of edges: of those with h ≥ 0 and k ≥ 0 the one with the greatest
 * h (`1,0` before `0,1`).
 */
function firstEdge(edges: readonly Edge[]): Edge {
  const first = edges.filter((e) => e[0] >= 0 && e[1] >= 0).sort((a, b) => b[0] - a[0])[0];
  if (!first) throw new Error(`No edge with h, k ≥ 0 among ${edges.map(edgeKey).join('; ')}`);
  return first;
}

/** Primitive edges with indices up to 2: enough to meet every mirror line of a plane lattice. */
const CANDIDATE_EDGES: readonly Edge[] = [-2, -1, 0, 1, 2]
  .flatMap((h) => [-2, -1, 0, 1, 2].map((k) => [h, k] as Edge))
  .filter(([h, k]) => (h !== 0 || k !== 0) && gcd(Math.abs(h), Math.abs(k)) === 1);

/** The point group of the lattice of a crystal system: the plane point group of that system with the most operations. */
function holohedryOperations(key: PlanePointGroupKey): Matrix[] {
  const system = planePointGroupSystem(key);
  const keys = PLANE_POINT_GROUP_KEYS.filter((k) => planePointGroupSystem(k) === system);
  const top = keys.reduce((a, b) =>
    planePointGroupOperations(b).length > planePointGroupOperations(a).length ? b : a,
  );
  return planePointGroupOperations(top).map((op) => op.matrix);
}

const positionsCache = new Map<string, readonly PositionRow[]>();

/**
 * The positions of a point group in a setting with their edge forms, general position first.
 *
 * - The positions are those of the symmorphic plane group of the setting that consist of lines
 *   through the origin, in their order, with the letters counted again from a; their coordinate
 *   doublets and oriented site-symmetry symbols are those of the plane group. The point at the
 *   origin is left out.
 * - The edge of a special position is fixed by the operations that fix one of its directions, and
 *   is the first (`firstEdge`) of the edges with such a stabiliser; the general position has the
 *   edge `h,k` (`h,k,i` in the hexagonal system).
 * - A limiting form of the general position is the form of an edge with trivial stabiliser in the
 *   group that is fixed by a mirror of the lattice and has another kind than the general form.
 */
export function planePointGroupPositionRows(key: PlanePointGroupKey, setting: number): readonly PositionRow[] {
  const id = `${key} ${String(setting)}`;
  const cached = positionsCache.get(id);
  if (cached) return cached;
  const ops = planePointGroupOperations(key, setting).map((op) => op.matrix);
  const holohedry = holohedryOperations(key);
  const hexagonal = planePointGroupSystem(key) === 'hexagonal';
  const notation = (e: Edge): string => (hexagonal ? `${edgeKey(e)},${-(e[0] + e[1]) + 0}` : edgeKey(e));
  const rows = planeWyckoffRows(symmorphicPlaneGroup(key, setting));
  // The plane group lists its special positions from the last letter; here from a.
  const lines = [...rows.slice(1)].reverse().filter(([, , , coordinates]) => {
    const op = parseOperation(coordinates[0]);
    const free = op.matrix.flat().some((x) => x !== 0);
    return free && op.translation.every((x) => x[0] === 0);
  });
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const general = rows[0];
  const generalType = formType(GENERAL_EDGE, ops, holohedry);
  // Limiting forms: one per orbit of the candidate edges.
  const limiting: FormRow[] = [];
  const seen: Edge[] = [];
  for (const e of CANDIDATE_EDGES) {
    if (seen.some((x) => sameEdge(x, e))) continue;
    if (edgeStabiliser(e, ops).length !== 1 || edgeStabiliser(e, holohedry).length === 1) continue;
    const orbit = edgeOrbit(e, ops);
    seen.push(...orbit);
    const type = formType(e, ops, holohedry);
    if (type !== generalType) limiting.push([false, type, notation(firstEdge(orbit))]);
  }
  const result: PositionRow[] = [
    [
      letters[lines.length],
      general[0],
      general[2],
      general[3],
      [[true, generalType, hexagonal ? 'h,k,i' : 'h,k'], ...limiting],
      [0],
    ],
  ];
  // The special positions from a; reversed below into the order of the plane group, last letter first.
  lines.forEach(([multiplicity, , siteSymmetry, coordinates], i) => {
    const direction = parseOperation(coordinates[0]).matrix.map((row) => row[0] + row[1]);
    const site = ops.flatMap((w, j) =>
      [0, 1].every((r) => w[r][0] * direction[0] + w[r][1] * direction[1] === direction[r]) ? [j] : [],
    );
    // The edges fixed by the stabiliser of the first direction, and their images: the stabiliser of
    // g·e is g·stab(e)·g⁻¹, so these are the edges fixed by the stabiliser of some direction.
    const edges = CANDIDATE_EDGES.filter((e) => edgeStabiliser(e, ops).join() === site.join()).flatMap((e) =>
      edgeOrbit(e, ops),
    );
    const e = firstEdge(edges);
    const type = formType(e, ops, holohedry);
    if (CRYSTAL_FORM_TYPES[type].edges !== multiplicity) {
      throw new Error(
        `Plane point group ${key}: the form of ${notation(e)} does not have the multiplicity ${multiplicity}`,
      );
    }
    result.push([
      letters[i],
      multiplicity,
      siteSymmetry,
      coordinates,
      [[true, type, notation(e)]],
      edgeStabiliser(e, ops),
    ]);
  });
  const ordered = [result[0], ...result.slice(1).reverse()];
  const frozen = deepFreeze(ordered);
  positionsCache.set(id, frozen);
  return frozen;
}
