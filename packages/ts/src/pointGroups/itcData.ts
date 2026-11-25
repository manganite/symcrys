/**
 * The 32 crystal classes in the ITC frame, exactly (#122, #137 A1): per class and ITC setting its
 * symbols, and the operations as ITA prints them, integer matrices W in the conventional basis
 * (x̃ = W·x), in ITA's order, built from ITA's selected generators. The Cartesian matrices are
 * derived, B·W·B⁻¹. Nothing here is derived from the Birss frame: the source is ITA's selected
 * generators (5th ed., Part 7; `itaOrder.ts`); the general position of ITA 6th ed. Table 3.2.3.2 is
 * the print check (`itcData.reference.test.ts`).
 *
 * A setting that ITA does not print with generators is the printed one in another basis: with
 * (a′, b′, c′) = (a, b, c)·P, W′ = P⁻¹·W·P (ITA 2016 eqs. (1.5.1.4), (1.5.1.5), p. 76). `2mm` and
 * `m2m` come from `mm2` by the settings cab and bca of ITA 2016 Table 1.5.4.4 (§ 1.5.4.3, p. 96:
 * cab turns Pmm2 into P2mm); their operations keep the order of the printed setting.
 *
 * Internal; read by pointGroups.ts and orbits.ts (#122). The settings are numbered by the rule of
 * #137 A4 (`ItcSetting.index`).
 */

import { MAX_CLASS_ORDER } from '../tolerances.js';
import { shown } from '../checks.js';
import { crystalFamily, latticeBasis, type CrystalSystem } from '../lattice.js';
import { IDENTITY as LINEAR_IDENTITY, inverse, multiply, snap, type Mat3 } from '../linalg.js';
import type { PointGroupKey } from './keys.js';
import { LATTICE_SYMMETRY_DIRECTIONS, type Uvw } from '../symmetryDirections.js';
import { ITA_GENERATORS, type IntMat3 } from './itaOrder.js';

/** One ITC setting of a class. */
export interface ItcSetting {
  /**
   * 1-based, by the rule of #137 A4: the ITC default first; then monoclinic unique axis c (b is the
   * default); orthorhombic the orientations in the column order of ITA 2016 Table 1.5.4.4; the other
   * orientation of `-42m`, `-6m2` and the trigonal classes.
   */
  readonly index: number;
  /** The ITC short symbol. */
  readonly short: string;
  /** The ITC full symbol, positions separated by single spaces. */
  readonly full: string;
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
export interface ItcClass {
  readonly key: PointGroupKey;
  readonly crystalSystem: CrystalSystem;
  /** The Schoenflies symbol, as ITA Table 3.2.3.2 prints it. */
  readonly schoenflies: string;
  readonly settings: readonly ItcSetting[];
}

/**
 * Setting cab of ITA 2016 Table 1.5.4.4 (the table prints the setting symbols, not P): a′ = c,
 * b′ = a, c′ = b, the columns of P (eq. (1.5.1.4), p. 76; § 1.5.4.3, p. 96).
 */
const SETTING_CAB: IntMat3 = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
];
/** Setting bca of ITA 2016 Table 1.5.4.4: a′ = b, b′ = c, c′ = a, the columns of P (as for cab). */
const SETTING_BCA: IntMat3 = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];

const one = (index: number, short: string, full = short): ItcSetting => ({ index, short, full, isDefault: true });

/** A class with one setting. */
const single = (
  key: PointGroupKey,
  crystalSystem: CrystalSystem,
  schoenflies: string,
  full: string = key,
): ItcClass => ({
  key,
  crystalSystem,
  schoenflies,
  settings:
    crystalSystem === 'trigonal'
      ? [{ ...one(1, key, full), axes: 'hexagonal' }, rhombohedral(2, key, full)]
      : [one(1, key, full)],
});

/**
 * The setting of a trigonal class with rhombohedral axes (ITA Table 3.2.3.2, pp. 753–759): the
 * symbol ITA prints there, the operations from ITA's generators of the R group in rhombohedral axes.
 */
const rhombohedral = (index: number, short: string, full: string): ItcSetting => ({
  index,
  short,
  full,
  axes: 'rhombohedral',
  isDefault: false,
});

/**
 * A monoclinic class: setting 1 unique axis b (the ITC default, ITA § 2.1.3.15), setting 2 unique
 * axis c, both printed in ITA Table 3.2.3.2; setting 3 unique axis a, which ITA prints for the
 * space groups (Table 1.5.4.4) and ITC Vol. D for the point groups (`references/itc/orientations.md`),
 * from unique axis b by a′ = b, b′ = c, c′ = a (bca): the column abc of unique axis a in the
 * monoclinic part of ITA 2016 Table 1.5.4.4 (p. 97) is that of unique axis b so carried (C121 →
 * B211, P1c1 → Pb11).
 */
