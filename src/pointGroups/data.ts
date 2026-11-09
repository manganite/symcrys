/**
 * The 32 crystallographic point groups (crystal classes) as data: generators, settings and symbols.
 *
 * Generators are stored in the Birss frame (docs/conventions.md); every setting is a rotation of
 * that frame, and the ITC settings are among them. The print anchors and their tests are listed in
 * docs/conventions.md, "Sources"; never derive data here from symcrys output.
 */

import { INVERSION, multiply, rotationX, rotationY, rotationZ, type Mat3 } from '../linalg.js';
import { operation, type Operation } from '../operations.js';
import type { CrystalSystem } from '../lattice.js';

/** Keys of the 32 crystal classes: the ITC short symbol of the class (docs/conventions.md, "Keys"). */
export const POINT_GROUP_KEYS = Object.freeze([
  '1',
  '-1',
  '2',
  'm',
  '2/m',
  '222',
  'mm2',
  'mmm',
  '4',
  '-4',
  '4/m',
  '422',
  '4mm',
  '-42m',
  '4/mmm',
  '3',
  '-3',
  '32',
  '3m',
  '-3m',
  '6',
  '-6',
  '6/m',
  '622',
  '6mm',
  '-6m2',
  '6/mmm',
  '23',
  'm-3',
  '432',
  '-43m',
  'm-3m',
] as const);

export type PointGroupKey = (typeof POINT_GROUP_KEYS)[number];

/** A symbol in one convention: the short symbol of the setting and the full symbol, positions separated by spaces. */
interface SymbolForms {
  readonly short: string;
  readonly full: string;
}

export interface SettingData {
  /** Orthogonal matrix s: the setting's operations are s·W·sᵀ for the stored operations W. */
  readonly frame: Mat3;
  /** Monoclinic: the unique axis; orthorhombic mm2: the axis of the twofold rotation. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  readonly itc: SymbolForms;
  readonly birss: SymbolForms;
}

export interface PointGroupData {
  readonly key: PointGroupKey;
  readonly crystalSystem: CrystalSystem;
  readonly schoenflies: string;
  /** Generators in the stored (Birss) frame, which is setting 1. */
  readonly generators: readonly Operation[];
  /** Setting 1 first; its frame is the identity. */
  readonly settings: readonly SettingData[];
  /** The ITC default setting (1-based). The Birss default is always setting 1. */
  readonly itcDefault: number;
}

// --- Matrices in the stored (Birss) frame ---------------------------------------------------------

const ROT2_Z = rotationZ(180);
const ROT2_X = rotationX(180);
const ROT2_Y = rotationY(180);
const ROT4_Z = rotationZ(90);
const ROT3_Z = rotationZ(120);
const ROT6_Z = rotationZ(60);
const ROT4_X = rotationX(90);
const ROTINV4_Z = multiply(ROT4_Z, INVERSION);
const ROTINV3_Z = multiply(ROT3_Z, INVERSION);
const ROTINV6_Z = multiply(ROT6_Z, INVERSION);
const MIRROR_X: Mat3 = [
  [-1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const MIRROR_Y: Mat3 = [
  [1, 0, 0],
  [0, -1, 0],
  [0, 0, 1],
];
const MIRROR_Z: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, -1],
];
/** Mirror with normal [1-10] (swaps x and y). */
const MIRROR_XY: Mat3 = [
  [0, 1, 0],
  [1, 0, 0],
  [0, 0, 1],
];
/** Threefold rotation about [111], mapping the vector x to y, y to z, z to x. */
const ROT3_111: Mat3 = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];

// --- Setting frames -------------------------------------------------------------------------------

const SAME: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** Monoclinic, c-unique (stored) → b-unique: z → y. Proper rotation. */
const MONOCLINIC_B: Mat3 = [
  [-1, 0, 0],
  [0, 0, 1],
  [0, 1, 0],
];
/** Orthorhombic: the axis along z (stored) moves to x (cyclic x → y → z → x). */
const ORTHO_TO_A: Mat3 = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];
/** Orthorhombic: the axis along z (stored) moves to y (cyclic x → z → y → x). */
const ORTHO_TO_B: Mat3 = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
];
const ROT45_Z = rotationZ(45);
const ROT30_Z = rotationZ(30);

// --- Helpers ---------------------------------------------------------------------------------------

const ops = (...matrices: Mat3[]): Operation[] => matrices.map(operation);

/** A setting whose symbols are the same in both conventions. */
function setting(frame: Mat3, short: string, full: string, uniqueAxis?: 'a' | 'b' | 'c'): SettingData {
  const forms = { short, full };
  return uniqueAxis ? { frame, uniqueAxis, itc: forms, birss: forms } : { frame, itc: forms, birss: forms };
}

/** A group with one setting whose symbols agree in both conventions. */
function group(
  key: PointGroupKey,
  crystalSystem: CrystalSystem,
  schoenflies: string,
  generators: Operation[],
  full: string = key,
): PointGroupData {
  return { key, crystalSystem, schoenflies, generators, settings: [setting(SAME, key, full)], itcDefault: 1 };
}

/**
 * Trigonal and hexagonal groups whose two settings differ by 30° about z. Symbol position 2 means
 * the a direction (x) in ITC and the y direction in Birss, so each frame carries, in one
 * convention, the symbol the other convention gives to the other frame (docs/conventions.md).
 * `secondary` is the ITC symbol with the lateral elements in the a direction; ITC's default is
 * that frame, setting 2. Birss's default, setting 1, carries Birss's printed short symbol, the key.
 */
