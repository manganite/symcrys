/**
 * The data of the 17 plane groups (ITA 6th ed., 2016, Chapter 2.2, pp. 176–192, plane group n on
 * p. 175 + n): what cannot be computed from the group. Number and short symbol are vocabulary;
 * "Generators selected" (after the identity, the integer translations and the centring) and the
 * centring are the data the group is built from; the asymmetric unit is convention data (ITA's
 * choice, not unique by symmetry, § 2.1.3.8, pp. 159–160), held as ITA's inequalities. Everything
 * else is computed (planeGroups.ts, planeWyckoff.ts, cell.ts). The transcription
 * references/itc/vol-a-2016-plane-groups.md holds the printed pages, against which the reference
 * tests compare this file and the computed data; change this file only by transcription from print.
 *
 * Notation of generators and centring as in the transcription: a leading `-` is an overbar;
 * coordinates in the lattice basis a, b.
 */

/** An inequality a·x + b·y ≤ c in the lattice basis, with integer coefficients without a common factor. */
export type Inequality = readonly [a: number, b: number, c: number];

/** A crystal system of the plane, as ITA names it. */
export type PlaneSystem = 'oblique' | 'rectangular' | 'square' | 'hexagonal';

/** The stored data of one plane group. */
export interface PlaneGroupEntry {
  /** Number of the plane group, 1 to 17. */
  readonly number: number;
  /** Short Hermann–Mauguin symbol, e.g. `p2mg`. */
  readonly symbol: string;
  /**
   * The asymmetric unit as ITA's inequalities, in ITA's order: a double inequality gives one per
   * bound (0 ≤ x ≤ 1/2: −x ≤ 0, then 2x ≤ 1), a bound by a `min` one per argument.
   */
  readonly asymmetricUnit: readonly Inequality[];
  /** Centring translations besides (0,0): `['1/2,1/2']` for the c groups. */
  readonly centring: readonly string[];
  /** "Generators selected" as coordinate doublets, in printed order, after (1), the integer translations and the centring. */
  readonly generators: readonly string[];
}

/** The 17 plane groups in ITA's order. */
export const PLANE_GROUP_DATA: readonly PlaneGroupEntry[] = [
  {
    number: 1,
    symbol: 'p1',
    asymmetricUnit: [
      [-1, 0, 0],
      [1, 0, 1],
      [0, -1, 0],
      [0, 1, 1],
    ],
    centring: [],
    generators: [],
  },
  {
    number: 2,
    symbol: 'p2',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 1, 1],
    ],
    centring: [],
    generators: ['-x,-y'],
  },
  {
    number: 3,
    symbol: 'pm',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 1, 1],
    ],
    centring: [],
    generators: ['-x,y'],
  },
  {
    number: 4,
    symbol: 'pg',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 1, 1],
    ],
    centring: [],
    generators: ['-x,y+1/2'],
  },
  {
    number: 5,
    symbol: 'cm',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
    ],
    centring: ['1/2,1/2'],
    generators: ['-x,y'],
  },
  {
    number: 6,
    symbol: 'p2mm',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
    ],
    centring: [],
    generators: ['-x,-y', '-x,y'],
  },
  {
    number: 7,
    symbol: 'p2mg',
    asymmetricUnit: [
      [-1, 0, 0],
      [4, 0, 1],
      [0, -1, 0],
      [0, 1, 1],
    ],
    centring: [],
    generators: ['-x,-y', '-x+1/2,y'],
  },
  {
    number: 8,
    symbol: 'p2gg',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
    ],
    centring: [],
    generators: ['-x,-y', '-x+1/2,y+1/2'],
  },
  {
    number: 9,
    symbol: 'c2mm',
    asymmetricUnit: [
      [-1, 0, 0],
      [4, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
    ],
    centring: ['1/2,1/2'],
    generators: ['-x,-y', '-x,y'],
  },
  {
    number: 10,
    symbol: 'p4',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
    ],
    centring: [],
    generators: ['-x,-y', '-y,x'],
  },
  {
    number: 11,
    symbol: 'p4mm',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
      [1, -1, 0],
    ],
    centring: [],
    generators: ['-x,-y', '-y,x', '-x,y'],
  },
  {
    number: 12,
    symbol: 'p4gm',
    asymmetricUnit: [
      [-1, 0, 0],
      [2, 0, 1],
      [0, -1, 0],
      [0, 2, 1],
      [2, 2, 1],
    ],
    centring: [],
    generators: ['-x,-y', '-y,x', '-x+1/2,y+1/2'],
  },
  {
    number: 13,
    symbol: 'p3',
    asymmetricUnit: [
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 3, 2],
      [2, -1, 1],
      [1, 1, 1],
      [-1, 2, 1],
    ],
    centring: [],
    generators: ['-y,x-y'],
  },
  {
    number: 14,
    symbol: 'p3m1',
    asymmetricUnit: [
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 3, 2],
      [1, -2, 0],
      [1, 1, 1],
      [-2, 1, 0],
    ],
    centring: [],
    generators: ['-y,x-y', '-y,-x'],
  },
  {
    number: 15,
    symbol: 'p31m',
    asymmetricUnit: [
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 2, 1],
      [2, -1, 1],
      [1, 1, 1],
      [-1, 1, 0],
    ],
    centring: [],
    generators: ['-y,x-y', 'y,x'],
  },
  {
    number: 16,
    symbol: 'p6',
    asymmetricUnit: [
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 2, 1],
      [2, -1, 1],
      [1, 1, 1],
      [-1, 1, 0],
    ],
    centring: [],
    generators: ['-y,x-y', '-x,-y'],
  },
  {
    number: 17,
    symbol: 'p6mm',
    asymmetricUnit: [
      [-1, 0, 0],
      [3, 0, 2],
      [0, -1, 0],
      [0, 3, 1],
      [2, -1, 1],
      [-1, 2, 0],
    ],
    centring: [],
    generators: ['-y,x-y', '-x,-y', '-y,-x'],
  },
];
