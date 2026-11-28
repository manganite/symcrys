/**
 * Vocabulary of the crystal forms: the 47 kinds of ITA (6th ed., 2016) Table 3.2.1.3, pp. 724–726,
 * with their names, numbers of faces and eigensymmetries, which define the names, and where two
 * kinds share both, the geometry that tells them apart (`FORM_DISTINCTIONS`). The same rows are in
 * references/itc/vol-a-table-3.2.1.3-crystal-forms.md, which the reference test compares with this
 * file.
 */

import { deepFreeze } from '../freeze.js';

/**
 * A kind of crystal form, one of the 47: the first of its usual English names in lower case, words
 * joined by `-` (`'pedion'`, `'tetragonal-prism'`, `'rhomb-dodecahedron'`).
 */
export type CrystalFormTypeKey =
  | 'pedion'
  | 'pinacoid'
  | 'sphenoid'
  | 'rhombic-disphenoid'
  | 'rhombic-pyramid'
  | 'rhombic-prism'
  | 'rhombic-dipyramid'
  | 'tetragonal-pyramid'
  | 'tetragonal-disphenoid'
  | 'tetragonal-prism'
  | 'tetragonal-trapezohedron'
  | 'ditetragonal-pyramid'
  | 'tetragonal-scalenohedron'
  | 'tetragonal-dipyramid'
  | 'ditetragonal-prism'
  | 'ditetragonal-dipyramid'
  | 'trigonal-pyramid'
  | 'trigonal-prism'
  | 'trigonal-trapezohedron'
  | 'ditrigonal-pyramid'
  | 'rhombohedron'
  | 'ditrigonal-prism'
  | 'hexagonal-pyramid'
  | 'trigonal-dipyramid'
  | 'hexagonal-prism'
  | 'ditrigonal-scalenohedron'
  | 'hexagonal-trapezohedron'
  | 'dihexagonal-pyramid'
  | 'ditrigonal-dipyramid'
  | 'dihexagonal-prism'
  | 'hexagonal-dipyramid'
  | 'dihexagonal-dipyramid'
  | 'tetrahedron'
  | 'cube'
  | 'octahedron'
  | 'pentagon-tritetrahedron'
  | 'pentagon-dodecahedron'
  | 'tetragon-tritetrahedron'
  | 'trigon-tritetrahedron'
  | 'rhomb-dodecahedron'
  | 'didodecahedron'
  | 'trigon-trioctahedron'
  | 'tetragon-trioctahedron'
  | 'pentagon-trioctahedron'
  | 'hexatetrahedron'
  | 'tetrahexahedron'
  | 'hexaoctahedron';

/** The keys of the form types, in the order of the stored rows (ITA 2016 Table 3.2.1.3, pp. 724–726). */
export const FORM_TYPE_KEYS: readonly CrystalFormTypeKey[] = Object.freeze([
  'pedion',
  'pinacoid',
  'sphenoid',
  'rhombic-disphenoid',
  'rhombic-pyramid',
  'rhombic-prism',
  'rhombic-dipyramid',
  'tetragonal-pyramid',
  'tetragonal-disphenoid',
  'tetragonal-prism',
  'tetragonal-trapezohedron',
  'ditetragonal-pyramid',
  'tetragonal-scalenohedron',
  'tetragonal-dipyramid',
  'ditetragonal-prism',
  'ditetragonal-dipyramid',
  'trigonal-pyramid',
  'trigonal-prism',
  'trigonal-trapezohedron',
  'ditrigonal-pyramid',
  'rhombohedron',
  'ditrigonal-prism',
  'hexagonal-pyramid',
  'trigonal-dipyramid',
  'hexagonal-prism',
  'ditrigonal-scalenohedron',
  'hexagonal-trapezohedron',
  'dihexagonal-pyramid',
  'ditrigonal-dipyramid',
  'dihexagonal-prism',
  'hexagonal-dipyramid',
  'dihexagonal-dipyramid',
  'tetrahedron',
  'cube',
  'octahedron',
  'pentagon-tritetrahedron',
  'pentagon-dodecahedron',
  'tetragon-tritetrahedron',
  'trigon-tritetrahedron',
  'rhomb-dodecahedron',
  'didodecahedron',
  'trigon-trioctahedron',
  'tetragon-trioctahedron',
  'pentagon-trioctahedron',
  'hexatetrahedron',
  'tetrahexahedron',
  'hexaoctahedron',
]);

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
 * Vocabulary, part of the definition of the names: what tells apart kinds of forms with the same
 * number of faces and eigensymmetry, from the shape each name states (a prism, whose faces are
 * parallel to the main axis, or a dipyramid; the polygon of a face). It cannot be computed from
 * the faces alone, since it says which name belongs to which shape; Table 3.2.1.3 gives the names,
 * not these numbers. The order of the rotation of the eigensymmetry about the normal of the mirror
 * that fixes a face (6, 4 or 3 for a prism; 2 or 1 for a dipyramid; 4 for the tetrahexahedron, 2
 * for the trioctahedra), and for the cubic forms on (hhl), which no symmetry tells apart, the
 * condition on h and l (ITA's "for |h| < |l|").
 */
export const FORM_DISTINCTIONS: Readonly<
  Partial<Record<CrystalFormTypeKey, { readonly mirrorAxis?: number; readonly condition?: string }>>
> = deepFreeze({
  'ditetragonal-prism': { mirrorAxis: 4 },
  'tetragonal-dipyramid': { mirrorAxis: 2 },
  'ditrigonal-prism': { mirrorAxis: 3 },
  'trigonal-dipyramid': { mirrorAxis: 1 },
  'dihexagonal-prism': { mirrorAxis: 6 },
  'hexagonal-dipyramid': { mirrorAxis: 2 },
  tetrahexahedron: { mirrorAxis: 4 },
  'trigon-trioctahedron': { mirrorAxis: 2, condition: '|h|>|l|' },
  'tetragon-trioctahedron': { mirrorAxis: 2, condition: '|h|<|l|' },
  'trigon-tritetrahedron': { condition: '|h|<|l|' },
  'tetragon-tritetrahedron': { condition: '|h|>|l|' },
});
