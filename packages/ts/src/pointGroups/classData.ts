/**
 * The 32 crystal classes in the ITC frame, exactly: per class its crystal system, its Schoenflies
 * symbol and its ITC settings, and per setting the operations as ITA prints them, integer matrices
 * W in the conventional basis (x̃ = W·x), in ITA's order, built from ITA's selected generators. The
 * Cartesian matrices are derived, B·W·B⁻¹. Nothing here is derived from the Birss frame: the
 * source is ITA's selected generators (5th ed., Part 7; `generatorData.ts`); the general position
 * of ITA 6th ed. Table 3.2.3.2 is the print check (`classData.reference.test.ts`).
 *
 * A setting that ITA does not print with generators is the printed one in another basis: with
 * (a′, b′, c′) = (a, b, c)·P, W′ = P⁻¹·W·P (ITA 2016 eqs. (1.5.1.4), (1.5.1.5), p. 76). `2mm` and
 * `m2m` come from `mm2` by the settings cab and bca of ITA 2016 Table 1.5.4.4 (§ 1.5.4.3, p. 96:
 * cab turns Pmm2 into P2mm); their operations keep the order of the printed setting.
 *
 * The full and short symbols of the settings are computed from their operations
 * (classSymbols.ts). Internal. The settings are numbered by the rule given at `ClassSetting.index`.
 */

import { MAX_CLASS_ORDER } from '../tolerances.js';
import { OBVERSE_RHOMBOHEDRAL_BASIS, orthorhombicSettingBasis } from '../cellTransformation.js';
import { deepFreeze } from '../freeze.js';
import { shown } from '../checks.js';
import { crystalFamily, familyBasis, type CrystalSystem } from '../lattice.js';
import { IDENTITY as LINEAR_IDENTITY, inverse, multiply, snap, type Mat3 } from '../linalg.js';
import type { PointGroupKey } from './keys.js';
import { LATTICE_SYMMETRY_DIRECTIONS, type Uvw } from '../symmetryDirections.js';
import { SELECTED_GENERATORS, type IntMat3 } from './generatorData.js';
import {
  cosetsByGenerators,
  inverseMatrix,
  matricesEqual,
  multiplyMatrices,
  rationalInverse,
  type ExactOperation,
} from '../spaceGroups/affine.js';
import { isInteger, toNumber, ZERO } from '../spaceGroups/rational.js';

/**
 * One ITC setting of a class: what identifies it. Its symbols are computed from its operations
 * (classSymbols.ts).
 */
export interface ClassSetting {
  /**
   * 1-based: the ITC default first; then monoclinic unique axis c (b is the
   * default); orthorhombic the orientations in the column order of ITA 2016 Table 1.5.4.4; the other
   * orientation of `-42m`, `-6m2` and the trigonal classes.
   */
  readonly index: number;
  /** Monoclinic only: the unique axis. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** Trigonal only: the axes of the conventional basis. */
  readonly axes?: 'hexagonal' | 'rhombohedral';
  /** The ITC default setting of the class. */
  readonly isDefault: boolean;
  /**
   * For a setting without printed generators: the printed setting it comes from (its index) and
   * the change of basis P, whose columns are the new basis vectors in the old basis
   * ((a′, b′, c′) = (a, b, c)·P, ITA 2016 eq. (1.5.1.4), p. 76).
   */
  readonly from?: { readonly index: number; readonly basis: IntMat3 };
}

/** A class with its crystal system and its ITC settings. */
export interface ClassData {
  readonly key: PointGroupKey;
  readonly crystalSystem: CrystalSystem;
  /**
   * The Schoenflies symbol, as ITA Table 3.2.3.2 prints it: vocabulary, one name per class
   * (GUIDE.md, "Own structure").
   */
  readonly schoenflies: string;
  readonly settings: readonly ClassSetting[];
}

/**
 * The settings cab (a′ = c, b′ = a, c′ = b) and bca (a′ = b, b′ = c, c′ = a) of ITA 2016 Table
 * 1.5.4.4 (the table prints the setting symbols, not P), the columns of P (eq. (1.5.1.4), p. 76;
 * § 1.5.4.3, p. 96), from `orthorhombicSettingBasis`.
 */
const SETTING_CAB = orthorhombicSettingBasis('cab') as unknown as IntMat3;
const SETTING_BCA = orthorhombicSettingBasis('bca') as unknown as IntMat3;

/**
 * The setting of a trigonal class with rhombohedral axes (ITA Table 3.2.3.2, pp. 753–759), the
 * operations from ITA's generators of the R group in rhombohedral axes.
 */
