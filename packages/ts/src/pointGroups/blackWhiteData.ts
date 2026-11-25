/**
 * The 58 black-and-white magnetic point groups in the ITC frame (#122, PR 2c): each setting is given
 * by its ITC full symbol with primes, nothing else. A black-and-white group is its crystal class
 * with half of the operations combined with time reversal (ITC Vol. D, § 1.5.2.1); its symbol in a
 * setting is the class's symbol in that setting with the primes of the operations it names
 * (magneticSymbols.ts). So the symbol without primes names the setting of the class
 * (classData.ts), and the time reversal of its operations is the one assignment, among those that
 * ITA's generators of the class allow, whose primed symbol is the stored one (checked unique).
 *
 * Print anchors (tests): the symbols of the ITC default settings and their operations are those of
 * ITC Vol. D Table 1.5.2.3 (pp. 111–112; `blackWhiteData.reference.test.ts`,
 * `magnetic.reference.test.ts`). Every other setting is an orientation ITC prints
 * (`references/itc/orientations.md`; CLAUDE.md, "Pure ITC"); where a transcribed table prints it
 * (Tables 1.5.2.4, 1.5.7.1, 1.5.8.1) the tests compare it with print.
 *
 * Internal.
 */

import { shown } from '../checks.js';
import { operation, type CartesianOperation } from '../operations.js';
import type { BlackWhitePointGroupKey, PointGroupKey } from './keys.js';
import { itcCartesianOperations, classData, itcLatticeGenerators, itcTimeReversal } from './classData.js';
import { primedSymbols } from './magneticSymbols.js';

/** One ITC setting of a black-and-white group. */
export interface BlackWhiteSetting {
  /** 1-based, in the order of #137 A4 (`bw` below). */
  readonly index: number;
  /** The ITC full symbol with primes, positions separated by single spaces. */
  readonly full: string;
  /** Monoclinic only: the unique axis. */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** Trigonal only: the axes of the conventional basis. */
  readonly axes?: 'hexagonal' | 'rhombohedral';
  /** The ITC default setting of the group. */
  readonly isDefault: boolean;
}

/** A black-and-white group with its crystal class and its ITC settings. */
export interface BlackWhiteGroup {
  readonly key: BlackWhitePointGroupKey;
  readonly crystalClass: PointGroupKey;
  /** Schoenflies symbol G(H), H the subgroup without time reversal (ITC Vol. D Table 1.5.2.3). */
  readonly schoenflies: string;
  readonly settings: readonly BlackWhiteSetting[];
}

/**
 * A group with its settings, given by their ITC full symbols in the order of #137 A4: the ITC
 * default first; monoclinic unique axis b, then c, then a; orthorhombic the orientations of the default in
 * the column order of ITA 2016 Table 1.5.4.4 (abc, ba-c, cab, -cba, bca, a-cb), each once; otherwise
 * the other orientation; for a trigonal group, last, the setting with rhombohedral axes (marked so)
 * of the hexagonal setting 1, its symbol that of setting 1 without the trailing `1`. The unique axis of a monoclinic setting is the position of its symbol
 * that is not `1`; a trigonal setting has hexagonal axes.
 */
function bw(
  key: BlackWhitePointGroupKey,
  crystalClass: PointGroupKey,
  schoenflies: string,
  fullSymbols: readonly (string | readonly [string, 'rhombohedral'])[],
): BlackWhiteGroup {
  const system = classData(crystalClass).crystalSystem;
  return {
    key,
    crystalClass,
    schoenflies,
    settings: fullSymbols.map((entry, i) => {
      const full = typeof entry === 'string' ? entry : entry[0];
      const unique = full.split(' ').findIndex((t) => t !== '1');
      const axes = typeof entry === 'string' ? 'hexagonal' : 'rhombohedral';
      return {
        index: i + 1,
        full,
        ...(system === 'monoclinic' ? { uniqueAxis: (['a', 'b', 'c'] as const)[unique] } : {}),
        ...(system === 'trigonal' ? { axes } : {}),
        isDefault: i === 0,
      };
    }),
  };
}

