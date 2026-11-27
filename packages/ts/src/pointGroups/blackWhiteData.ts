/**
 * The 58 black-and-white magnetic point groups in the ITC frame. A black-and-white group is its
 * crystal class with half of the operations combined with time reversal (ITC Vol. D, § 1.5.2.1).
 * Data: for each group its crystal class, the frame (setting of the class) of its ITC default
 * setting, and which of ITA's selected generators of that frame carry time reversal (the
 * time-reversal assignment, GUIDE.md §3). Everything else is computed: the operations, the
 * further settings (the orientations ITC prints, by the rule of docs/conventions.md, "Settings of
 * the magnetic groups"), the symbols (magneticSymbols.ts) and the Schoenflies symbol G(H).
 *
 * Print anchors (tests): the symbols of the ITC default settings and their operations are those of
 * ITC Vol. D Table 1.5.2.3 (pp. 111–112; `blackWhiteData.reference.test.ts`,
 * `magnetic.reference.test.ts`). Every other setting is an orientation ITC prints
 * (`references/itc/orientations.md`); where a transcribed table prints it (Tables 1.5.2.4, 1.5.7.1,
 * 1.5.8.1) the tests compare it with print.
 *
 * Internal.
 */

import { shown } from '../checks.js';
import { crystalFamily } from '../lattice.js';
import { det, multiply, trace, transpose, type Mat3 } from '../linalg.js';
import type { CartesianOperation } from '../operations.js';
import type { BlackWhitePointGroupKey, PointGroupKey } from './keys.js';
import { CLASSES, classData, settingCartesianOperations, settingTimeReversal } from './classData.js';
import { primedSymbols } from './magneticSymbols.js';

/** One ITC setting of a black-and-white group. */
export interface BlackWhiteSetting {
  /** 1-based, in the order of the settings (`bw` below). */
  readonly index: number;
  /** The ITC full symbol with primes, positions separated by single spaces. */
  readonly full: string;
  /** Monoclinic only: the unique axis. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** Trigonal only: the axes of the conventional basis. */
  readonly axes?: 'hexagonal' | 'rhombohedral';
  /** The ITC default setting of the group. */
  readonly isDefault: boolean;
  /** The setting of the crystal class that is the frame of this setting. */
  readonly classIndex: number;
  /** The time reversal of each operation of that setting of the class, in ITA's order. */
  readonly timeReversal: readonly boolean[];
}

/** A black-and-white group with its crystal class and its ITC settings. */
export interface BlackWhiteGroup {
  readonly key: BlackWhitePointGroupKey;
  readonly crystalClass: PointGroupKey;
  /** Schoenflies symbol G(H), H the subgroup without time reversal (ITC Vol. D Table 1.5.2.3). */
  readonly schoenflies: string;
  readonly settings: readonly BlackWhiteSetting[];
}

/** The data of a group: its class, the frame of its default setting, and the generators with time reversal. */
type GroupData = readonly [
  key: BlackWhitePointGroupKey,
  crystalClass: PointGroupKey,
  frame: number,
  primedGenerators: readonly boolean[],
];

/**
 * The 58 groups in the order of `BLACK_WHITE_POINT_GROUP_KEYS`: crystal class, the setting of the
 * class that is the frame of the ITC default, and for each of ITA's selected generators of that
 * setting, in their order, whether it carries time reversal.
 */
