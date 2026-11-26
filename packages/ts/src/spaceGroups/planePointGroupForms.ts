/**
 * The Wyckoff positions and edge forms of the ten plane point groups: the positions of the
 * directions in the plane with their coordinate doublets, and for each position its edge forms,
 * the crystal forms of a two-dimensional crystal (basic form first, then a limiting form). The point
 * at the origin and the point forms, which concern molecules, are left out, as for the crystal
 * classes. Source: ITA (6th ed., 2016), Table 3.2.3.1, pp. 742–744, transcribed in
 * references/itc/vol-a-table-3.2.3.1.md and compared with it by planePointGroupForms.reference.test.ts.
 */

import { planePointGroupOperations, planePointGroupSymbol, type PlanePointGroupKey } from './planePointGroups.js';

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

/** A position: letter, multiplicity, oriented site symmetry, coordinate doublets, and its edge forms. */
type PositionRow = readonly [
  letter: string,
  multiplicity: number,
  siteSymmetry: string,
  coordinates: readonly string[],
  forms: readonly FormRow[],
];

/**
 * The positions of each point group in each orientation, by the symbol of the orientation (`3m1`,
 * `31m` for the two of 3m), general position first. Source: ITA (2016), Table 3.2.3.1, pp. 742–744.
 */
export const PLANE_POINT_GROUP_POSITIONS: Readonly<Record<string, readonly PositionRow[]>> = {
  '1': [['a', 1, '1', ['x,y'], [[true, 'single-edge', 'h,k']]]],
  '2': [['a', 2, '1', ['x,y', '-x,-y'], [[true, 'pair-of-parallel-edges', 'h,k']]]],
  m: [
    [
      'b',
      2,
      '1',
      ['x,y', '-x,y'],
      [
        [true, 'pair-of-edges', 'h,k'],
        [false, 'pair-of-parallel-edges', '1,0'],
      ],
    ],
    ['a', 1, '.m.', ['0,y'], [[true, 'single-edge', '0,1']]],
  ],
  '2mm': [
    ['c', 4, '1', ['x,y', '-x,-y', '-x,y', 'x,-y'], [[true, 'rhomb', 'h,k']]],
    ['b', 2, '.m.', ['0,y', '0,-y'], [[true, 'pair-of-parallel-edges', '0,1']]],
    ['a', 2, '..m', ['x,0', '-x,0'], [[true, 'pair-of-parallel-edges', '1,0']]],
  ],
  '4': [['a', 4, '1', ['x,y', '-x,-y', '-y,x', 'y,-x'], [[true, 'square', 'h,k']]]],
  '4mm': [
    ['c', 8, '1', ['x,y', '-x,-y', '-y,x', 'y,-x', '-x,y', 'x,-y', 'y,x', '-y,-x'], [[true, 'ditetragon', 'h,k']]],
    ['b', 4, '..m', ['x,x', '-x,-x', '-x,x', 'x,-x'], [[true, 'square', '1,1']]],
    ['a', 4, '.m.', ['x,0', '-x,0', '0,x', '0,-x'], [[true, 'square', '1,0']]],
  ],
  '3': [['a', 3, '1', ['x,y', '-y,x-y', '-x+y,-x'], [[true, 'trigon', 'h,k,i']]]],
  '3m1': [
    [
      'b',
      6,
      '1',
      ['x,y', '-y,x-y', '-x+y,-x', '-y,-x', '-x+y,y', 'x,x-y'],
      [
        [true, 'ditrigon', 'h,k,i'],
        [false, 'hexagon', '1,1,-2'],
      ],
    ],
    ['a', 3, '.m.', ['x,-x', 'x,2x', '-2x,-x'], [[true, 'trigon', '1,0,-1']]],
  ],
  '31m': [
    [
      'b',
      6,
      '1',
      ['x,y', '-y,x-y', '-x+y,-x', 'y,x', 'x-y,-y', '-x,-x+y'],
      [
        [true, 'ditrigon', 'h,k,i'],
        [false, 'hexagon', '1,0,-1'],
      ],
    ],
    ['a', 3, '..m', ['x,0', '0,x', '-x,-x'], [[true, 'trigon', '1,1,-2']]],
  ],
  '6': [['a', 6, '1', ['x,y', '-y,x-y', '-x+y,-x', '-x,-y', 'y,-x+y', 'x-y,x'], [[true, 'hexagon', 'h,k,i']]]],
  '6mm': [
    [
      'c',
      12,
      '1',
      ['x,y', '-y,x-y', '-x+y,-x', '-x,-y', 'y,-x+y', 'x-y,x', '-y,-x', '-x+y,y', 'x,x-y', 'y,x', 'x-y,-y', '-x,-x+y'],
      [[true, 'dihexagon', 'h,k,i']],
    ],
    ['b', 6, '.m.', ['x,-x', 'x,2x', '-2x,-x', '-x,x', '-x,-2x', '2x,x'], [[true, 'hexagon', '1,0,-1']]],
    ['a', 6, '..m', ['x,0', '0,x', '-x,-x', '-x,0', '0,-x', 'x,x'], [[true, 'hexagon', '1,1,-2']]],
  ],
};

/** The stored positions of a point group in a setting. */
export function planePointGroupPositionRows(key: PlanePointGroupKey, setting: number): readonly PositionRow[] {
  const rows = PLANE_POINT_GROUP_POSITIONS[planePointGroupSymbol(key, setting)];
  if (!rows) throw new Error(`No positions for the plane point group ${key}, setting ${setting}`);
  return rows;
}

// General values of h and k, so that only the operations of the site symmetry fix the edge.
const VALUES: Readonly<Record<string, number>> = { h: 5, k: 2 };

/** One index of the usual notation as a number: `h`, `-k`, `0`, `1`, `-2`. */
function indexValue(text: string): number {
  const m = /^(-?)(\d*)([hk]?)$/.exec(text.trim());
  if (!m || (!m[2] && !m[3])) throw new Error(`Unreadable Miller index: ${text}`);
  return (m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : 1) * (m[3] ? VALUES[m[3]] : 1);
}

/**
 * The indices of the operations that fix the first edge of a position, (h k)·W⁻¹ = (h k), its site
 * symmetry; for the hexagonal groups the third index i = −(h + k) follows from the first two.
 */
export function planeSiteSymmetryOperations(key: PlanePointGroupKey, setting: number, millerIndices: string): number[] {
  const e = millerIndices.split(',').slice(0, 2).map(indexValue);
  return planePointGroupOperations(key, setting)
    .map((op, i) => [i, [0, 1].map((j) => e[0] * op.matrix[0][j] + e[1] * op.matrix[1][j])] as const)
    .filter(([, f]) => f[0] === e[0] && f[1] === e[1])
    .map(([i]) => i);
}