function trigonalPair(
  key: PointGroupKey,
  crystalSystem: CrystalSystem,
  schoenflies: string,
  generators: Operation[],
  secondary: SymbolForms,
  tertiary: SymbolForms,
): PointGroupData {
  return {
    key,
    crystalSystem,
    schoenflies,
    generators,
    settings: [
      { frame: SAME, itc: tertiary, birss: { short: key, full: secondary.full } },
      { frame: ROT30_Z, itc: secondary, birss: tertiary },
    ],
    itcDefault: 2,
  };
}

function monoclinic(key: PointGroupKey, schoenflies: string, generators: Operation[], full: (axis: string) => string) {
  const data: PointGroupData = {
    key,
    crystalSystem: 'monoclinic',
    schoenflies,
    generators,
    settings: [setting(SAME, key, full('c'), 'c'), setting(MONOCLINIC_B, key, full('b'), 'b')],
    itcDefault: 2,
  };
  return data;
}

// --- The 32 crystal classes -----------------------------------------------------------------------

export const POINT_GROUP_DATA: readonly PointGroupData[] = [
  group('1', 'triclinic', 'C1', []),
  group('-1', 'triclinic', 'Ci', ops(INVERSION)),

  monoclinic('2', 'C2', ops(ROT2_Z), (u) => (u === 'c' ? '1 1 2' : '1 2 1')),
  monoclinic('m', 'Cs', ops(MIRROR_Z), (u) => (u === 'c' ? '1 1 m' : '1 m 1')),
  monoclinic('2/m', 'C2h', ops(ROT2_Z, INVERSION), (u) => (u === 'c' ? '1 1 2/m' : '1 2/m 1')),

  group('222', 'orthorhombic', 'D2', ops(ROT2_Z, ROT2_X), '2 2 2'),
  {
    key: 'mm2',
    crystalSystem: 'orthorhombic',
    schoenflies: 'C2v',
    generators: ops(ROT2_Z, MIRROR_X),
    settings: [
      setting(SAME, 'mm2', 'm m 2', 'c'),
      setting(ORTHO_TO_A, '2mm', '2 m m', 'a'),
      setting(ORTHO_TO_B, 'm2m', 'm 2 m', 'b'),
    ],
    itcDefault: 1,
  },
  group('mmm', 'orthorhombic', 'D2h', ops(ROT2_Z, ROT2_X, INVERSION), '2/m 2/m 2/m'),

  group('4', 'tetragonal', 'C4', ops(ROT4_Z)),
  group('-4', 'tetragonal', 'S4', ops(ROTINV4_Z)),
  group('4/m', 'tetragonal', 'C4h', ops(ROT4_Z, INVERSION)),
  group('422', 'tetragonal', 'D4', ops(ROT4_Z, ROT2_X), '4 2 2'),
  group('4mm', 'tetragonal', 'C4v', ops(ROT4_Z, MIRROR_X), '4 m m'),
  {
    key: '-42m',
    crystalSystem: 'tetragonal',
    schoenflies: 'D2d',
    generators: ops(ROTINV4_Z, ROT2_X),
    settings: [setting(SAME, '-42m', '-4 2 m'), setting(ROT45_Z, '-4m2', '-4 m 2')],
    itcDefault: 1,
  },
  group('4/mmm', 'tetragonal', 'D4h', ops(ROT4_Z, ROT2_X, INVERSION), '4/m 2/m 2/m'),

  group('3', 'trigonal', 'C3', ops(ROT3_Z)),
  group('-3', 'trigonal', 'C3i', ops(ROTINV3_Z)),
  trigonalPair(
    '32',
    'trigonal',
    'D3',
    ops(ROT3_Z, ROT2_Y),
    { short: '321', full: '3 2 1' },
    { short: '312', full: '3 1 2' },
  ),
  trigonalPair(
    '3m',
    'trigonal',
    'C3v',
    ops(ROT3_Z, MIRROR_Y),
    { short: '3m1', full: '3 m 1' },
    { short: '31m', full: '3 1 m' },
  ),
  trigonalPair(
    '-3m',
    'trigonal',
    'D3d',
    ops(ROT3_Z, ROT2_Y, INVERSION),
    { short: '-3m1', full: '-3 2/m 1' },
    { short: '-31m', full: '-3 1 2/m' },
  ),

  group('6', 'hexagonal', 'C6', ops(ROT6_Z)),
  group('-6', 'hexagonal', 'C3h', ops(ROTINV6_Z)),
  group('6/m', 'hexagonal', 'C6h', ops(ROT6_Z, INVERSION)),
  group('622', 'hexagonal', 'D6', ops(ROT6_Z, ROT2_Y), '6 2 2'),
  group('6mm', 'hexagonal', 'C6v', ops(ROT6_Z, MIRROR_Y), '6 m m'),
  trigonalPair(
    '-6m2',
    'hexagonal',
    'D3h',
    ops(ROTINV6_Z, MIRROR_Y),
    { short: '-6m2', full: '-6 m 2' },
    { short: '-62m', full: '-6 2 m' },
  ),
  group('6/mmm', 'hexagonal', 'D6h', ops(ROT6_Z, ROT2_Y, INVERSION), '6/m 2/m 2/m'),

  group('23', 'cubic', 'T', ops(ROT2_Z, ROT2_X, ROT3_111), '2 3'),
  group('m-3', 'cubic', 'Th', ops(ROT2_Z, ROT2_X, ROT3_111, INVERSION), '2/m -3'),
  group('432', 'cubic', 'O', ops(ROT4_Z, ROT4_X, ROT3_111), '4 3 2'),
  group('-43m', 'cubic', 'Td', ops(ROTINV4_Z, ROT3_111, MIRROR_XY), '-4 3 m'),
  group('m-3m', 'cubic', 'Oh', ops(ROT4_Z, ROT4_X, ROT3_111, INVERSION), '4/m -3 2/m'),
];
