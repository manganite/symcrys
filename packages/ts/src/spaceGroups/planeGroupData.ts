/**
 * The 17 plane groups as ITA prints them (6th ed., 2016, Chapter 2.2, pp. 176–192, plane group n on
 * p. 175 + n). The same data are in references/itc/vol-a-2016-plane-groups.md, which the reference
 * test re-parses and compares with this file; change both only by transcription from print. The
 * Wyckoff positions are computed from the group (planeWyckoff.ts); what is still stored here as
 * printed (the general position, symbols, Patterson symmetry) is computed in a later step (GUIDE.md,
 * "Own structure").
 *
 * Notation as in the transcription: a leading `-` is an overbar; coordinates in the lattice basis
 * a, b; `<=` for ≤.
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
  /** The Patterson symmetry as printed in the headline, the symbol of a plane group, e.g. `p2mm`. */
  readonly pattersonSymmetry: string;
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
}

/** The 17 plane groups in ITA's order. */
export const PLANE_GROUP_DATA: readonly PlaneGroupEntry[] = [
  {
    number: 1,
    symbol: 'p1',
    fullSymbol: 'p1',
    pointGroup: '1',
    system: 'oblique',
    pattersonSymmetry: 'p2',
    asymmetricUnit: '0 <= x <= 1; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y'],
    generators: [],
  },
  {
    number: 2,
    symbol: 'p2',
    fullSymbol: 'p2',
    pointGroup: '2',
    system: 'oblique',
    pattersonSymmetry: 'p2',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,-y'],
    generators: [2],
  },
  {
    number: 3,
    symbol: 'pm',
    fullSymbol: 'p1m1',
    pointGroup: 'm',
    system: 'rectangular',
    pattersonSymmetry: 'p2mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,y'],
    generators: [2],
  },
  {
    number: 4,
    symbol: 'pg',
    fullSymbol: 'p1g1',
    pointGroup: 'm',
    system: 'rectangular',
    pattersonSymmetry: 'p2mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,y+1/2'],
    generators: [2],
  },
  {
    number: 5,
    symbol: 'cm',
    fullSymbol: 'c1m1',
    pointGroup: 'm',
    system: 'rectangular',
    pattersonSymmetry: 'c2mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: ['1/2,1/2'],
    generalPosition: ['x,y', '-x,y'],
    generators: [2],
  },
  {
    number: 6,
    symbol: 'p2mm',
    fullSymbol: 'p2mm',
    pointGroup: '2mm',
    system: 'rectangular',
    pattersonSymmetry: 'p2mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x,y', 'x,-y'],
    generators: [2, 3],
  },
  {
    number: 7,
    symbol: 'p2mg',
    fullSymbol: 'p2mg',
    pointGroup: '2mm',
    system: 'rectangular',
    pattersonSymmetry: 'p2mm',
    asymmetricUnit: '0 <= x <= 1/4; 0 <= y <= 1',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x+1/2,y', 'x+1/2,-y'],
    generators: [2, 3],
  },
  {
    number: 8,
    symbol: 'p2gg',
    fullSymbol: 'p2gg',
    pointGroup: '2mm',
    system: 'rectangular',
    pattersonSymmetry: 'p2mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-x+1/2,y+1/2', 'x+1/2,-y+1/2'],
    generators: [2, 3],
  },
  {
    number: 9,
    symbol: 'c2mm',
    fullSymbol: 'c2mm',
    pointGroup: '2mm',
    system: 'rectangular',
    pattersonSymmetry: 'c2mm',
    asymmetricUnit: '0 <= x <= 1/4; 0 <= y <= 1/2',
    centring: ['1/2,1/2'],
    generalPosition: ['x,y', '-x,-y', '-x,y', 'x,-y'],
    generators: [2, 3],
  },
  {
    number: 10,
    symbol: 'p4',
    fullSymbol: 'p4',
    pointGroup: '4',
    system: 'square',
    pattersonSymmetry: 'p4',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x'],
    generators: [2, 3],
  },
  {
    number: 11,
    symbol: 'p4mm',
    fullSymbol: 'p4mm',
    pointGroup: '4mm',
    system: 'square',
    pattersonSymmetry: 'p4mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2; x <= y',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x', '-x,y', 'x,-y', 'y,x', '-y,-x'],
    generators: [2, 3, 5],
  },
  {
    number: 12,
    symbol: 'p4gm',
    fullSymbol: 'p4gm',
    pointGroup: '4mm',
    system: 'square',
    pattersonSymmetry: 'p4mm',
    asymmetricUnit: '0 <= x <= 1/2; 0 <= y <= 1/2; y <= 1/2 - x',
    centring: [],
    generalPosition: ['x,y', '-x,-y', '-y,x', 'y,-x', '-x+1/2,y+1/2', 'x+1/2,-y+1/2', 'y+1/2,x+1/2', '-y+1/2,-x+1/2'],
    generators: [2, 3, 5],
  },
  {
    number: 13,
    symbol: 'p3',
    fullSymbol: 'p3',
    pointGroup: '3',
    system: 'hexagonal',
    pattersonSymmetry: 'p6',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 2/3; x <= (1 + y)/2; y <= min(1 - x, (1 + x)/2)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/3,2/3', '0,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x'],
    generators: [2],
  },
  {
    number: 14,
    symbol: 'p3m1',
    fullSymbol: 'p3m1',
    pointGroup: '3m',
    system: 'hexagonal',
    pattersonSymmetry: 'p6mm',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 2/3; x <= 2y; y <= min(1 - x, 2x)',
    vertices: ['0,0', '2/3,1/3', '1/3,2/3'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', '-y,-x', '-x+y,y', 'x,x-y'],
    generators: [2, 4],
  },
  {
    number: 15,
    symbol: 'p31m',
    fullSymbol: 'p31m',
    pointGroup: '3m',
    system: 'hexagonal',
    pattersonSymmetry: 'p6mm',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 1/2; x <= (1 + y)/2; y <= min(1 - x, x)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/2,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', 'y,x', 'x-y,-y', '-x,-x+y'],
    generators: [2, 4],
  },
  {
    number: 16,
    symbol: 'p6',
    fullSymbol: 'p6',
    pointGroup: '6',
    system: 'hexagonal',
    pattersonSymmetry: 'p6',
    asymmetricUnit: '0 <= x <= 2/3; 0 <= y <= 1/2; x <= (1 + y)/2; y <= min(1 - x, x)',
    vertices: ['0,0', '1/2,0', '2/3,1/3', '1/2,1/2'],
    centring: [],
    generalPosition: ['x,y', '-y,x-y', '-x+y,-x', '-x,-y', 'y,-x+y', 'x-y,x'],
    generators: [2, 4],
  },
  {
    number: 17,
    symbol: 'p6mm',
    fullSymbol: 'p6mm',
    pointGroup: '6mm',
    system: 'hexagonal',
    pattersonSymmetry: 'p6mm',
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
  },
];