const monoclinic = (key: PointGroupKey, schoenflies: string): ItcClass => {
  const full = (position: number) => [0, 1, 2].map((i) => (i === position ? key : '1')).join(' ');
  return {
    key,
    crystalSystem: 'monoclinic',
    schoenflies,
    settings: [
      { index: 1, short: key, full: full(1), uniqueAxis: 'b', isDefault: true },
      { index: 2, short: key, full: full(2), uniqueAxis: 'c', isDefault: false },
      {
        index: 3,
        short: key,
        full: full(0),
        uniqueAxis: 'a',
        isDefault: false,
        from: { index: 1, basis: SETTING_BCA },
      },
    ],
  };
};

/**
 * A class with two orientations: the ITC default first (docs/conventions.md, "Settings"), then the
 * other one; with hexagonal axes for a trigonal class.
 */
const pair = (
  key: PointGroupKey,
  crystalSystem: CrystalSystem,
  schoenflies: string,
  standard: [string, string],
  other: [string, string],
  withRhombohedral?: [string, string],
): ItcClass => {
  const axes = crystalSystem === 'trigonal' ? ({ axes: 'hexagonal' } as const) : {};
  return {
    key,
    crystalSystem,
    schoenflies,
    settings: [
      { index: 1, short: standard[0], full: standard[1], ...axes, isDefault: true },
      { index: 2, short: other[0], full: other[1], ...axes, isDefault: false },
      ...(withRhombohedral ? [rhombohedral(3, withRhombohedral[0], withRhombohedral[1])] : []),
    ],
  };
};

/** The 32 classes in the order of `POINT_GROUP_KEYS`, with the ITC symbols of ITA Table 3.2.3.2 (headlines). */
export const ITC_CLASSES: readonly ItcClass[] = [
  single('1', 'triclinic', 'C1'),
  single('-1', 'triclinic', 'Ci'),
  monoclinic('2', 'C2'),
  monoclinic('m', 'Cs'),
  monoclinic('2/m', 'C2h'),
  single('222', 'orthorhombic', 'D2', '2 2 2'),
  {
    key: 'mm2',
    crystalSystem: 'orthorhombic',
    schoenflies: 'C2v',
    settings: [
      { index: 1, short: 'mm2', full: 'm m 2', isDefault: true },
      {
        index: 2,
        short: '2mm',
        full: '2 m m',
        isDefault: false,
        from: { index: 1, basis: SETTING_CAB },
      },
      {
        index: 3,
        short: 'm2m',
        full: 'm 2 m',
        isDefault: false,
        from: { index: 1, basis: SETTING_BCA },
      },
    ],
  },
  single('mmm', 'orthorhombic', 'D2h', '2/m 2/m 2/m'),
  single('4', 'tetragonal', 'C4'),
  single('-4', 'tetragonal', 'S4'),
  single('4/m', 'tetragonal', 'C4h'),
  single('422', 'tetragonal', 'D4', '4 2 2'),
  single('4mm', 'tetragonal', 'C4v', '4 m m'),
  pair('-42m', 'tetragonal', 'D2d', ['-42m', '-4 2 m'], ['-4m2', '-4 m 2']),
  single('4/mmm', 'tetragonal', 'D4h', '4/m 2/m 2/m'),
  single('3', 'trigonal', 'C3'),
  single('-3', 'trigonal', 'C3i'),
  pair('32', 'trigonal', 'D3', ['321', '3 2 1'], ['312', '3 1 2'], ['32', '3 2']),
  pair('3m', 'trigonal', 'C3v', ['3m1', '3 m 1'], ['31m', '3 1 m'], ['3m', '3 m']),
  pair('-3m', 'trigonal', 'D3d', ['-3m1', '-3 2/m 1'], ['-31m', '-3 1 2/m'], ['-3m', '-3 2/m']),
  single('6', 'hexagonal', 'C6'),
  single('-6', 'hexagonal', 'C3h'),
  single('6/m', 'hexagonal', 'C6h'),
  single('622', 'hexagonal', 'D6', '6 2 2'),
  single('6mm', 'hexagonal', 'C6v', '6 m m'),
  pair('-6m2', 'hexagonal', 'D3h', ['-6m2', '-6 m 2'], ['-62m', '-6 2 m']),
  single('6/mmm', 'hexagonal', 'D6h', '6/m 2/m 2/m'),
  single('23', 'cubic', 'T', '2 3'),
  single('m-3', 'cubic', 'Th', '2/m -3'),
  single('432', 'cubic', 'O', '4 3 2'),
  single('-43m', 'cubic', 'Td', '-4 3 m'),
  single('m-3m', 'cubic', 'Oh', '4/m -3 2/m'),
];

