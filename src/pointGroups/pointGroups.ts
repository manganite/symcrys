/**
 * Public API for the crystallographic point groups: lookup, settings, operations, generators and
 * symbols, in the ITC convention (default) or the Birss convention.
 */

import { closeGroup, transformOperation, type Operation } from '../operations.js';
import type { CrystalSystem } from '../lattice.js';
import { POINT_GROUP_DATA, POINT_GROUP_KEYS, type PointGroupData, type PointGroupKey } from './data.js';

export { POINT_GROUP_KEYS, type PointGroupKey } from './data.js';

/** `'itc'`: International Tables for Crystallography (default). `'birss'`: Birss, Symmetry and Magnetism (1966). */
export type Convention = 'itc' | 'birss';

/** Type I: crystallographic point group without time reversal (the only type so far). */
export type PointGroupType = 'I';

export interface PointGroup {
  readonly key: PointGroupKey;
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
  /** Monoclinic: the unique axis; orthorhombic mm2: the axis of the twofold rotation. */
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

const BY_KEY = new Map<string, PointGroupData>(POINT_GROUP_DATA.map((d) => [d.key, d]));

/** True if `key` is the key of one of the 32 crystal classes. */
export function isPointGroupKey(key: string): key is PointGroupKey {
  return BY_KEY.has(key);
}

function data(key: string): PointGroupData {
  const d = BY_KEY.get(key);
  if (!d) throw new RangeError(`Unknown point group key: ${JSON.stringify(key)}`);
  return d;
}

function convention(options?: SettingOptions): Convention {
  const c = options?.convention ?? 'itc';
  if (c !== 'itc' && c !== 'birss') throw new RangeError(`Unknown convention: ${JSON.stringify(c)}`);
  return c;
}

function defaultSetting(d: PointGroupData, c: Convention): number {
  return c === 'itc' ? d.itcDefault : 1;
}

/** The requested setting index, checked; the convention's default if none is given. */
function settingIndex(d: PointGroupData, options?: SettingOptions): number {
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

function settingGenerators(d: PointGroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = generatorCache.get(cacheKey);
  if (!result) {
    const frame = d.settings[index - 1].frame;
    result = Object.freeze(d.generators.map((g) => freezeOperation(transformOperation(g, frame))));
    generatorCache.set(cacheKey, result);
  }
  return result;
}

function settingOperations(d: PointGroupData, index: number): readonly Operation[] {
  const cacheKey = `${d.key}#${index}`;
  let result = operationCache.get(cacheKey);
  if (!result) {
    result = Object.freeze(closeGroup(settingGenerators(d, index)).map(freezeOperation));
    operationCache.set(cacheKey, result);
  }
  return result;
}

const groupCache = new Map<string, PointGroup>();

/** The point group with this key. Throws a RangeError for an unknown key. */
export function pointGroup(key: PointGroupKey): PointGroup {
  const d = data(key);
  let g = groupCache.get(d.key);
  if (!g) {
    g = Object.freeze({ key: d.key, type: 'I', crystalSystem: d.crystalSystem, order: settingOperations(d, 1).length });
    groupCache.set(d.key, g);
  }
  return g;
}

/** All 32 crystal classes, in the order of `POINT_GROUP_KEYS` (by crystal system, as in ITA). */
export function pointGroups(): readonly PointGroup[] {
  return POINT_GROUP_KEYS.map(pointGroup);
}

/** The settings of a point group, with symbols and the default of the given convention (default `'itc'`). */
export function settings(key: PointGroupKey, conventionName: Convention = 'itc'): readonly Setting[] {
  const d = data(key);
  const c = convention({ convention: conventionName });
  const def = defaultSetting(d, c);
  return d.settings.map((s, i) =>
    Object.freeze({
      index: i + 1,
      symbol: s[c].short,
      fullSymbol: s[c].full,
      ...(s.uniqueAxis ? { uniqueAxis: s.uniqueAxis } : {}),
      isDefault: i + 1 === def,
    }),
  );
}

/**
 * All operations of the point group in the requested setting (default: the convention's default
 * setting), identity first. The matrices are Cartesian (docs/conventions.md, "Cartesian frame").
 */
export function operations(key: PointGroupKey, options?: SettingOptions): readonly Operation[] {
  const d = data(key);
  return settingOperations(d, settingIndex(d, options));
}

/** Generators of the point group in the requested setting: the stored generators, carried into its frame. */
export function generators(key: PointGroupKey, options?: SettingOptions): readonly Operation[] {
  const d = data(key);
  return settingGenerators(d, settingIndex(d, options));
}

/** A symbol of the point group in the requested convention and setting. */
export function symbol(key: PointGroupKey, options?: SymbolOptions): string {
  const d = data(key);
  const form = options?.form ?? 'short';
  const s = d.settings[settingIndex(d, options) - 1][convention(options)];
  if (form === 'schoenflies') return d.schoenflies;
  if (form === 'short') return s.short;
  if (form === 'full') return s.full;
  throw new RangeError(`Unknown symbol form: ${JSON.stringify(form)}`);
}

/** A point group in a given setting. */
export interface PointGroupInSetting {
  readonly key: PointGroupKey;
  readonly setting: number;
}

const compact = (s: string): string => s.replace(/\s+/g, '');

/**
 * Finds a point group by a Hermann–Mauguin symbol in the given convention (default `'itc'`): the
 * key (giving the default setting), the short symbol of a setting, or a full symbol (spaces are
 * ignored). Returns undefined if nothing matches, also for a value that is not a string. Symbols
 * are written as in this library: `-` for the overbar, also in the Birss convention (`m-3m`, where
 * Birss prints `m3m`; docs/conventions.md, "Where ITC and Birss differ").
 */
export function findPointGroup(hm: string, conventionName: Convention = 'itc'): PointGroupInSetting | undefined {
  const c = convention({ convention: conventionName });
  if (typeof hm !== 'string') return undefined;
  const target = compact(hm);
  const byKey = BY_KEY.get(target);
  if (byKey) return { key: byKey.key, setting: defaultSetting(byKey, c) };
  for (const form of ['short', 'full'] as const) {
    for (const d of POINT_GROUP_DATA) {
      const i = d.settings.findIndex((s) => compact(s[c][form]) === target);
      if (i >= 0) return { key: d.key, setting: i + 1 };
    }
  }
  return undefined;
}