/** The 58 black-and-white groups in the order of `BLACK_WHITE_POINT_GROUP_KEYS`. */
export const BLACK_WHITE_GROUPS: readonly BlackWhiteGroup[] = [
  bw("-1'", '-1', 'Ci(C1)', ["-1'"]),
  bw("2'", '2', 'C2(C1)', ["1 2' 1", "1 1 2'", "2' 1 1"]),
  bw("m'", 'm', 'Cs(C1)', ["1 m' 1", "1 1 m'", "m' 1 1"]),
  bw("2'/m'", '2/m', 'C2h(Ci)', ["1 2'/m' 1", "1 1 2'/m'", "2'/m' 1 1"]),
  bw("2/m'", '2/m', 'C2h(C2)', ["1 2/m' 1", "1 1 2/m'", "2/m' 1 1"]),
  bw("2'/m", '2/m', 'C2h(Cs)', ["1 2'/m 1", "1 1 2'/m", "2'/m 1 1"]),
  bw("2'2'2", '222', 'D2(C2)', ["2' 2' 2", "2 2' 2'", "2' 2 2'"]),
  bw("m'm'2", 'mm2', 'C2v(C2)', ["m' m' 2", "2 m' m'", "m' 2 m'"]),
  bw("2'm'm", 'mm2', 'C2v(Cs)', ["2' m' m", "m' 2' m", "m 2' m'", "m m' 2'", "m' m 2'", "2' m m'"]),
  bw("mm'm'", 'mmm', 'D2h(C2h)', ["2/m 2'/m' 2'/m'", "2'/m' 2/m 2'/m'", "2'/m' 2'/m' 2/m"]),
  bw("m'm'm'", 'mmm', 'D2h(D2)', ["2/m' 2/m' 2/m'"]),
  bw("mmm'", 'mmm', 'D2h(C2v)', ["2'/m 2'/m 2/m'", "2/m' 2'/m 2'/m", "2'/m 2/m' 2'/m"]),
  bw("4'", '4', 'C4(C2)', ["4'"]),
  bw("-4'", '-4', 'S4(C2)', ["-4'"]),
  bw("4'/m", '4/m', 'C4h(C2h)', ["4'/m"]),
  bw("4/m'", '4/m', 'C4h(C4)', ["4/m'"]),
  bw("4'/m'", '4/m', 'C4h(S4)', ["4'/m'"]),
  bw("4'22'", '422', 'D4(D2)', ["4' 2 2'", "4' 2' 2"]),
  bw("42'2'", '422', 'D4(C4)', ["4 2' 2'"]),
  bw("4'mm'", '4mm', 'C4v(C2v)', ["4' m m'", "4' m' m"]),
  bw("4m'm'", '4mm', 'C4v(C4)', ["4 m' m'"]),
  bw("-4'2m'", '-42m', 'D2d(D2)', ["-4' 2 m'", "-4' m' 2"]),
  bw("-4'm2'", '-42m', 'D2d(C2v)', ["-4' m 2'", "-4' 2' m"]),
  bw("-42'm'", '-42m', 'D2d(S4)', ["-4 2' m'", "-4 m' 2'"]),
  bw("4'/mmm'", '4/mmm', 'D4h(D2h)', ["4'/m 2/m 2'/m'", "4'/m 2'/m' 2/m"]),
  bw("4/mm'm'", '4/mmm', 'D4h(C4h)', ["4/m 2'/m' 2'/m'"]),
  bw("4/m'm'm'", '4/mmm', 'D4h(D4)', ["4/m' 2/m' 2/m'"]),
  bw("4/m'mm", '4/mmm', 'D4h(C4v)', ["4/m' 2'/m 2'/m"]),
  bw("4'/m'm'm", '4/mmm', 'D4h(D2d)', ["4'/m' 2/m' 2'/m", "4'/m' 2'/m 2/m'"]),
  bw("-3'", '-3', 'S6(C3)', ["-3'", ["-3'", 'rhombohedral']]),
  bw("32'", '32', 'D3(C3)', ["3 2' 1", "3 1 2'", ["3 2'", 'rhombohedral']]),
  bw("3m'", '3m', 'C3v(C3)', ["3 m' 1", "3 1 m'", ["3 m'", 'rhombohedral']]),
  bw("-3m'", '-3m', 'D3d(S6)', ["-3 2'/m' 1", "-3 1 2'/m'", ["-3 2'/m'", 'rhombohedral']]),
  bw("-3'm'", '-3m', 'D3d(D3)', ["-3' 2/m' 1", "-3' 1 2/m'", ["-3' 2/m'", 'rhombohedral']]),
  bw("-3'm", '-3m', 'D3d(C3v)', ["-3' 2'/m 1", "-3' 1 2'/m", ["-3' 2'/m", 'rhombohedral']]),
  bw("6'", '6', 'C6(C3)', ["6'"]),
  bw("-6'", '-6', 'C3h(C3)', ["-6'"]),
  bw("6'/m'", '6/m', 'C6h(S6)', ["6'/m'"]),
  bw("6/m'", '6/m', 'C6h(C6)', ["6/m'"]),
  bw("6'/m", '6/m', 'C6h(C3h)', ["6'/m"]),
  bw("6'22'", '622', 'D6(D3)', ["6' 2 2'", "6' 2' 2"]),
  bw("62'2'", '622', 'D6(C6)', ["6 2' 2'"]),
  bw("6'mm'", '6mm', 'C6v(C3v)', ["6' m m'", "6' m' m"]),
  bw("6m'm'", '6mm', 'C6v(C6)', ["6 m' m'"]),
  bw("-6'2m'", '-6m2', 'D3h(D3)', ["-6' 2 m'", "-6' m' 2"]),
  bw("-6'm2'", '-6m2', 'D3h(C3v)', ["-6' m 2'", "-6' 2' m"]),
  bw("-6m'2'", '-6m2', 'D3h(C3h)', ["-6 m' 2'", "-6 2' m'"]),
  bw("6'/m'mm'", '6/mmm', 'D6h(D3d)', ["6'/m' 2/m 2'/m'", "6'/m' 2'/m' 2/m"]),
  bw("6/mm'm'", '6/mmm', 'D6h(C6h)', ["6/m 2'/m' 2'/m'"]),
  bw("6/m'm'm'", '6/mmm', 'D6h(D6)', ["6/m' 2/m' 2/m'"]),
  bw("6/m'mm", '6/mmm', 'D6h(C6v)', ["6/m' 2'/m 2'/m"]),
  bw("6'/mmm'", '6/mmm', 'D6h(D3h)', ["6'/m 2'/m 2/m'", "6'/m 2/m' 2'/m"]),
  bw("m'-3'", 'm-3', 'Th(T)', ["2/m' -3'"]),
  bw("4'32'", '432', 'O(T)', ["4' 3 2'"]),
  bw("-4'3m'", '-43m', 'Td(T)', ["-4' 3 m'"]),
  bw("m-3m'", 'm-3m', 'Oh(Th)', ["4'/m -3 2'/m'"]),
  bw("m'-3'm'", 'm-3m', 'Oh(O)', ["4/m' -3' 2/m'"]),
  bw("m'-3'm", 'm-3m', 'Oh(Td)', ["4'/m' -3' 2'/m"]),
];

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

