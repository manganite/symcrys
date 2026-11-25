/**
 * The crystal forms of the crystal classes as ITA prints them (6th ed., 2016): the 47 forms of
 * Table 3.2.1.3 (pp. 724–726: number, name, number of faces, eigensymmetry) and, per printed setting
 * of Table 3.2.3.2 (pp. 745–769), the face forms of each Wyckoff position, basic form first, then
 * the limiting forms. The same rows are in references/itc/vol-a-table-3.2.1.3-crystal-forms.md and
 * references/itc/vol-a-table-3.2.3.2-face-forms.md, which the reference test re-parses and compares
 * with this file; change both only by transcription from print.
 *
 * Notation as in wyckoffData.ts: a leading `-` is an overbar; components separated by commas;
 * Bravais–Miller indices (four components) for hexagonal axes; three for rhombohedral axes, where an
 * index may be a sum as printed (`h,k,-h-k`, `h,k,2k-h`).
 */

/** [number, name as printed, number of faces, eigensymmetry]. */
export type FormTypeRow = readonly [number, string, number, string];

/** The 47 crystal forms of ITA Table 3.2.1.3, in printed order. */
export const FORM_TYPE_DATA: readonly FormTypeRow[] = [
  [1, 'Pedion or monohedron', 1, '∞m'],
  [2, 'Pinacoid or parallelohedron', 2, '∞/mm'],
  [3, 'Sphenoid, dome, or dihedron', 2, 'mm2'],
  [4, 'Rhombic disphenoid or rhombic tetrahedron', 4, '222'],
  [5, 'Rhombic pyramid', 4, 'mm2'],
  [6, 'Rhombic prism', 4, 'mmm'],
  [7, 'Rhombic dipyramid', 8, 'mmm'],
  [8, 'Tetragonal pyramid', 4, '4mm'],
  [9, 'Tetragonal disphenoid or tetragonal tetrahedron', 4, '-42m'],
  [10, 'Tetragonal prism', 4, '4/mmm'],
  [11, 'Tetragonal trapezohedron', 8, '422'],
  [12, 'Ditetragonal pyramid', 8, '4mm'],
  [13, 'Tetragonal scalenohedron', 8, '-42m'],
  [14, 'Tetragonal dipyramid', 8, '4/mmm'],
  [15, 'Ditetragonal prism', 8, '4/mmm'],
  [16, 'Ditetragonal dipyramid', 16, '4/mmm'],
  [17, 'Trigonal pyramid', 3, '3m'],
  [18, 'Trigonal prism', 3, '-62m'],
  [19, 'Trigonal trapezohedron', 6, '32'],
  [20, 'Ditrigonal pyramid', 6, '3m'],
  [21, 'Rhombohedron', 6, '-3m'],
  [22, 'Ditrigonal prism', 6, '-62m'],
  [23, 'Hexagonal pyramid', 6, '6mm'],
  [24, 'Trigonal dipyramid', 6, '-62m'],
  [25, 'Hexagonal prism', 6, '6/mmm'],
  [26, 'Ditrigonal scalenohedron or hexagonal scalenohedron', 12, '-3m'],
  [27, 'Hexagonal trapezohedron', 12, '622'],
  [28, 'Dihexagonal pyramid', 12, '6mm'],
  [29, 'Ditrigonal dipyramid', 12, '-62m'],
  [30, 'Dihexagonal prism', 12, '6/mmm'],
  [31, 'Hexagonal dipyramid', 12, '6/mmm'],
  [32, 'Dihexagonal dipyramid', 24, '6/mmm'],
  [33, 'Tetrahedron', 4, '-43m'],
  [34, 'Cube or hexahedron', 6, 'm-3m'],
  [35, 'Octahedron', 8, 'm-3m'],
  [36, 'Pentagon-tritetrahedron or tetartoid or tetrahedral pentagon-dodecahedron', 12, '23'],
  [37, 'Pentagon-dodecahedron or dihexahedron or pyritohedron', 12, 'm-3'],
  [38, 'Tetragon-tritetrahedron or deltohedron or deltoid-dodecahedron', 12, '-43m'],
  [39, 'Trigon-tritetrahedron or tristetrahedron', 12, '-43m'],
  [40, 'Rhomb-dodecahedron', 12, 'm-3m'],
  [41, 'Didodecahedron or diploid or dyakisdodecahedron', 24, 'm-3'],
  [42, 'Trigon-trioctahedron or trisoctahedron', 24, 'm-3m'],
  [43, 'Tetragon-trioctahedron or trapezohedron or deltoid-icositetrahedron', 24, 'm-3m'],
  [44, 'Pentagon-trioctahedron or gyroid', 24, '432'],
  [45, 'Hexatetrahedron or hexakistetrahedron', 24, '-43m'],
  [46, 'Tetrahexahedron or tetrakishexahedron', 24, 'm-3m'],
  [47, 'Hexaoctahedron or hexakisoctahedron', 48, 'm-3m'],
];

