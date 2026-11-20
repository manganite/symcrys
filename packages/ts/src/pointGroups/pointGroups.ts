/**
 * Public API for the point groups: the 32 crystallographic point groups (crystal classes) and the
 * 90 magnetic point groups with time reversal (32 grey, 58 black-and-white). Lookup, settings,
 * operations, generators and symbols, in the ITC convention (default) or the Birss convention.
 */

import { matricesEqual } from '../linalg.js';
import {
  MAX_GROUP_ORDER,
  closeGroup,
  compose,
  operationsEqual,
  transformOperation,
  type Operation,
} from '../operations.js';
import { inItaOrder, itaGeneratorOperations } from './itaOrder.js';
import type { CrystalSystem } from '../lattice.js';
import { POINT_GROUP_DATA, POINT_GROUP_KEYS, type PointGroupKey, type SettingData } from './data.js';
import {
  BLACK_WHITE_DATA,
  MAGNETIC_POINT_GROUP_KEYS,
  TIME_REVERSAL,
  greySchoenflies,
  type MagneticPointGroupKey,
} from './magneticData.js';
import { primedSymbols } from './magneticSymbols.js';

export { POINT_GROUP_KEYS, type PointGroupKey } from './data.js';
export { MAGNETIC_POINT_GROUP_KEYS, type MagneticPointGroupKey } from './magneticData.js';

/** `'itc'`: International Tables for Crystallography (default). `'birss'`: Birss, Symmetry and Magnetism (1966). */
export type Convention = 'itc' | 'birss';

/**
 * Type of a magnetic point group. `'I'`: a crystallographic point group, no operation with time
 * reversal. `'II'`: a grey group, every operation of a crystal class with and without time
 * reversal. `'III'`: a black-and-white group, half of the operations of a crystal class combined
 * with time reversal. ITC Vol. D numbers these types differently (docs/conventions.md, "Types").
 */
export type PointGroupType = 'I' | 'II' | 'III';

export interface PointGroup<K extends MagneticPointGroupKey = PointGroupKey> {
  readonly key: K;
  readonly type: PointGroupType;
  readonly crystalSystem: CrystalSystem;
  /** Number of operations. */
  readonly order: number;
}

export interface Setting {
  /** 1-based; the same physical frame in both conventions. */
  readonly index: number;
  /** Short symbol of the setting in the requested convention. */
  readonly symbol: string;
  /** Full symbol, symmetry directions separated by single spaces. */
  readonly fullSymbol: string;
  /**
   * Monoclinic: the unique axis. Orthorhombic `mm2`: the axis of the twofold rotation. Orthorhombic
   * magnetic groups with three settings: the axis that is c in setting 1. `2'm'm`, with six
   * settings, two for each axis: the normal of the mirror plane without time reversal (there the
   * axis does not identify a setting).
   */
  readonly uniqueAxis?: 'a' | 'b' | 'c';
  /** True for the default setting of the requested convention. */
  readonly isDefault: boolean;
}

export interface SettingOptions {
  /** Default `'itc'`. */
  readonly convention?: Convention;
  /** 1-based setting index; default: the default setting of the convention. */
  readonly setting?: number;
}

export interface SymbolOptions extends SettingOptions {
  /**
   * `'short'` (default): short symbol of the setting, e.g. `321` (ITC) for class `32`.
   * `'full'`: full symbol, positions separated by spaces, e.g. `-3 2/m 1`.
   * `'schoenflies'`: Schoenflies symbol, subscripts written inline (`C3v`, `D2d`, `Oh`).
   */
  readonly form?: 'short' | 'full' | 'schoenflies';
}

/**
 * What the functions below need to know about a group, of any type. For a crystal class it is its
 * stored data; for a magnetic group it is put together from the data of its class.
 */
interface GroupData {
  readonly key: MagneticPointGroupKey;
  readonly type: PointGroupType;
  /** The crystal class: the group itself (type I), or the class it becomes without time reversal. */
  readonly crystalClass: GroupData;
  readonly crystalSystem: CrystalSystem;
  readonly schoenflies: string;
  /** Generators in the stored (Birss) frame, which is setting 1. */
  readonly generators: readonly Operation[];
  readonly settings: readonly { readonly frame: SettingData['frame']; readonly uniqueAxis?: 'a' | 'b' | 'c' }[];
  readonly itcDefault: number;
  /** Type I only: the stored symbols of each setting. */
  readonly symbols?: readonly SettingData[];
}

