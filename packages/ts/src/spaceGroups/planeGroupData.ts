/**
 * The 17 plane groups as ITA prints them (6th ed., 2016, Chapter 2.2, pp. 176–192, plane group n on
 * p. 175 + n). The same data are in references/itc/vol-a-2016-plane-groups.md, which the reference
 * test re-parses and compares with this file; change both only by transcription from print.
 *
 * Notation as in the transcription: a leading `-` is an overbar; coordinates in the lattice basis
 * a, b; `<=` for ≤. The oriented site-symmetry symbols without the spaces of the print.
 */

/** A crystal system of the plane, as ITA names it. */
export type PlaneSystem = 'oblique' | 'rectangular' | 'square' | 'hexagonal';

/** [multiplicity, Wyckoff letter, oriented site symmetry, coordinates of the (0,0)+ set]. */
export type PlaneWyckoffRow = readonly [number, string, string, readonly string[]];

/** One plane group as printed. */
export interface PlaneGroupEntry {
  /** Number of the plane group, 1 to 17. */
  readonly number: number;
  /** Short Hermann–Mauguin symbol, e.g. `p2mg`. */
  readonly symbol: string;
  /** Full Hermann–Mauguin symbol, e.g. `p1m1`. */
  readonly fullSymbol: string;
  /** The plane point group, e.g. `2mm`. */
  readonly pointGroup: string;
  /** The crystal system. */
  readonly system: PlaneSystem;
  /** Printed page. */
  readonly page: number;
  /** The block "Origin" as printed, its positions spaced, e.g. `at 2 1 g`. */
  readonly origin: string;
  /** The block "Asymmetric unit" as printed. */
  readonly asymmetricUnit: string;
  /** The vertices of the asymmetric unit, where printed (hexagonal groups). */
  readonly vertices?: readonly string[];
  /** Centring translations besides (0,0): `['1/2,1/2']` for the c groups. */
  readonly centring: readonly string[];
  /** The general position, (0,0)+ set, in ITA's numbering. */
  readonly generalPosition: readonly string[];
  /** "Generators selected": numbers in the general position, after (1) and the integer translations (and the centring). */
  readonly generators: readonly number[];
  /** The Wyckoff positions in printed order, general position first. */
  readonly wyckoff: readonly PlaneWyckoffRow[];
}