const DATA: readonly GroupData[] = [
  ["-1'", '-1', 1, [true]],
  ["2'", '2', 1, [true]],
  ["m'", 'm', 1, [true]],
  ["2'/m'", '2/m', 1, [true, false]],
  ["2/m'", '2/m', 1, [false, true]],
  ["2'/m", '2/m', 1, [true, true]],
  ["2'2'2", '222', 1, [false, true]],
  ["m'm'2", 'mm2', 1, [false, true]],
  ["2'm'm", 'mm2', 2, [true, false]],
  ["mm'm'", 'mmm', 1, [true, true, false]],
  ["m'm'm'", 'mmm', 1, [false, false, true]],
  ["mmm'", 'mmm', 1, [false, true, true]],
  ["4'", '4', 1, [false, true]],
  ["-4'", '-4', 1, [false, true]],
  ["4'/m", '4/m', 1, [false, true, false]],
  ["4/m'", '4/m', 1, [false, false, true]],
  ["4'/m'", '4/m', 1, [false, true, true]],
  ["4'22'", '422', 1, [false, true, false]],
  ["42'2'", '422', 1, [false, false, true]],
  ["4'mm'", '4mm', 1, [false, true, false]],
  ["4m'm'", '4mm', 1, [false, false, true]],
  ["-4'2m'", '-42m', 1, [false, true, false]],
  ["-4'm2'", '-42m', 2, [false, true, false]],
  ["-42'm'", '-42m', 1, [false, false, true]],
  ["4'/mmm'", '4/mmm', 1, [false, true, false, false]],
  ["4/mm'm'", '4/mmm', 1, [false, false, true, false]],
  ["4/m'm'm'", '4/mmm', 1, [false, false, false, true]],
  ["4/m'mm", '4/mmm', 1, [false, false, true, true]],
  ["4'/m'm'm", '4/mmm', 1, [false, true, false, true]],
  ["-3'", '-3', 1, [false, true]],
  ["32'", '32', 1, [false, true]],
  ["3m'", '3m', 1, [false, true]],
  ["-3m'", '-3m', 1, [false, true, false]],
  ["-3'm'", '-3m', 1, [false, false, true]],
  ["-3'm", '-3m', 1, [false, true, true]],
  ["6'", '6', 1, [false, true]],
  ["-6'", '-6', 1, [false, true]],
  ["6'/m'", '6/m', 1, [false, true, false]],
  ["6/m'", '6/m', 1, [false, false, true]],
  ["6'/m", '6/m', 1, [false, true, true]],
  ["6'22'", '622', 1, [false, true, false]],
  ["62'2'", '622', 1, [false, false, true]],
  ["6'mm'", '6mm', 1, [false, true, false]],
  ["6m'm'", '6mm', 1, [false, false, true]],
  ["-6'2m'", '-6m2', 2, [false, true, false]],
  ["-6'm2'", '-6m2', 1, [false, true, false]],
  ["-6m'2'", '-6m2', 1, [false, false, true]],
  ["6'/m'mm'", '6/mmm', 1, [false, true, false, false]],
  ["6/mm'm'", '6/mmm', 1, [false, false, true, false]],
  ["6/m'm'm'", '6/mmm', 1, [false, false, false, true]],
  ["6/m'mm", '6/mmm', 1, [false, false, true, true]],
  ["6'/mmm'", '6/mmm', 1, [false, true, true, true]],
  ["m'-3'", 'm-3', 1, [false, false, false, true]],
  ["4'32'", '432', 1, [false, false, false, true]],
  ["-4'3m'", '-43m', 1, [false, false, false, true]],
  ["m-3m'", 'm-3m', 1, [false, false, false, true, false]],
  ["m'-3'm'", 'm-3m', 1, [false, false, false, false, true]],
  ["m'-3'm", 'm-3m', 1, [false, false, false, true, true]],
];

/**
 * The orthorhombic orientations of ITA 2016 Table 1.5.4.4 in its column order (abc, ba-c, cab,
 * -cba, bca, a-cb), as the matrices P whose columns are the new basis vectors in the old
 * (eq. (1.5.1.4), p. 76); in the orthonormal frame of the orthorhombic family an operation W of the
 * old frame is P⁻¹WP = PᵀWP in the new one.
 */
const ORTHORHOMBIC_ORIENTATIONS: readonly Mat3[] = [
  [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0],
  ],
  [
    [0, 0, 1],
    [0, 1, 0],
    [-1, 0, 0],
  ],
  [
    [0, 0, 1],
    [1, 0, 0],
    [0, 1, 0],
  ],
  [
    [1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ],
] as unknown as Mat3[];