const BY_KEY = new Map<string, GroupData>();
for (const d of POINT_GROUP_DATA) {
  const self: GroupData = {
    key: d.key,
    type: 'I',
    get crystalClass() {
      return self;
    },
    crystalSystem: d.crystalSystem,
    schoenflies: d.schoenflies,
    generators: d.generators,
    settings: d.settings,
    itcDefault: d.itcDefault,
    symbols: d.settings,
  };
  BY_KEY.set(d.key, self);
}
// Grey groups: the class and time reversal (ITC Vol. D, eq. (1.5.2.1)). birss-app generates them
// from the generators of the class followed by 1', without the identity generator of class 1.
for (const d of POINT_GROUP_DATA) {
  const crystalClass = BY_KEY.get(d.key)!;
  const key: MagneticPointGroupKey = `${d.key}1'`;
  BY_KEY.set(key, {
    key,
    type: 'II',
    crystalClass,
    crystalSystem: d.crystalSystem,
    schoenflies: greySchoenflies(d.schoenflies),
    generators: [...(d.key === '1' ? [] : d.generators), TIME_REVERSAL],
    settings: d.settings,
    itcDefault: d.itcDefault,
  });
}
for (const d of BLACK_WHITE_DATA) {
  const crystalClass = BY_KEY.get(d.crystalClass)!;
  BY_KEY.set(d.key, {
    key: d.key,
    type: 'III',
    crystalClass,
    crystalSystem: crystalClass.crystalSystem,
    schoenflies: d.schoenflies,
    generators: d.generators,
    settings: d.settings,
    itcDefault: d.itcDefault,
  });
}

/** True if `key` is the key of one of the 32 crystal classes. */
export function isPointGroupKey(key: string): key is PointGroupKey {
  return BY_KEY.get(key)?.type === 'I';
}

/** True if `key` is the key of one of the 122 magnetic point groups (the 32 crystal classes included). */
export function isMagneticPointGroupKey(key: string): key is MagneticPointGroupKey {
  return BY_KEY.has(key);
}

function data(key: string): GroupData {
  const d = BY_KEY.get(key);
  if (!d) throw new RangeError(`Unknown point group key: ${JSON.stringify(key)}`);
  return d;
}

function convention(options?: SettingOptions): Convention {
  const c = options?.convention ?? 'itc';
  if (c !== 'itc' && c !== 'birss') throw new RangeError(`Unknown convention: ${JSON.stringify(c)}`);
  return c;
}

function defaultSetting(d: GroupData, c: Convention): number {
  return c === 'itc' ? d.itcDefault : 1;
}

/** The requested setting index, checked; the convention's default if none is given. */
function settingIndex(d: GroupData, options?: SettingOptions): number {
  const c = convention(options);
  const index = options?.setting ?? defaultSetting(d, c);
  if (!Number.isInteger(index) || index < 1 || index > d.settings.length) {
    throw new RangeError(`Point group ${d.key} has no setting ${String(index)} (settings 1 to ${d.settings.length})`);
  }
  return index;
}

function freezeOperation(op: Operation): Operation {
  const [r0, r1, r2] = op.matrix;
  return Object.freeze({
    matrix: Object.freeze([Object.freeze([...r0]), Object.freeze([...r1]), Object.freeze([...r2])] as const),
    timeReversal: op.timeReversal,
  }) as Operation;
}

const generatorCache = new Map<string, readonly Operation[]>();
const operationCache = new Map<string, readonly Operation[]>();

/** The stored generators carried into the frame of a setting: the generators of the Birss convention. */
function settingGenerators(d: GroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = generatorCache.get(cacheKey);
  if (!result) {
    const frame = d.settings[index - 1].frame;
    result = Object.freeze(d.generators.map((g) => freezeOperation(transformOperation(g, frame))));
    generatorCache.set(cacheKey, result);
  }
  return result;
}

/** The operation of `ops` with the matrix of `op`, whatever its time reversal. */
function withMatrix(ops: readonly Operation[], op: Operation): Operation {
  const found = ops.find((x) => matricesEqual(x.matrix, op.matrix));
  if (!found) throw new Error('Operation of the crystal class missing in the magnetic group');
  return found;
}

const classSettingCache = new Map<string, number>();