const BY_KEY = new Map(ITC_CLASSES.map((c) => [c.key, c]));

/** The class data of a key. */
export function itcClass(key: PointGroupKey): ItcClass {
  const c = BY_KEY.get(key);
  if (!c) throw new RangeError(`Unknown point group key: ${shown(key)}`);
  return c;
}

/** The setting of a class with this index. */
export function itcSetting(key: PointGroupKey, index: number): ItcSetting {
  const s = itcClass(key).settings.find((x) => x.index === index);
  if (!s) throw new RangeError(`Point group ${key} has no setting ${index}`);
  return s;
}

// --- exact integer matrices -----------------------------------------------------------------------

/** The product of two integer matrices; + 0 turns −0 into 0, so that equal matrices compare equal. */
const imul = (a: IntMat3, b: IntMat3): IntMat3 =>
  [0, 1, 2].map((i) =>
    [0, 1, 2].map((j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + 0),
  ) as unknown as IntMat3;

const iequal = (a: IntMat3, b: IntMat3): boolean => a.every((row, i) => row.every((x, j) => x === b[i][j]));

/** The inverse of an integer matrix of determinant ±1, exactly (the adjugate divided by ±1). */
function iinverse(m: IntMat3): IntMat3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (det !== 1 && det !== -1) throw new RangeError(`Not unimodular: ${shown(m)}`);
  const adj = [
    [e * i - f * h, c * h - b * i, b * f - c * e],
    [f * g - d * i, a * i - c * g, c * d - a * f],
    [d * h - e * g, b * g - a * h, a * e - b * d],
  ];
  return adj.map((row) => row.map((x) => x * det + 0)) as unknown as IntMat3;
}

/** W in the basis P: P⁻¹·W·P. */
const transform = (w: IntMat3, p: IntMat3): IntMat3 => imul(imul(iinverse(p), w), p);

/** ITA's selected generators of a setting, or those of the printed setting it comes from, carried by P. */
export function itcLatticeGenerators(key: PointGroupKey, index: number): readonly IntMat3[] {
  const s = itcSetting(key, index);
  if (s.from) return itcLatticeGenerators(key, s.from.index).map((w) => transform(w, s.from!.basis));
  const gens = ITA_GENERATORS[`${key}|${s.full}${s.axes === 'rhombohedral' ? '|rhombohedral' : ''}`];
  if (!gens) throw new Error(`No ITA generators for ${key} setting ${index}`);
  return gens;
}

const operationCache = new Map<string, readonly IntMat3[]>();

/**
 * The operations of a setting in ITA's order: starting from the identity, each generator g extends
 * the group H generated so far by the cosets gH, g²H, … until a power of g lies in H (ITA 5th ed.,
 * § 2.2.11 (iv), p. 27; § 8.3.5, p. 737). A setting carried from a printed one keeps its order.
 */
export function itcLatticeOperations(key: PointGroupKey, index: number): readonly IntMat3[] {
  const cacheKey = `${key}#${index}`;
  let ops = operationCache.get(cacheKey);
  if (!ops) {
    const s = itcSetting(key, index);
    if (s.from) {
      ops = itcLatticeOperations(key, s.from.index).map((w) => transform(w, s.from!.basis));
    } else {
      const has = (list: readonly IntMat3[], w: IntMat3) => list.some((x) => iequal(x, w));
      const list: IntMat3[] = [LINEAR_IDENTITY];
      for (const g of itcLatticeGenerators(key, index)) {
        const h = list.slice();
        for (let power = g; !has(h, power); power = imul(power, g)) {
          if (list.length > MAX_CLASS_ORDER)
            throw new Error(`The generators of ${key} setting ${index} give no point group`);
          for (const x of h) list.push(imul(power, x));
        }
      }
      // The cosets form a group only if each generator normalises the group built so far; check
      // closure, so that a mistake in the transcribed generators fails here rather than in a caller.
      for (const a of list) {
        for (const b of list) {
          if (!has(list, imul(a, b))) throw new Error(`The operations of ${key} setting ${index} are not closed`);
        }
      }
      ops = list;
    }
    operationCache.set(cacheKey, Object.freeze(ops));
  }
  return ops;
}