const rhombohedral = (index: number): ClassSetting => ({ index, axes: 'rhombohedral', isDefault: false });

/** A class with one setting; a trigonal class with hexagonal and with rhombohedral axes. */
const single = (key: PointGroupKey, crystalSystem: CrystalSystem, schoenflies: string): ClassData => ({
  key,
  crystalSystem,
  schoenflies,
  settings:
    crystalSystem === 'trigonal'
      ? [{ index: 1, axes: 'hexagonal', isDefault: true }, rhombohedral(2)]
      : [{ index: 1, isDefault: true }],
});

/**
 * A monoclinic class: setting 1 unique axis b (the ITC default, ITA § 2.1.3.15), setting 2 unique
 * axis c, both printed in ITA Table 3.2.3.2; setting 3 unique axis a, which ITA prints for the
 * space groups (Table 1.5.4.4) and ITC Vol. D for the point groups (`references/itc/orientations.md`),
 * from unique axis b by a′ = b, b′ = c, c′ = a (bca): the column abc of unique axis a in the
 * monoclinic part of ITA 2016 Table 1.5.4.4 (p. 97) is that of unique axis b so carried (C121 →
 * B211, P1c1 → Pb11).
 */
const monoclinic = (key: PointGroupKey, schoenflies: string): ClassData => ({
  key,
  crystalSystem: 'monoclinic',
  schoenflies,
  settings: [
    { index: 1, uniqueAxis: 'b', isDefault: true },
    { index: 2, uniqueAxis: 'c', isDefault: false },
    { index: 3, uniqueAxis: 'a', isDefault: false, from: { index: 1, basis: SETTING_BCA } },
  ],
});

/**
 * A class with two orientations, both printed in ITA Table 3.2.3.2: the ITC default first
 * (docs/conventions.md, "Settings"), then the other one (the entries of `SELECTED_GENERATORS` name
 * which); a trigonal class with hexagonal axes, and then with rhombohedral axes.
 */
const pair = (key: PointGroupKey, crystalSystem: CrystalSystem, schoenflies: string): ClassData => {
  const trigonal = crystalSystem === 'trigonal';
  const axes = trigonal ? ({ axes: 'hexagonal' } as const) : {};
  return {
    key,
    crystalSystem,
    schoenflies,
    settings: [
      { index: 1, ...axes, isDefault: true },
      { index: 2, ...axes, isDefault: false },
      ...(trigonal ? [rhombohedral(3)] : []),
    ],
  };
};

/**
 * The 32 classes in the order of `POINT_GROUP_KEYS`, with the crystal systems and Schoenflies
 * symbols of ITA Table 3.2.3.2 (headlines).
 */
export const CLASSES: readonly ClassData[] = [
  single('1', 'triclinic', 'C1'),
  single('-1', 'triclinic', 'Ci'),
  monoclinic('2', 'C2'),
  monoclinic('m', 'Cs'),
  monoclinic('2/m', 'C2h'),
  single('222', 'orthorhombic', 'D2'),
  {
    key: 'mm2',
    crystalSystem: 'orthorhombic',
    schoenflies: 'C2v',
    settings: [
      { index: 1, isDefault: true },
      // 2mm and m2m
      { index: 2, isDefault: false, from: { index: 1, basis: SETTING_CAB } },
      { index: 3, isDefault: false, from: { index: 1, basis: SETTING_BCA } },
    ],
  },
  single('mmm', 'orthorhombic', 'D2h'),
  single('4', 'tetragonal', 'C4'),
  single('-4', 'tetragonal', 'S4'),
  single('4/m', 'tetragonal', 'C4h'),
  single('422', 'tetragonal', 'D4'),
  single('4mm', 'tetragonal', 'C4v'),
  pair('-42m', 'tetragonal', 'D2d'), // -42m, -4m2
  single('4/mmm', 'tetragonal', 'D4h'),
  single('3', 'trigonal', 'C3'),
  single('-3', 'trigonal', 'C3i'),
  pair('32', 'trigonal', 'D3'), // 321, 312, 32 with rhombohedral axes
  pair('3m', 'trigonal', 'C3v'), // 3m1, 31m, 3m
  pair('-3m', 'trigonal', 'D3d'), // -3m1, -31m, -3m
  single('6', 'hexagonal', 'C6'),
  single('-6', 'hexagonal', 'C3h'),
  single('6/m', 'hexagonal', 'C6h'),
  single('622', 'hexagonal', 'D6'),
  single('6mm', 'hexagonal', 'C6v'),
  pair('-6m2', 'hexagonal', 'D3h'), // -6m2, -62m
  single('6/mmm', 'hexagonal', 'D6h'),
  single('23', 'cubic', 'T'),
  single('m-3', 'cubic', 'Th'),
  single('432', 'cubic', 'O'),
  single('-43m', 'cubic', 'Td'),
  single('m-3m', 'cubic', 'Oh'),
];