/**
 * The setting of the crystal class whose frame is that of setting `index` of the group: the one
 * in which the class has the operations of the group without their time reversal. For a class and
 * a grey group it is `index` itself. A black-and-white group may have its settings in another
 * order than its class, and settings its class does not tell apart (docs/conventions.md,
 * "Settings").
 */
function classSetting(d: GroupData, index: number): number {
  if (d.type !== 'III') return index;
  const cacheKey = `${d.key}#${index}`;
  let result = classSettingCache.get(cacheKey);
  if (!result) {
    const ops = closeGroup(settingGenerators(d, index));
    const c = d.crystalClass;
    result =
      c.settings.findIndex((_, i) => {
        const classOps = settingOperations(c, i + 1);
        return (
          classOps.length === ops.length && classOps.every((x) => ops.some((y) => matricesEqual(x.matrix, y.matrix)))
        );
      }) + 1;
    if (!result) throw new Error(`Point group ${d.key}, setting ${index}: no setting of class ${c.key} has this frame`);
    classSettingCache.set(cacheKey, result);
  }
  return result;
}

const itaGeneratorCache = new Map<string, readonly Operation[]>();

/**
 * ITA's generators of a setting (see `generators`); throws if setting 1 of a class has none. For a
 * magnetic group: ITA's generators of its class in the same frame, each with the time reversal it
 * has in the group; for a grey group followed by time reversal 1'.
 */
function settingItaGenerators(d: GroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = itaGeneratorCache.get(cacheKey);
  if (!result) {
    let gens: Operation[];
    if (d.type === 'I') {
      const ita = itaGeneratorOperations(d.key, index, d.crystalSystem);
      if (ita) gens = ita;
      else {
        if (index === 1) throw new Error(`Point group ${d.key}: no ITA generators for setting 1`);
        gens = settingItaGenerators(d, 1).map((op) => transformOperation(op, d.settings[index - 1].frame));
      }
    } else {
      const classGens = settingItaGenerators(d.crystalClass, classSetting(d, index));
      gens =
        d.type === 'II'
          ? [...classGens, TIME_REVERSAL]
          : classGens.map((g) => withMatrix(settingOperations(d, index), g));
    }
    result = Object.freeze(gens.map(freezeOperation));
    itaGeneratorCache.set(cacheKey, result);
  }
  return result;
}

const birssOperationCache = new Map<string, readonly Operation[]>();

/**
 * The operations of a setting in the Birss convention, in birss-app's order (docs/conventions.md,
 * "Birss convention and birss-app"): the generators of the setting first, then repeated passes
 * that append every new product g·h of two operations found before the pass, in the order of g,
 * then h, until a pass adds nothing.
 */
function birssOperations(d: GroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = birssOperationCache.get(cacheKey);
  if (!result) {
    const group = [...settingGenerators(d, index)];
    for (let changed = true; changed;) {
      changed = false;
      const size = group.length;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          const product = compose(group[i], group[j]);
          if (!group.some((g) => operationsEqual(g, product))) {
            if (group.length >= MAX_GROUP_ORDER) throw new Error(`Point group ${d.key}: closure does not terminate`);
            group.push(product);
            changed = true;
          }
        }
      }
    }
    if (!sameSet(group, settingOperations(d, index))) {
      throw new Error(`Point group ${d.key}, setting ${index}: Birss operations differ from the closure`);
    }
    result = Object.freeze(group.map(freezeOperation));
    birssOperationCache.set(cacheKey, result);
  }
  return result;
}

/**
 * The operations of a setting in ITA's order (docs/conventions.md, "Order of the operations"). A
 * crystal class: for a setting ITA lists, coset by coset from ITA's generators; for a setting ITA
 * does not list (today `mm2` settings 2 and 3), the order of setting 1, carried into the frame of
 * the setting. Setting 1 is always one ITA lists; throws if its generators are missing or do not
 * give the closure. A black-and-white group: the operations of its class in the same frame, in
 * that order, each with the time reversal it has in the group. A grey group: the operations of its
 * class, then the same sequence combined with time reversal.
 */