/**
 * The rhombohedral basis in the hexagonal one, the columns a_R = (2a + b + c)/3, b_R = (−a + b + c)/3,
 * c_R = (−a − 2b + c)/3: the obverse setting of ITA 2016 Table 1.5.1.1, p. 78, the matrix Q of R₁ obverse. In it the twofold axes of
 * 32 lie along the a directions of the hexagonal cell, as in 321, the ITC default.
 */
const RHOMBOHEDRAL_IN_HEXAGONAL: Mat3 = [
  [2 / 3, -1 / 3, -1 / 3],
  [1 / 3, 1 / 3, -2 / 3],
  [1 / 3, 1 / 3, 1 / 3],
];

/**
 * The conventional basis a, b, c (columns) of a setting in the Cartesian frame: that of
 * `latticeBasis`; for rhombohedral axes the obverse basis in the hexagonal frame of `latticeBasis`;
 * for the monoclinic and triclinic families a, b, c along x, y, z. The Cartesian matrices of the
 * point operations do not depend on the cell, and those of the Miller indices only through it
 * (docs/conventions.md, "Cartesian frame").
 */
export function itcBasis(key: PointGroupKey, index: number): Mat3 {
  const family = crystalFamily(itcClass(key).crystalSystem);
  if (family === 'monoclinic' || family === 'triclinic') return LINEAR_IDENTITY;
  const b = latticeBasis(family);
  return itcSetting(key, index).axes === 'rhombohedral' ? multiply(b, RHOMBOHEDRAL_IN_HEXAGONAL) : b;
}

/**
 * The symmetry directions of a setting, per position of its full symbol (ITA Table 2.1.3.1): those
 * of its family, and for rhombohedral axes [111]; [1-10], [01-1], [-101].
 */
export function itcSymmetryDirections(key: PointGroupKey, index: number): readonly (readonly Uvw[])[] {
  if (itcSetting(key, index).axes === 'rhombohedral') return RHOMBOHEDRAL_DIRECTIONS;
  return LATTICE_SYMMETRY_DIRECTIONS[crystalFamily(itcClass(key).crystalSystem)];
}

const RHOMBOHEDRAL_DIRECTIONS: readonly (readonly Uvw[])[] = Object.freeze(
  [
    [[1, 1, 1]],
    [
      [1, -1, 0],
      [0, 1, -1],
      [-1, 0, 1],
    ],
  ].map((dirs) => Object.freeze(dirs.map((d) => Object.freeze(d) as unknown as Uvw))),
);

/** W of a setting as a Cartesian matrix B·W·B⁻¹ in the basis `itcBasis`, snapped to the exact values. */
function cartesianOf(w: IntMat3, basis: Mat3): Mat3 {
  return snap(multiply(multiply(basis, w as unknown as Mat3), inverse(basis)));
}

/** The operations of a setting as Cartesian matrices, in ITA's order. */
export function itcCartesianOperations(key: PointGroupKey, index: number): readonly Mat3[] {
  const basis = itcBasis(key, index);
  return itcLatticeOperations(key, index).map((w) => cartesianOf(w, basis));
}

/** ITA's selected generators of a setting as Cartesian matrices, in printed order. */
export function itcCartesianGenerators(key: PointGroupKey, index: number): readonly Mat3[] {
  const basis = itcBasis(key, index);
  return itcLatticeGenerators(key, index).map((w) => cartesianOf(w, basis));
}

/**
 * The time reversal of each operation of a setting (in ITA's order) when ITA's generators carry
 * the time reversal `flags` (one per generator, in printed order), or undefined if no such group
 * exists: time reversal is then a homomorphism onto {1, 1'}, and the flags fix it, if they are
 * consistent. Exact, on the integer matrices.
 */
export function itcTimeReversal(key: PointGroupKey, index: number, flags: readonly boolean[]): boolean[] | undefined {
  const ops = itcLatticeOperations(key, index);
  const gens = itcLatticeGenerators(key, index);
  if (flags.length !== gens.length) throw new RangeError(`${key} setting ${index} has ${gens.length} generators`);
  const indexOf = (w: IntMat3) => ops.findIndex((x) => iequal(x, w));
  const parity: (boolean | undefined)[] = ops.map((_, i) => (i === 0 ? false : undefined));
  for (let queue = [0]; queue.length > 0;) {
    const i = queue.shift()!;
    for (const [k, g] of gens.entries()) {
      const j = indexOf(imul(g, ops[i]));
      const p = parity[i] !== flags[k];
      if (parity[j] === undefined) {
        parity[j] = p;
        queue.push(j);
      } else if (parity[j] !== p) return undefined;
    }
  }
  return parity as boolean[];
}