/** The setting of the crystal class that a setting of the group lies in: the one whose full symbol is the group's without primes. */
export function blackWhiteClassSetting(key: BlackWhitePointGroupKey, index: number): number {
  const g = blackWhiteGroup(key);
  const s = blackWhiteSetting(key, index);
  const plain = s.full.replace(/'/g, '');
  const matches = classData(g.crystalClass).settings.filter((c) => c.full === plain && c.axes === s.axes);
  if (matches.length !== 1)
    throw new Error(
      `${key} setting ${index}: ${matches.length} settings of ${g.crystalClass} have the symbol ${plain}`,
    );
  return matches[0].index;
}

const operationCache = new Map<string, readonly CartesianOperation[]>();

/**
 * The operations of a setting: those of the class setting it lies in, in ITA's order, each with
 * its time reversal. Throws unless exactly one assignment of time reversal to ITA's generators of
 * the class gives a group whose primed full symbol is the stored one.
 */
export function blackWhiteOperations(key: BlackWhitePointGroupKey, index: number): readonly CartesianOperation[] {
  const cacheKey = `${key}#${index}`;
  let result = operationCache.get(cacheKey);
  if (!result) {
    const g = blackWhiteGroup(key);
    const full = blackWhiteSetting(key, index).full;
    const classIndex = blackWhiteClassSetting(key, index);
    const cls = classData(g.crystalClass);
    const classSetting = cls.settings.find((s) => s.index === classIndex)!;
    const matrices = itcCartesianOperations(g.crystalClass, classIndex);
    const n = itcLatticeGenerators(g.crystalClass, classIndex).length;
    const found: CartesianOperation[][] = [];
    // Every assignment of time reversal to the generators but the one without any.
    for (let bits = 1; bits < 1 << n; bits++) {
      const flags = Array.from({ length: n }, (_, k) => (bits & (1 << k)) !== 0);
      const parity = itcTimeReversal(g.crystalClass, classIndex, flags);
      if (!parity) continue;
      const ops = matrices.map((m, i) => ({ ...operation(m), timeReversal: parity[i] }));
      const symbols = primedSymbols(classSetting, cls.crystalSystem, ops);
      if (symbols.full === full) found.push(ops);
    }
    if (found.length !== 1) throw new Error(`${key} setting ${index}: ${found.length} groups have the symbol ${full}`);
    result = Object.freeze(found[0]);
    operationCache.set(cacheKey, result);
  }
  return result;
}