function settingOperations(d: GroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = operationCache.get(cacheKey);
  if (!result) {
    const closed = closeGroup(settingGenerators(d, index));
    let ordered: Operation[] | undefined;
    if (d.type === 'I') {
      ordered = inItaOrder(d.key, index, d.crystalSystem, closed);
      if (!ordered) {
        if (index === 1) throw new Error(`Point group ${d.key}: no ITA generators for setting 1`);
        ordered = settingOperations(d, 1).map((op) => transformOperation(op, d.settings[index - 1].frame));
      }
    } else {
      const classOps = settingOperations(d.crystalClass, classSetting(d, index));
      ordered =
        d.type === 'II'
          ? [...classOps, ...classOps.map((op) => compose(TIME_REVERSAL, op))]
          : classOps.map((op) => withMatrix(closed, op));
    }
    if (!sameSet(ordered, closed)) {
      throw new Error(`Point group ${d.key}, setting ${index}: ordered operations differ from the closure`);
    }
    result = Object.freeze(ordered.map(freezeOperation));
    operationCache.set(cacheKey, result);
  }
  return result;
}

/** True if `a` is `b` in some order: equal length, no operation twice in `a`, every one of `a` in `b`. */
function sameSet(a: readonly Operation[], b: readonly Operation[]): boolean {
  return (
    a.length === b.length &&
    a.every((op, i) => b.some((x) => operationsEqual(x, op)) && !a.slice(0, i).some((x) => operationsEqual(x, op)))
  );
}

const symbolCache = new Map<string, { readonly short: string; readonly full: string }>();

/**
 * Short and full symbol of a setting in a convention. A crystal class: as stored. A grey group:
 * the symbols of its class followed by `1'`. A black-and-white group: the symbols of its class in
 * the same frame, with the primes of its operations (magneticSymbols.ts).
 */
function settingSymbols(d: GroupData, index: number, c: Convention): { readonly short: string; readonly full: string } {
  if (d.symbols) return d.symbols[index - 1][c];
  const cacheKey = `${d.key}#${index}#${c}`;
  let result = symbolCache.get(cacheKey);
  if (!result) {
    const classSymbols = settingSymbols(d.crystalClass, classSetting(d, index), c);
    result = Object.freeze(
      d.type === 'II'
        ? { short: `${classSymbols.short}1'`, full: `${classSymbols.full} 1'` }
        : primedSymbols(classSymbols, d.crystalSystem, c, settingOperations(d, index)),
    );
    symbolCache.set(cacheKey, result);
  }
  return result;
}

const groupCache = new Map<string, PointGroup<MagneticPointGroupKey>>();

/**
 * The point group with this key: a crystal class or a magnetic point group. Throws a RangeError
 * for an unknown key.
 */
export function pointGroup<K extends MagneticPointGroupKey>(key: K): PointGroup<K> {
  const d = data(key);
  let g = groupCache.get(d.key);
  if (!g) {
    g = Object.freeze({
      key: d.key,
      type: d.type,
      crystalSystem: d.crystalSystem,
      order: settingOperations(d, 1).length,
    });
    groupCache.set(d.key, g);
  }
  return g as PointGroup<K>;
}

/** All 32 crystal classes, in the order of `POINT_GROUP_KEYS` (by crystal system, as in ITA). */
export function pointGroups(): readonly PointGroup[] {
  return POINT_GROUP_KEYS.map((key) => pointGroup(key));
}

/**
 * All 122 magnetic point groups, in the order of `MAGNETIC_POINT_GROUP_KEYS`: the 32 crystal
 * classes (type I), the 32 grey groups (type II) in the same order, and the 58 black-and-white
 * groups (type III) in the order of ITC Vol. D Table 1.5.2.3.
 */
export function magneticPointGroups(): readonly PointGroup<MagneticPointGroupKey>[] {
  return MAGNETIC_POINT_GROUP_KEYS.map((key) => pointGroup(key));
}

/**
 * The key of the crystal class of a point group: the group itself for a class, otherwise the class
 * it becomes when time reversal is dropped from every operation. Internal (not exported from
 * index.ts).
 */
export function crystalClassOf(key: MagneticPointGroupKey): PointGroupKey {
  return data(key).crystalClass.key as PointGroupKey;
}

/** The settings of a point group, with symbols and the default of the given convention (default `'itc'`). */
export function settings(key: MagneticPointGroupKey, conventionName: Convention = 'itc'): readonly Setting[] {
  const d = data(key);
  const c = convention({ convention: conventionName });
  const def = defaultSetting(d, c);
  return d.settings.map((s, i) => {
    const symbols = settingSymbols(d, i + 1, c);
    return Object.freeze({
      index: i + 1,
      symbol: symbols.short,
      fullSymbol: symbols.full,
      ...(s.uniqueAxis ? { uniqueAxis: s.uniqueAxis } : {}),
      isDefault: i + 1 === def,
    });
  });
}