/** The rotation about z by an angle (radians). */
const rotationZ = (angle: number): Mat3 =>
  [
    [Math.cos(angle), -Math.sin(angle), 0],
    [Math.sin(angle), Math.cos(angle), 0],
    [0, 0, 1],
  ] as unknown as Mat3;

const near = (a: Mat3, b: Mat3): boolean => a.every((row, i) => row.every((x, j) => Math.abs(x - b[i][j]) < 1e-9));

/** A frame of a group: the setting of its class and the time reversal of each of its operations, in ITA's order. */
interface Frame {
  readonly classIndex: number;
  readonly timeReversal: readonly boolean[];
}

/**
 * The frame of the class whose operations are `ops` (Cartesian, with time reversal) as a set, and
 * the time reversal in that frame's order; among the settings of the class with rhombohedral axes
 * only if `rhombohedral`. Undefined if no setting of the class has these operations.
 */
function frameOf(
  crystalClass: PointGroupKey,
  ops: readonly CartesianOperation[],
  rhombohedral: boolean,
): Frame | undefined {
  for (const s of classData(crystalClass).settings) {
    if ((s.axes === 'rhombohedral') !== rhombohedral) continue;
    const own = settingCartesianOperations(crystalClass, s.index);
    if (own.length !== ops.length) continue;
    const timeReversal = own.map((m) => ops.find((op) => near(op.cartesian, m))?.timeReversal);
    if (timeReversal.every((x) => x !== undefined))
      return { classIndex: s.index, timeReversal: timeReversal as boolean[] };
  }
  return undefined;
}

const operationsOf = (crystalClass: PointGroupKey, frame: Frame): CartesianOperation[] =>
  settingCartesianOperations(crystalClass, frame.classIndex).map((m, i) => ({
    cartesian: m,
    timeReversal: frame.timeReversal[i],
  }));

/**
 * The frames of a group's settings, in order (docs/conventions.md, "Settings of the magnetic
 * groups"): the default; monoclinic the unique axes b, c, a; orthorhombic the distinct orientations
 * of the default by Table 1.5.4.4 in its column order; tetragonal the default turned by 45° about z,
 * hexagonal and trigonal by 30°, where that gives other operations with time reversal; trigonal,
 * last, the rhombohedral axes in the frame of the hexagonal default.
 */
function framesOf(crystalClass: PointGroupKey, frame: number, primed: readonly boolean[]): Frame[] {
  const timeReversal = settingTimeReversal(crystalClass, frame, primed);
  if (!timeReversal) throw new Error(`${crystalClass}: the generators ${String(primed)} give no group`);
  const first: Frame = { classIndex: frame, timeReversal };
  const cls = classData(crystalClass);
  const family = crystalFamily(cls.crystalSystem);
  if (family === 'monoclinic') {
    return [1, 2, 3].map((axis) => {
      const index = cls.settings.findIndex((s) => s.uniqueAxis === (['b', 'c', 'a'] as const)[axis - 1]) + 1;
      const t = settingTimeReversal(crystalClass, index, primed)!;
      return { classIndex: index, timeReversal: t };
    });
  }
  const ops = operationsOf(crystalClass, first);
  const turned = (maps: readonly Mat3[]): Frame[] =>
    maps.map((p) => {
      const image = ops.map((op) => ({
        cartesian: multiply(multiply(transpose(p), op.cartesian), p),
        timeReversal: op.timeReversal,
      }));
      const found = frameOf(crystalClass, image, false);
      if (!found) throw new Error(`${crystalClass}: an orientation of the default is no setting of the class`);
      return found;
    });
  let frames: Frame[];
  if (family === 'orthorhombic') frames = turned(ORTHORHOMBIC_ORIENTATIONS);
  else if (family === 'tetragonal') frames = turned([rotationZ(0), rotationZ(Math.PI / 4)]);
  else if (family === 'hexagonal') frames = turned([rotationZ(0), rotationZ(Math.PI / 6)]);
  else frames = [first];
  const distinct = frames.filter(
    (f, i) =>
      frames.findIndex(
        (g) => g.classIndex === f.classIndex && g.timeReversal.every((x, k) => x === f.timeReversal[k]),
      ) === i,
  );
  if (cls.crystalSystem === 'trigonal') {
    const rhombohedral = frameOf(crystalClass, ops, true);
    if (!rhombohedral) throw new Error(`${crystalClass}: no setting with rhombohedral axes`);
    distinct.push(rhombohedral);
  }
  return distinct;
}

