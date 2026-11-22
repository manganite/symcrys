/**
 * The 32 crystal classes in the ITC frame, exactly (#122, #137 A1): per class and ITC setting its
 * symbols, and the operations as ITA prints them, integer matrices W in the conventional basis
 * (x̃ = W·x), in ITA's order, built from ITA's selected generators. The Cartesian matrices are
 * derived, B·W·B⁻¹. Nothing here is derived from the Birss frame: the source is ITA's general
 * position (6th ed., Table 3.2.3.2) and its selected generators (5th ed., Part 7; `itaOrder.ts`).
 *
 * A setting that ITA does not print with generators is the printed one in another basis, W' = P⁻¹·W·P
 * with the change of basis P of ITA (2016) Table 1.5.4.4 (`2mm` and `m2m` from `mm2`: the settings
 * cab and bca); its operations keep the order of the printed setting.
 *
 * Internal; not yet wired into the API (#122, PR 2a). The setting indices are those of the current
 * API, until the settings are renumbered (#137 A4).
 */

import { crystalFamily, latticeBasis, type CrystalSystem } from '../lattice.js';
import { inverse, multiply, snap, type Mat3 } from '../linalg.js';
import type { PointGroupKey } from './data.js';
import { ITA_GENERATORS, type IntMat3 } from './itaOrder.js';

/** One ITC setting of a class. */
export interface ItcSetting {
  /** The index in the current API (#137 A4 renumbers). */
  readonly index: number;
  /** The ITC short symbol. */
  readonly short: string;
  /** The ITC full symbol, positions separated by single spaces. */
  readonly full: string;
  /** Monoclinic: the unique axis; `mm2`: the axis of the twofold rotation. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** The ITC default setting of the class. */
  readonly isDefault: boolean;
  /**
   * For a setting without printed generators: the printed setting it comes from (its index) and
   * the change of basis P, whose columns are the new basis vectors in the old basis.
   */
  readonly from?: { readonly index: number; readonly basis: IntMat3 };
}

/** A class with its crystal system and its ITC settings. */
export interface ItcClass {
  readonly key: PointGroupKey;
  readonly crystalSystem: CrystalSystem;
  readonly settings: readonly ItcSetting[];
}

/** ITA 2016 Table 1.5.4.4, setting cab: a′ = c, b′ = a, c′ = b (the columns of P). */
const SETTING_CAB: IntMat3 = [
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0],
];
/** ITA 2016 Table 1.5.4.4, setting bca: a′ = b, b′ = c, c′ = a (the columns of P). */
const SETTING_BCA: IntMat3 = [
  [0, 0, 1],
  [1, 0, 0],
  [0, 1, 0],
];

const one = (index: number, short: string, full = short): ItcSetting => ({ index, short, full, isDefault: true });

/** A class with one setting. */
const single = (key: PointGroupKey, crystalSystem: CrystalSystem, full: string = key): ItcClass => ({
  key,
  crystalSystem,
  settings: [one(1, key, full)],
});

/** A monoclinic class: setting 1 unique axis c, setting 2 unique axis b (the ITC default, ITA § 2.1.3.15). */
const monoclinic = (key: PointGroupKey, full: (inner: string) => string): ItcClass => ({
  key,
  crystalSystem: 'monoclinic',
  settings: [
    { index: 1, short: key, full: full('c'), uniqueAxis: 'c', isDefault: false },
    { index: 2, short: key, full: full('b'), uniqueAxis: 'b', isDefault: true },
  ],
});

/** A class with two orientations, setting `defaultIndex` the ITC default (docs/conventions.md, "Settings"). */
const pair = (
  key: PointGroupKey,
  crystalSystem: CrystalSystem,
  first: [string, string],
  second: [string, string],
  defaultIndex: 1 | 2,
): ItcClass => ({
  key,
  crystalSystem,
  settings: [
    { index: 1, short: first[0], full: first[1], isDefault: defaultIndex === 1 },
    { index: 2, short: second[0], full: second[1], isDefault: defaultIndex === 2 },
  ],
});