const BY_KEY = new Map(CLASSES.map((c) => [c.key, c]));

/** The class data of a key. */
export function classData(key: PointGroupKey): ClassData {
  const c = BY_KEY.get(key);
  if (!c) throw new RangeError(`Unknown point group key: ${shown(key)}`);
  return c;
}

/** The setting of a class with this index. */
export function classSettingData(key: PointGroupKey, index: number): ClassSetting {
  const s = classData(key).settings.find((x) => x.index === index);
  if (!s) throw new RangeError(`Point group ${key} has no setting ${index}`);
  return s;
}

// --- exact integer matrices (spaceGroups/affine.ts) ---------------------------------------------

/** W in the basis P: P⁻¹·W·P. */
const transform = (w: IntMat3, p: IntMat3): IntMat3 =>
  multiplyMatrices(multiplyMatrices(inverseMatrix(p), w), p) as unknown as IntMat3;

/** A matrix as a point operation (W, 0), for the exact group arithmetic of affine.ts. */
const asOperation = (w: IntMat3): ExactOperation => ({ matrix: w, translation: [ZERO, ZERO, ZERO] });

/**
 * The key of a printed setting in `SELECTED_GENERATORS`: `key|index`, with the unique axis or the
 * axes of the setting (`2|2|unique axis c`, `32|3|rhombohedral axes`).
 */
export function generatorKey(key: PointGroupKey, s: ClassSetting): string {
  const axis = s.uniqueAxis ? `|unique axis ${s.uniqueAxis}` : s.axes ? `|${s.axes} axes` : '';
  return `${key}|${s.index}${axis}`;
}

/** ITA's selected generators of a setting, or those of the printed setting it comes from, carried by P. */
export function settingLatticeGenerators(key: PointGroupKey, index: number): readonly IntMat3[] {
  const s = classSettingData(key, index);
  if (s.from) return settingLatticeGenerators(key, s.from.index).map((w) => transform(w, s.from!.basis));
  const gens = SELECTED_GENERATORS[generatorKey(key, s)];
  if (!gens) throw new Error(`No ITA generators for ${key} setting ${index}`);
  return gens;
}

const operationCache = new Map<string, readonly IntMat3[]>();

/**
 * The operations of a setting in ITA's order, from ITA's selected generators by ITA's rule
 * (`cosetsByGenerators`). A setting carried from a printed one keeps its order.
 */
export function settingLatticeOperations(key: PointGroupKey, index: number): readonly IntMat3[] {
  const cacheKey = `${key}#${index}`;
  let ops = operationCache.get(cacheKey);
  if (!ops) {
    const s = classSettingData(key, index);
    if (s.from) {
      ops = settingLatticeOperations(key, s.from.index).map((w) => transform(w, s.from!.basis));
    } else {
      // ITA's rule, as for the plane groups; a point operation has no translation.
      try {
        ops = cosetsByGenerators(settingLatticeGenerators(key, index).map(asOperation), 3, MAX_CLASS_ORDER).map(
          (op) => op.matrix as unknown as IntMat3,
        );
      } catch (e) {
        throw new Error(`${key} setting ${index}: ${(e as Error).message}`, { cause: e });
      }
    }
    operationCache.set(cacheKey, Object.freeze(ops));
  }
  return ops;
}

/**
 * The rhombohedral basis in the hexagonal one, the columns a_R, b_R, c_R of the obverse setting
 * (`OBVERSE_RHOMBOHEDRAL_BASIS`, cellTransformation.ts), as numbers. In it the twofold axes of 32
 * lie along the a directions of the hexagonal cell, as in 321, the ITC default.
 */
const RHOMBOHEDRAL_IN_HEXAGONAL: Mat3 = deepFreeze(
  OBVERSE_RHOMBOHEDRAL_BASIS.map((row) => row.map((x) => toNumber(x))) as unknown as Mat3,
);

/**
 * The hexagonal basis in the rhombohedral one, the inverse of `OBVERSE_RHOMBOHEDRAL_BASIS`: an
 * integer matrix, as the hexagonal cell is a triple cell of the rhombohedral lattice.
 */
export const HEXAGONAL_IN_RHOMBOHEDRAL: IntMat3 = deepFreeze(
  rationalInverse(OBVERSE_RHOMBOHEDRAL_BASIS).map((row) =>
    row.map((x) => {
      if (!isInteger(x)) throw new Error('The hexagonal basis in the rhombohedral one is not integer');
      return x[0];
    }),
  ) as unknown as IntMat3,
);