/** The Schoenflies symbol of a class as ITC Vol. D writes it (`S6` for `C3i`). */
const volumeD = (s: string): string => (s === 'C3i' ? 'S6' : s);

/**
 * The crystal class of a list of operations without time reversal: the one with the same numbers
 * of operations of each determinant and trace (they tell the 32 classes apart).
 */
function classOfOperations(ops: readonly Mat3[]): PointGroupKey {
  const signature = (list: readonly Mat3[]): string =>
    list
      .map((m) => `${Math.round(det(m))}:${Math.round(trace(m))}`)
      .sort()
      .join(' ');
  const s = signature(ops);
  const found = CLASSES.find((c) => signature(settingCartesianOperations(c.key, 1)) === s);
  if (!found) throw new Error('A subgroup that is no crystal class');
  return found.key;
}

function group(data: GroupData): BlackWhiteGroup {
  const [key, crystalClass, frame, primed] = data;
  const cls = classData(crystalClass);
  const frames = framesOf(crystalClass, frame, primed);
  const subgroup = operationsOf(crystalClass, frames[0])
    .filter((op) => !op.timeReversal)
    .map((op) => op.cartesian);
  return {
    key,
    crystalClass,
    schoenflies: `${volumeD(cls.schoenflies)}(${volumeD(classData(classOfOperations(subgroup)).schoenflies)})`,
    settings: frames.map((f, i) => {
      const classSetting = cls.settings.find((s) => s.index === f.classIndex)!;
      const full = primedSymbols(classSetting, cls.crystalSystem, operationsOf(crystalClass, f)).full;
      return {
        index: i + 1,
        full,
        ...(classSetting.uniqueAxis ? { uniqueAxis: classSetting.uniqueAxis } : {}),
        ...(classSetting.axes ? { axes: classSetting.axes } : {}),
        isDefault: i === 0,
        classIndex: f.classIndex,
        timeReversal: Object.freeze([...f.timeReversal]),
      };
    }),
  };
}

/** The 58 black-and-white groups in the order of `BLACK_WHITE_POINT_GROUP_KEYS`. */
export const BLACK_WHITE_GROUPS: readonly BlackWhiteGroup[] = DATA.map(group);

const BY_KEY = new Map<string, BlackWhiteGroup>(BLACK_WHITE_GROUPS.map((g) => [g.key, g]));

/** The ITC data of a black-and-white group. */
export function blackWhiteGroup(key: BlackWhitePointGroupKey): BlackWhiteGroup {
  const g = BY_KEY.get(key);
  if (!g) throw new RangeError(`Unknown black-and-white point group key: ${shown(key)}`);
  return g;
}

/** A setting of a black-and-white group. */
export function blackWhiteSetting(key: BlackWhitePointGroupKey, index: number): BlackWhiteSetting {
  const s = blackWhiteGroup(key).settings.find((x) => x.index === index);
  if (!s) throw new RangeError(`Point group ${key} has no setting ${index}`);
  return s;
}

/** The setting of the crystal class that a setting of the group lies in. */
export function blackWhiteClassSetting(key: BlackWhitePointGroupKey, index: number): number {
  return blackWhiteSetting(key, index).classIndex;
}

/** The operations of a setting: those of the class setting it lies in, in ITA's order, each with its time reversal. */
export function blackWhiteOperations(key: BlackWhitePointGroupKey, index: number): readonly CartesianOperation[] {
  const g = blackWhiteGroup(key);
  const s = blackWhiteSetting(key, index);
  return Object.freeze(operationsOf(g.crystalClass, s));
}