/**
 * [Wyckoff letter, basic (false: a limiting form), number in FORM_TYPE_DATA, Miller indices of the
 * first face, condition printed with the form (`|h|<|l|`)].
 */
export type FormRow = readonly [string, boolean, number, string, string?];

export interface FormEntry {
  /** ITC short symbol of the setting as in the headline of the entry. */
  readonly symbol: string;
  /** Monoclinic: the unique axis of the entry. */
  readonly uniqueAxis?: 'b' | 'c';
  /** Trigonal: `'rhombohedral'` for an entry with rhombohedral axes (hexagonal axes otherwise). */
  readonly axes?: 'rhombohedral';
  /** In printed order: general position first, each position's basic form before its limiting forms. */
  readonly rows: readonly FormRow[];
}

export const CLASS_FORMS: readonly FormEntry[] = [
  {
    symbol: '1',
    rows: [['a', true, 1, 'h,k,l']],
  },
  {
    symbol: '-1',
    rows: [['a', true, 2, 'h,k,l']],
  },
  {
    symbol: '2',
    uniqueAxis: 'b',
    rows: [
      ['b', true, 3, 'h,k,l'],
      ['b', false, 2, 'h,0,l'],
      ['a', true, 1, '0,1,0'],
    ],
  },
  {
    symbol: '2',
    uniqueAxis: 'c',
    rows: [
      ['b', true, 3, 'h,k,l'],
      ['b', false, 2, 'h,k,0'],
      ['a', true, 1, '0,0,1'],
    ],
  },
  {
    symbol: 'm',
    uniqueAxis: 'b',
    rows: [
      ['b', true, 3, 'h,k,l'],
      ['b', false, 2, '0,1,0'],
      ['a', true, 1, 'h,0,l'],
    ],
  },
  {
    symbol: 'm',
    uniqueAxis: 'c',
    rows: [
      ['b', true, 3, 'h,k,l'],
      ['b', false, 2, '0,0,1'],
      ['a', true, 1, 'h,k,0'],
    ],
  },
  {
    symbol: '2/m',
    uniqueAxis: 'b',
    rows: [
      ['c', true, 6, 'h,k,l'],
      ['b', true, 2, 'h,0,l'],
      ['a', true, 2, '0,1,0'],
    ],
  },
  {
    symbol: '2/m',
    uniqueAxis: 'c',
    rows: [
      ['c', true, 6, 'h,k,l'],
      ['b', true, 2, 'h,k,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '222',
    rows: [
      ['d', true, 4, 'h,k,l'],
      ['d', false, 6, 'h,k,0'],
      ['d', false, 6, 'h,0,l'],
      ['d', false, 6, '0,k,l'],
      ['c', true, 2, '0,0,1'],
      ['b', true, 2, '0,1,0'],
      ['a', true, 2, '1,0,0'],
    ],
  },
  {
    symbol: 'mm2',
    rows: [
      ['d', true, 5, 'h,k,l'],
      ['d', false, 6, 'h,k,0'],
      ['c', true, 3, '0,k,l'],
      ['c', false, 2, '0,1,0'],
      ['b', true, 3, 'h,0,l'],
      ['b', false, 2, '1,0,0'],
      ['a', true, 1, '0,0,1'],
    ],
  },
  {
    symbol: 'mmm',
    rows: [
      ['g', true, 7, 'h,k,l'],
      ['f', true, 6, 'h,k,0'],
      ['e', true, 6, 'h,0,l'],
      ['d', true, 6, '0,k,l'],
      ['c', true, 2, '0,0,1'],
      ['b', true, 2, '0,1,0'],
      ['a', true, 2, '1,0,0'],
    ],
  },
  {
    symbol: '4',
    rows: [
      ['b', true, 8, 'h,k,l'],
      ['b', false, 10, 'h,k,0'],
      ['a', true, 1, '0,0,1'],
    ],
  },
  {
    symbol: '-4',
    rows: [
      ['b', true, 9, 'h,k,l'],
      ['b', false, 10, 'h,k,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '4/m',
    rows: [
      ['c', true, 14, 'h,k,l'],
      ['b', true, 10, 'h,k,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '422',
    rows: [
      ['d', true, 11, 'h,k,l'],
      ['d', false, 15, 'h,k,0'],
      ['d', false, 14, 'h,0,l'],
      ['d', false, 14, 'h,h,l'],
      ['c', true, 10, '1,0,0'],
      ['b', true, 10, '1,1,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '4mm',
    rows: [
      ['d', true, 12, 'h,k,l'],
      ['d', false, 15, 'h,k,0'],
      ['c', true, 8, 'h,0,l'],
      ['c', false, 10, '1,0,0'],
      ['b', true, 8, 'h,h,l'],
      ['b', false, 10, '1,1,0'],
      ['a', true, 1, '0,0,1'],
    ],
  },
  {
    symbol: '-42m',
    rows: [
      ['d', true, 13, 'h,k,l'],
      ['d', false, 15, 'h,k,0'],
      ['d', false, 14, 'h,0,l'],
      ['c', true, 9, 'h,h,l'],
      ['c', false, 10, '1,1,0'],
      ['b', true, 10, '1,0,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '-4m2',
    rows: [
      ['d', true, 13, 'h,k,l'],
      ['d', false, 15, 'h,k,0'],
      ['d', false, 14, 'h,h,l'],
      ['c', true, 9, 'h,0,l'],
      ['c', false, 10, '1,0,0'],
      ['b', true, 10, '1,1,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '4/mmm',
    rows: [
      ['g', true, 16, 'h,k,l'],
      ['f', true, 14, 'h,0,l'],
      ['e', true, 14, 'h,h,l'],
      ['d', true, 15, 'h,k,0'],
      ['c', true, 10, '1,0,0'],
      ['b', true, 10, '1,1,0'],
      ['a', true, 2, '0,0,1'],
    ],
  },
  {
    symbol: '3',
    rows: [
      ['b', true, 17, 'h,k,i,l'],
      ['b', false, 18, 'h,k,i,0'],
      ['a', true, 1, '0,0,0,1'],
    ],
  },
  {
    symbol: '3',
    axes: 'rhombohedral',
    rows: [
      ['b', true, 17, 'h,k,l'],
      ['b', false, 18, 'h,k,-h-k'],
      ['a', true, 1, '1,1,1'],
    ],
  },
  {
    symbol: '-3',
    rows: [
      ['b', true, 21, 'h,k,i,l'],
      ['b', false, 25, 'h,k,i,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '-3',
    axes: 'rhombohedral',
    rows: [
      ['b', true, 21, 'h,k,l'],
      ['b', false, 25, 'h,k,-h-k'],
      ['a', true, 2, '1,1,1'],
    ],
  },
  {
    symbol: '312',
    rows: [
      ['c', true, 19, 'h,k,i,l'],
      ['c', false, 22, 'h,k,i,0'],
      ['c', false, 24, 'h,0,-h,l'],
      ['c', false, 21, 'h,h,-2h,l'],
      ['c', false, 25, '1,1,-2,0'],
      ['b', true, 18, '1,0,-1,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '321',
    rows: [
      ['c', true, 19, 'h,k,i,l'],
      ['c', false, 22, 'h,k,i,0'],
      ['c', false, 24, 'h,h,-2h,l'],
      ['c', false, 21, 'h,0,-h,l'],
      ['c', false, 25, '1,0,-1,0'],
      ['b', true, 18, '1,1,-2,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '32',
    axes: 'rhombohedral',
    rows: [
      ['c', true, 19, 'h,k,l'],
      ['c', false, 22, 'h,k,-h-k'],
      ['c', false, 24, 'h,k,2k-h'],
      ['c', false, 21, 'h,h,l'],
      ['c', false, 25, '1,1,-2'],
      ['b', true, 18, '0,1,-1'],
      ['a', true, 2, '1,1,1'],
    ],
  },
  {
    symbol: '3m1',
    rows: [
      ['c', true, 20, 'h,k,i,l'],
      ['c', false, 22, 'h,k,i,0'],
      ['c', false, 23, 'h,h,-2h,l'],
      ['c', false, 25, '1,1,-2,0'],
      ['b', true, 17, 'h,0,-h,l'],
      ['b', false, 18, '1,0,-1,0'],
      ['a', true, 1, '0,0,0,1'],
    ],
  },
  {
    symbol: '31m',
    rows: [
      ['c', true, 20, 'h,k,i,l'],
      ['c', false, 22, 'h,k,i,0'],
      ['c', false, 23, 'h,0,-h,l'],
      ['c', false, 25, '1,0,-1,0'],
      ['b', true, 17, 'h,h,-2h,l'],
      ['b', false, 18, '1,1,-2,0'],
      ['a', true, 1, '0,0,0,1'],
    ],
  },
  {
    symbol: '3m',
    axes: 'rhombohedral',
    rows: [
      ['c', true, 20, 'h,k,l'],
      ['c', false, 22, 'h,k,-h-k'],
      ['c', false, 23, 'h,k,2k-h'],
      ['c', false, 25, '0,1,-1'],
      ['b', true, 17, 'h,h,l'],
      ['b', false, 18, '1,1,-2'],
      ['a', true, 1, '1,1,1'],
    ],
  },
  {
    symbol: '-31m',
    rows: [
      ['d', true, 26, 'h,k,i,l'],
      ['d', false, 30, 'h,k,i,0'],
      ['d', false, 31, 'h,0,-h,l'],
      ['c', true, 21, 'h,h,-2h,l'],
      ['c', false, 25, '1,1,-2,0'],
      ['b', true, 25, '1,0,-1,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '-3m1',
    rows: [
      ['d', true, 26, 'h,k,i,l'],
      ['d', false, 30, 'h,k,i,0'],
      ['d', false, 31, 'h,h,-2h,l'],
      ['c', true, 21, 'h,0,-h,l'],
      ['c', false, 25, '1,0,-1,0'],
      ['b', true, 25, '1,1,-2,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '-3m',
    axes: 'rhombohedral',
    rows: [
      ['d', true, 26, 'h,k,l'],
      ['d', false, 30, 'h,k,-h-k'],
      ['d', false, 31, 'h,k,2k-h'],
      ['c', true, 21, 'h,h,l'],
      ['c', false, 25, '1,1,-2'],
      ['b', true, 25, '0,1,-1'],
      ['a', true, 2, '1,1,1'],
    ],
  },
  {
    symbol: '6',
    rows: [
      ['b', true, 23, 'h,k,i,l'],
      ['b', false, 25, 'h,k,i,0'],
      ['a', true, 1, '0,0,0,1'],
    ],
  },
  {
    symbol: '-6',
    rows: [
      ['c', true, 24, 'h,k,i,l'],
      ['b', true, 18, 'h,k,i,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '6/m',
    rows: [
      ['c', true, 31, 'h,k,i,l'],
      ['b', true, 25, 'h,k,i,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '622',
    rows: [
      ['d', true, 27, 'h,k,i,l'],
      ['d', false, 30, 'h,k,i,0'],
      ['d', false, 31, 'h,0,-h,l'],
      ['d', false, 31, 'h,h,-2h,l'],
      ['c', true, 25, '1,0,-1,0'],
      ['b', true, 25, '1,1,-2,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '6mm',
    rows: [
      ['d', true, 28, 'h,k,i,l'],
      ['d', false, 30, 'h,k,i,0'],
      ['c', true, 23, 'h,0,-h,l'],
      ['c', false, 25, '1,0,-1,0'],
      ['b', true, 23, 'h,h,-2h,l'],
      ['b', false, 25, '1,1,-2,0'],
      ['a', true, 1, '0,0,0,1'],
    ],
  },
  {
    symbol: '-6m2',
    rows: [
      ['e', true, 29, 'h,k,i,l'],
      ['e', false, 31, 'h,h,-2h,l'],
      ['d', true, 22, 'h,k,i,0'],
      ['d', false, 25, '1,1,-2,0'],
      ['c', true, 24, 'h,0,-h,l'],
      ['b', true, 18, '1,0,-1,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '-62m',
    rows: [
      ['e', true, 29, 'h,k,i,l'],
      ['e', false, 31, 'h,0,-h,l'],
      ['d', true, 22, 'h,k,i,0'],
      ['d', false, 25, '1,0,-1,0'],
      ['c', true, 24, 'h,h,-2h,l'],
      ['b', true, 18, '1,1,-2,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '6/mmm',
    rows: [
      ['g', true, 32, 'h,k,i,l'],
      ['f', true, 30, 'h,k,i,0'],
      ['e', true, 31, 'h,0,-h,l'],
      ['d', true, 31, 'h,h,-2h,l'],
      ['c', true, 25, '1,0,-1,0'],
      ['b', true, 25, '1,1,-2,0'],
      ['a', true, 2, '0,0,0,1'],
    ],
  },
  {
    symbol: '23',
    rows: [
      ['c', true, 36, 'h,k,l'],
      ['c', false, 39, 'h,h,l', '|h|<|l|'],
      ['c', false, 38, 'h,h,l', '|h|>|l|'],
      ['c', false, 37, '0,k,l'],
      ['c', false, 40, '0,1,1'],
      ['b', true, 34, '1,0,0'],
      ['a', true, 33, '1,1,1'],
    ],
  },
  {
    symbol: 'm-3',
    rows: [
      ['d', true, 41, 'h,k,l'],
      ['d', false, 43, 'h,h,l', '|h|<|l|'],
      ['d', false, 42, 'h,h,l', '|h|>|l|'],
      ['c', true, 37, '0,k,l'],
      ['c', false, 40, '0,1,1'],
      ['b', true, 35, '1,1,1'],
      ['a', true, 34, '1,0,0'],
    ],
  },
  {
    symbol: '432',
    rows: [
      ['d', true, 44, 'h,k,l'],
      ['d', false, 43, 'h,h,l', '|h|<|l|'],
      ['d', false, 42, 'h,h,l', '|h|>|l|'],
      ['d', false, 46, '0,k,l'],
      ['c', true, 40, '0,1,1'],
      ['b', true, 35, '1,1,1'],
      ['a', true, 34, '1,0,0'],
    ],
  },
  {
    symbol: '-43m',
    rows: [
      ['d', true, 45, 'h,k,l'],
      ['d', false, 46, '0,k,l'],
      ['c', true, 39, 'h,h,l', '|h|<|l|'],
      ['c', true, 38, 'h,h,l', '|h|>|l|'],
      ['c', false, 40, '1,1,0'],
      ['b', true, 34, '1,0,0'],
      ['a', true, 33, '1,1,1'],
    ],
  },
  {
    symbol: 'm-3m',
    rows: [
      ['f', true, 47, 'h,k,l'],
      ['e', true, 43, 'h,h,l', '|h|<|l|'],
      ['e', true, 42, 'h,h,l', '|h|>|l|'],
      ['d', true, 46, '0,k,l'],
      ['c', true, 40, '0,1,1'],
      ['b', true, 35, '1,1,1'],
      ['a', true, 34, '1,0,0'],
    ],
  },
];