/**
 * The conventional basis a, b, c (columns) of a setting in the Cartesian frame: that of
 * `latticeBasis`; for rhombohedral axes the obverse basis in the hexagonal frame of `latticeBasis`;
 * for the monoclinic and triclinic families a, b, c along x, y, z. The Cartesian matrices of the
 * point operations do not depend on the cell, and those of the Miller indices only through it
 * (docs/conventions.md, "Cartesian frame").
 */
export function settingBasis(key: PointGroupKey, index: number): Mat3 {
  const family = crystalFamily(classData(key).crystalSystem);
  if (family === 'monoclinic' || family === 'triclinic') return LINEAR_IDENTITY;
  const b = familyBasis(family);
  return classSettingData(key, index).axes === 'rhombohedral' ? multiply(b, RHOMBOHEDRAL_IN_HEXAGONAL) : b;
}

/**
 * The symmetry directions of a setting, per position of its full symbol (ITA Table 2.1.3.1): those
 * of its family, and for rhombohedral axes those of the first two positions of the hexagonal
 * family in the rhombohedral basis, u_R = P⁻¹·u: [111]; [1-10], [01-1], [-101].
 */
export function settingSymmetryDirections(key: PointGroupKey, index: number): readonly (readonly Uvw[])[] {
  if (classSettingData(key, index).axes === 'rhombohedral') return RHOMBOHEDRAL_DIRECTIONS;
  return LATTICE_SYMMETRY_DIRECTIONS[crystalFamily(classData(key).crystalSystem)];
}

// The symbol of a setting with rhombohedral axes has two positions, the main axis and the secondary
// directions; their images under the integer matrix P⁻¹ are primitive (a test compares them with
// the row "Rhombohedral (rhombohedral axes)" of Table 2.1.3.1).
const RHOMBOHEDRAL_DIRECTIONS: readonly (readonly Uvw[])[] = deepFreeze(
  LATTICE_SYMMETRY_DIRECTIONS.hexagonal
    .slice(0, 2)
    .map((dirs) =>
      dirs.map(
        (u) =>
          HEXAGONAL_IN_RHOMBOHEDRAL.map((row) => row[0] * u[0] + row[1] * u[1] + row[2] * u[2] + 0) as unknown as Uvw,
      ),
    ),
);

/** W of a setting as a Cartesian matrix B·W·B⁻¹ in the basis `settingBasis`, snapped to the exact values. */
function cartesianOf(w: IntMat3, basis: Mat3): Mat3 {
  return snap(multiply(multiply(basis, w as unknown as Mat3), inverse(basis)));
}

/** The operations of a setting as Cartesian matrices, in ITA's order. */
export function settingCartesianOperations(key: PointGroupKey, index: number): readonly Mat3[] {
  const basis = settingBasis(key, index);
  return settingLatticeOperations(key, index).map((w) => cartesianOf(w, basis));
}

/** ITA's selected generators of a setting as Cartesian matrices, in printed order. */
export function settingCartesianGenerators(key: PointGroupKey, index: number): readonly Mat3[] {
  const basis = settingBasis(key, index);
  return settingLatticeGenerators(key, index).map((w) => cartesianOf(w, basis));
}

/**
 * The time reversal of each operation of a setting (in ITA's order) when ITA's generators carry
 * the time reversal `flags` (one per generator, in printed order), or undefined if no such group
 * exists: time reversal is then a homomorphism onto {1, 1'}, and the flags fix it, if they are
 * consistent. Exact, on the integer matrices.
 */
export function settingTimeReversal(
  key: PointGroupKey,
  index: number,
  flags: readonly boolean[],
): boolean[] | undefined {
  const ops = settingLatticeOperations(key, index);
  const gens = settingLatticeGenerators(key, index);
  if (flags.length !== gens.length) throw new RangeError(`${key} setting ${index} has ${gens.length} generators`);
  const indexOf = (w: IntMat3) => ops.findIndex((x) => matricesEqual(x, w));
  const parity: (boolean | undefined)[] = ops.map((_, i) => (i === 0 ? false : undefined));
  for (let queue = [0]; queue.length > 0;) {
    const i = queue.shift()!;
    for (const [k, g] of gens.entries()) {
      const j = indexOf(multiplyMatrices(g, ops[i]) as unknown as IntMat3);
      const p = parity[i] !== flags[k];
      if (parity[j] === undefined) {
        parity[j] = p;
        queue.push(j);
      } else if (parity[j] !== p) return undefined;
    }
  }
  return parity as boolean[];
}