/** The 32 classes in the order of `POINT_GROUP_KEYS`, with the ITC symbols of ITA Table 3.2.3.2 (headlines). */
export const ITC_CLASSES: readonly ItcClass[] = [
  single('1', 'triclinic'),
  single('-1', 'triclinic'),
  monoclinic('2', (axis) => (axis === 'c' ? '1 1 2' : '1 2 1')),
  monoclinic('m', (axis) => (axis === 'c' ? '1 1 m' : '1 m 1')),
  monoclinic('2/m', (axis) => (axis === 'c' ? '1 1 2/m' : '1 2/m 1')),
  single('222', 'orthorhombic', '2 2 2'),
  {
    key: 'mm2',
    crystalSystem: 'orthorhombic',
    settings: [
      { index: 1, short: 'mm2', full: 'm m 2', uniqueAxis: 'c', isDefault: true },
      {
        index: 2,
        short: '2mm',
        full: '2 m m',
        uniqueAxis: 'a',
        isDefault: false,
        from: { index: 1, basis: SETTING_CAB },
      },
      {
        index: 3,
        short: 'm2m',
        full: 'm 2 m',
        uniqueAxis: 'b',
        isDefault: false,
        from: { index: 1, basis: SETTING_BCA },
      },
    ],
  },
  single('mmm', 'orthorhombic', '2/m 2/m 2/m'),
  single('4', 'tetragonal'),
  single('-4', 'tetragonal'),
  single('4/m', 'tetragonal'),
  single('422', 'tetragonal', '4 2 2'),
  single('4mm', 'tetragonal', '4 m m'),
  pair('-42m', 'tetragonal', ['-42m', '-4 2 m'], ['-4m2', '-4 m 2'], 1),
  single('4/mmm', 'tetragonal', '4/m 2/m 2/m'),
  single('3', 'trigonal'),
  single('-3', 'trigonal'),
  pair('32', 'trigonal', ['312', '3 1 2'], ['321', '3 2 1'], 2),
  pair('3m', 'trigonal', ['31m', '3 1 m'], ['3m1', '3 m 1'], 2),
  pair('-3m', 'trigonal', ['-31m', '-3 1 2/m'], ['-3m1', '-3 2/m 1'], 2),
  single('6', 'hexagonal'),
  single('-6', 'hexagonal'),
  single('6/m', 'hexagonal'),
  single('622', 'hexagonal', '6 2 2'),
  single('6mm', 'hexagonal', '6 m m'),
  pair('-6m2', 'hexagonal', ['-62m', '-6 2 m'], ['-6m2', '-6 m 2'], 2),
  single('6/mmm', 'hexagonal', '6/m 2/m 2/m'),
  single('23', 'cubic', '2 3'),
  single('m-3', 'cubic', '2/m -3'),
  single('432', 'cubic', '4 3 2'),
  single('-43m', 'cubic', '-4 3 m'),
  single('m-3m', 'cubic', '4/m -3 2/m'),
];

const BY_KEY = new Map(ITC_CLASSES.map((c) => [c.key, c]));

/** The class data of a key. */
export function itcClass(key: PointGroupKey): ItcClass {
  const c = BY_KEY.get(key);
  if (!c) throw new RangeError(`Unknown point group key: ${JSON.stringify(key)}`);
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

const IDENTITY: IntMat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** The inverse of an integer matrix of determinant ±1, exactly (the adjugate divided by ±1). */
function iinverse(m: IntMat3): IntMat3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (det !== 1 && det !== -1) throw new RangeError(`Not unimodular: ${JSON.stringify(m)}`);
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
  const gens = ITA_GENERATORS[`${key}#${index}`];
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
      const list: IntMat3[] = [IDENTITY];
      for (const g of itcLatticeGenerators(key, index)) {
        const h = list.slice();
        for (let power = g; !has(h, power); power = imul(power, g)) {
          if (list.length > 48) throw new Error(`The generators of ${key} setting ${index} give no point group`);
          for (const x of h) list.push(imul(power, x));
        }
      }
      ops = list;
    }
    operationCache.set(cacheKey, Object.freeze(ops));
  }
  return ops;
}

/**
 * W as a Cartesian matrix B·W·B⁻¹, snapped to the exact values. B is the basis of `latticeBasis` for
 * the families with fixed angles; for the monoclinic and triclinic families W itself (a, b, c along
 * x, y, z): their operations only negate the plane perpendicular to the unique axis, or every
 * direction, so B·W·B⁻¹ does not depend on the cell angles.
 */
export function cartesianOf(w: IntMat3, system: CrystalSystem): Mat3 {
  const family = crystalFamily(system);
  if (family === 'monoclinic' || family === 'triclinic') return snap(w as unknown as Mat3);
  const b = latticeBasis(family);
  return snap(multiply(multiply(b, w as unknown as Mat3), inverse(b)));
}

/** The operations of a setting as Cartesian matrices, in ITA's order. */
export function itcCartesianOperations(key: PointGroupKey, index: number): readonly Mat3[] {
  const system = itcClass(key).crystalSystem;
  return itcLatticeOperations(key, index).map((w) => cartesianOf(w, system));
}

/** ITA's selected generators of a setting as Cartesian matrices, in printed order. */
export function itcCartesianGenerators(key: PointGroupKey, index: number): readonly Mat3[] {
  const system = itcClass(key).crystalSystem;
  return itcLatticeGenerators(key, index).map((w) => cartesianOf(w, system));
}