/**
 * All operations of the point group in the requested setting (default: the convention's default
 * setting). ITC convention: in ITA's order, identity first, then as ITA numbers the general
 * position of the crystal class; an operation of a magnetic group has the number it has in the
 * class, and a grey group lists the class first, then the same sequence with time reversal. Birss
 * convention: in birss-app's order (docs/conventions.md, "Order of the operations"). The matrices
 * are Cartesian (docs/conventions.md, "Cartesian frame").
 */
export function operations(key: MagneticPointGroupKey, options?: SettingOptions): readonly Operation[] {
  const d = data(key);
  const index = settingIndex(d, options);
  return convention(options) === 'birss' ? birssOperations(d, index) : settingOperations(d, index);
}

/**
 * Generators of the point group in the requested setting (docs/conventions.md, "Generators"). ITC
 * convention: ITA's selected generators in printed order, without the identity and ITA's lattice
 * translations, so the list is empty for `1`; for `mm2` settings 2 and 3, which ITA does not list,
 * those of setting 1 carried into their frame; for a magnetic group, those of its class with the
 * time reversal they have in the group, for a grey group followed by 1'. Birss convention:
 * birss-app's generators (for `1` the identity, as in birss-app).
 */
export function generators(key: MagneticPointGroupKey, options?: SettingOptions): readonly Operation[] {
  const d = data(key);
  const index = settingIndex(d, options);
  return convention(options) === 'birss' ? settingGenerators(d, index) : settingItaGenerators(d, index);
}

/** A symbol of the point group in the requested convention and setting. */
export function symbol(key: MagneticPointGroupKey, options?: SymbolOptions): string {
  const d = data(key);
  const form = options?.form ?? 'short';
  const s = settingSymbols(d, settingIndex(d, options), convention(options));
  if (form === 'schoenflies') return d.schoenflies;
  if (form === 'short') return s.short;
  if (form === 'full') return s.full;
  throw new RangeError(`Unknown symbol form: ${JSON.stringify(form)}`);
}

/** A point group in a given setting. */
export interface PointGroupInSetting<K extends MagneticPointGroupKey = PointGroupKey> {
  readonly key: K;
  readonly setting: number;
}

const compact = (s: string): string => s.replace(/\s+/g, '');

function find(
  hm: string,
  conventionName: Convention,
  classesOnly: boolean,
): PointGroupInSetting<MagneticPointGroupKey> | undefined {
  const c = convention({ convention: conventionName });
  if (typeof hm !== 'string') return undefined;
  const target = compact(hm);
  const candidates = [...BY_KEY.values()].filter((d) => !classesOnly || d.type === 'I');
  const byKey = candidates.find((d) => d.key === target);
  if (byKey) return { key: byKey.key, setting: defaultSetting(byKey, c) };
  for (const form of ['short', 'full'] as const) {
    for (const d of candidates) {
      const i = d.settings.findIndex((_, j) => compact(settingSymbols(d, j + 1, c)[form]) === target);
      if (i >= 0) return { key: d.key, setting: i + 1 };
    }
  }
  return undefined;
}

/**
 * Finds a crystal class by a Hermann–Mauguin symbol in the given convention (default `'itc'`): the
 * key (giving the default setting), the short symbol of a setting, or a full symbol (spaces are
 * ignored). Returns undefined if nothing matches, also for a value that is not a string and for the
 * symbol of a magnetic group with time reversal (`findMagneticPointGroup`). Symbols are written as
 * in this library: `-` for the overbar, also in the Birss convention (`m-3m`, where Birss prints
 * `m3m`; docs/conventions.md, "Where ITC and Birss differ").
 */
export function findPointGroup(hm: string, conventionName: Convention = 'itc'): PointGroupInSetting | undefined {
  return find(hm, conventionName, true) as PointGroupInSetting | undefined;
}

/**
 * Finds one of the 122 magnetic point groups (the 32 crystal classes included) by a symbol, as
 * `findPointGroup` does for the classes. A prime `'` marks time reversal: `4'/mmm'`, `2221'`.
 */
export function findMagneticPointGroup(
  hm: string,
  conventionName: Convention = 'itc',
): PointGroupInSetting<MagneticPointGroupKey> | undefined {
  return find(hm, conventionName, false);
}