/** The 17 plane groups in ITA's order. */
export const PLANE_GROUP_DATA: readonly PlaneGroupEntry[] = [
  {
    number: 1,
    symbol: 'p1',
    fullSymbol: 'p1',
    pointGroup: '1',
    system: 'oblique',
    page: 176,
    origin: 'arbitrary',
    asymmetricUnit: '0 <= x <= 1; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y'],
    generators: [],
    wyckoff: [[1, 'a', '1', ['x,y']]],
  },
  {
    number: 2,
    symbol: 'p2',
    fullSymbol: 'p2',
    pointGroup: '2',
    system: 'oblique',
    page: 177,
    origin: 'at 2',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,-y'],
    generators: [2],
    wyckoff: [
      [2, 'e', '1', ['x,y', '-x,-y']],
      [1, 'd', '2', ['1/2,1/2']],
      [1, 'c', '2', ['1/2,0']],
      [1, 'b', '2', ['0,1/2']],
      [1, 'a', '2', ['0,0']],
    ],
  },
  {
    number: 3,
    symbol: 'pm',
    fullSymbol: 'p1m1',
    pointGroup: 'm',
    system: 'rectangular',
    page: 178,
    origin: 'on m',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,y'],
    generators: [2],
    wyckoff: [
      [2, 'c', '1', ['x,y', '-x,y']],
      [1, 'b', '.m.', ['1/2,y']],
      [1, 'a', '.m.', ['0,y']],
    ],
  },
  {
    number: 4,
    symbol: 'pg',
    fullSymbol: 'p1g1',
    pointGroup: 'm',
    system: 'rectangular',
    page: 179,
    origin: 'on g',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,y+1/2'],
    generators: [2],
    wyckoff: [[2, 'a', '1', ['x,y', '-x,y+1/2']]],
  },
  {
    number: 5,
    symbol: 'cm',
    fullSymbol: 'c1m1',
    pointGroup: 'm',
    system: 'rectangular',
    page: 180,
    origin: 'on m',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: ['1/2,1/2'],
    generalPosition: ['x,y', '-x,y'],
    generators: [2],
    wyckoff: [
      [4, 'b', '1', ['x,y', '-x,y']],
      [2, 'a', '.m.', ['0,y']],
    ],
  },
  {
    number: 6,
    symbol: 'p2mm',
    fullSymbol: 'p2mm',
    pointGroup: '2mm',
    system: 'rectangular',
    page: 181,
    origin: 'at 2 m m',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x,y', 'x,-y'],
    generators: [2, 3],
    wyckoff: [
      [4, 'i', '1', ['x,y', '-x,-y', '-x,y', 'x,-y']],
      [2, 'h', '.m.', ['1/2,y', '1/2,-y']],
      [2, 'g', '.m.', ['0,y', '0,-y']],
      [2, 'f', '..m', ['x,1/2', '-x,1/2']],
      [2, 'e', '..m', ['x,0', '-x,0']],
      [1, 'd', '2mm', ['1/2,1/2']],
      [1, 'c', '2mm', ['1/2,0']],
      [1, 'b', '2mm', ['0,1/2']],
      [1, 'a', '2mm', ['0,0']],
    ],
  },
  {
    number: 7,
    symbol: 'p2mg',
    fullSymbol: 'p2mg',
    pointGroup: '2mm',
    system: 'rectangular',
    page: 182,
    origin: 'at 2 1 g',
    asymmetricUnit: '0 <= x <= 1/4; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x+1/2,y', 'x+1/2,-y'],
    generators: [2, 3],
    wyckoff: [
      [4, 'd', '1', ['x,y', '-x,-y', '-x+1/2,y', 'x+1/2,-y']],
      [2, 'c', '.m.', ['1/4,y', '3/4,-y']],
      [2, 'b', '2..', ['0,1/2', '1/2,1/2']],
      [2, 'a', '2..', ['0,0', '1/2,0']],
    ],
  },
  {
    number: 8,
    symbol: 'p2gg',
    fullSymbol: 'p2gg',
    pointGroup: '2mm',
    system: 'rectangular',
    page: 183,
    origin: 'at 2',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x+1/2,y+1/2', 'x+1/2,-y+1/2'],
    generators: [2, 3],
    wyckoff: [
      [4, 'c', '1', ['x,y', '-x,-y', '-x+1/2,y+1/2', 'x+1/2,-y+1/2']],
      [2, 'b', '2..', ['1/2,0', '0,1/2']],
      [2, 'a', '2..', ['0,0', '1/2,1/2']],
    ],
  },
  {
    number: 9,
    symbol: 'c2mm',
    fullSymbol: 'c2mm',
    pointGroup: '2mm',
    system: 'rectangular',
    page: 184,
    origin: 'at 2 m m',
    asymmetricUnit: '0 <= x <= 1/4; 0 <= y <= 1/2',
    centring: ['1/2,1/2'],
    generalPosition: ['x,y', '-x,-y', '-x,y', 'x,-y'],
    generators: [2, 3],
    wyckoff: [
      [8, 'f', '1', ['x,y', '-x,-y', '-x,y', 'x,-y']],
      [4, 'e', '.m.', ['0,y', '0,-y']],
      [4, 'd', '..m', ['x,0', '-x,0']],
      [4, 'c', '2..', ['1/4,1/4', '3/4,1/4']],
      [2, 'b', '2mm', ['0,1/2']],
      [2, 'a', '2mm', ['0,0']],
    ],
  },
  {
    number: 10,
    symbol: 'p4',
    fullSymbol: 'p4',
    pointGroup: '4',
    system: 'square',
    page: 185,
    origin: 'at 4',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x'],
    generators: [2, 3],
    wyckoff: [
      [4, 'd', '1', ['x,y', '-x,-y', '-y,x', 'y,-x']],
      [2, 'c', '2..', ['1/2,0', '0,1/2']],
      [1, 'b', '4..', ['1/2,1/2']],
      [1, 'a', '4..', ['0,0']],
    ],
  },
  {
    number: 11,
    symbol: 'p4mm',
    fullSymbol: 'p4mm',
    pointGroup: '4mm',
    system: 'square',
    page: 186,
    origin: 'at 4 m m',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2; x <= y',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x', '-x,y', 'x,-y', 'y,x', '-y,-x'],
    generators: [2, 3, 5],
    wyckoff: [
      [8, 'g', '1', ['x,y', '-x,-y', '-y,x', 'y,-x', '-x,y', 'x,-y', 'y,x', '-y,-x']],
      [4, 'f', '..m', ['x,x', '-x,-x', '-x,x', 'x,-x']],
      [4, 'e', '.m.', ['x,1/2', '-x,1/2', '1/2,x', '1/2,-x']],
      [4, 'd', '.m.', ['x,0', '-x,0', '0,x', '0,-x']],
      [2, 'c', '2mm.', ['1/2,0', '0,1/2']],
      [1, 'b', '4mm', ['1/2,1/2']],
      [1, 'a', '4mm', ['0,0']],
    ],
  },
  {
    number: 12,
    symbol: 'p4gm',
    fullSymbol: 'p4gm',
    pointGroup: '4mm',
    system: 'square',
    page: 187,
    origin: 'at 4 1 g',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2; y <= 1/2 - x',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x', '-x+1/2,y+1/2', 'x+1/2,-y+1/2', 'y+1/2,x+1/2', '-y+1/2,-x+1/2'],
    generators: [2, 3, 5],
    wyckoff: [
      [8, 'd', '1', ['x,y', '-x,-y', '-y,x', 'y,-x', '-x+1/2,y+1/2', 'x+1/2,-y+1/2', 'y+1/2,x+1/2', '-y+1/2,-x+1/2']],
      [4, 'c', '..m', ['x,x+1/2', '-x,-x+1/2', '-x+1/2,x', 'x+1/2,-x']],
      [2, 'b', '2.mm', ['1/2,0', '0,1/2']],
      [2, 'a', '4..', ['0,0', '1/2,1/2']],
    ],
  },
  {
    number: 13,
    symbol: 'p3',
    fullSymbol: 'p3',
    pointGroup: '3',
    system: 'hexagonal',
    page: 188,
    origin: 'at 3',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 2/3; x <= (1 + y)/2; y <= min(1 - x, (1 + x)/2)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/3,2/3', '0,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x'],
    generators: [2],
    wyckoff: [
      [3, 'd', '1', ['x,y', '-y,x-y', '-x+y,-x']],
      [1, 'c', '3..', ['2/3,1/3']],
      [1, 'b', '3..', ['1/3,2/3']],
      [1, 'a', '3..', ['0,0']],
    ],
  },
  {
    number: 14,
    symbol: 'p3m1',
    fullSymbol: 'p3m1',
    pointGroup: '3m',
    system: 'hexagonal',
    page: 189,
    origin: 'at 3 m 1',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 2/3; x <= 2y; y <= min(1 - x, 2x)',
    vertices: ['0,0', '2/3,1/3', '1/3,2/3'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', '-y,-x', '-x+y,y', 'x,x-y'],
    generators: [2, 4],
    wyckoff: [
      [6, 'e', '1', ['x,y', '-y,x-y', '-x+y,-x', '-y,-x', '-x+y,y', 'x,x-y']],
      [3, 'd', '.m.', ['x,-x', 'x,2x', '-2x,-x']],
      [1, 'c', '3m.', ['2/3,1/3']],
      [1, 'b', '3m.', ['1/3,2/3']],
      [1, 'a', '3m.', ['0,0']],
    ],
  },
  {
    number: 15,
    symbol: 'p31m',
    fullSymbol: 'p31m',
    pointGroup: '3m',
    system: 'hexagonal',
    page: 190,
    origin: 'at 3 1 m',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 1/2; x <= (1 + y)/2; y <= min(1 - x, x)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/2,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', 'y,x', 'x-y,-y', '-x,-x+y'],
    generators: [2, 4],
    wyckoff: [
      [6, 'd', '1', ['x,y', '-y,x-y', '-x+y,-x', 'y,x', 'x-y,-y', '-x,-x+y']],
      [3, 'c', '..m', ['x,0', '0,x', '-x,-x']],
      [2, 'b', '3..', ['1/3,2/3', '2/3,1/3']],
      [1, 'a', '3.m', ['0,0']],
    ],
  },
  {
    number: 16,
    symbol: 'p6',
    fullSymbol: 'p6',
    pointGroup: '6',
    system: 'hexagonal',
    page: 191,
    origin: 'at 6',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 1/2; x <= (1 + y)/2; y <= min(1 - x, x)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/2,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', '-x,-y', 'y,-x+y', 'x-y,x'],
    generators: [2, 4],
    wyckoff: [
      [6, 'd', '1', ['x,y', '-y,x-y', '-x+y,-x', '-x,-y', 'y,-x+y', 'x-y,x']],
      [3, 'c', '2..', ['1/2,0', '0,1/2', '1/2,1/2']],
      [2, 'b', '3..', ['1/3,2/3', '2/3,1/3']],
      [1, 'a', '6..', ['0,0']],
    ],
  },
  {
    number: 17,
    symbol: 'p6mm',
    fullSymbol: 'p6mm',
    pointGroup: '6mm',
    system: 'hexagonal',
    page: 192,
    origin: 'at 6 m m',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 1/3; x <= (1 + y)/2; y <= x/2',
    vertices: ['0,0', '1/2,0', '2/3,1/3'],
    centring: [],
    generalPosition: [
      'x,y',
      '-y,x-y',
      '-x+y,-x',
      '-x,-y',
      'y,-x+y',
      'x-y,x',
      '-y,-x',
      '-x+y,y',
      'x,x-y',
      'y,x',
      'x-y,-y',
      '-x,-x+y',
    ],
    generators: [2, 4, 7],
    wyckoff: [
      [
        12,
        'f',
        '1',
        [
          'x,y',
          '-y,x-y',
          '-x+y,-x',
          '-x,-y',
          'y,-x+y',
          'x-y,x',
          '-y,-x',
          '-x+y,y',
          'x,x-y',
          'y,x',
          'x-y,-y',
          '-x,-x+y',
        ],
      ],
      [6, 'e', '.m.', ['x,-x', 'x,2x', '-2x,-x', '-x,x', '-x,-2x', '2x,x']],
      [6, 'd', '..m', ['x,0', '0,x', '-x,-x', '-x,0', '0,-x', 'x,x']],
      [3, 'c', '2mm', ['1/2,0', '0,1/2', '1/2,1/2']],
      [2, 'b', '3m.', ['1/3,2/3', '2/3,1/3']],
      [1, 'a', '6mm', ['0,0']],
    ],
  },
];
