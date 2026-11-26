/**
 * The ten plane point groups (ITA 6th ed., Table 3.2.1.1, p. 720), `3m` in its two orientations
 * `3m1` and `31m` (Ch. 3.2, p. 721, item (d)). Their operations are the linear parts of the
 * symmorphic plane group of each, in ITA's order (pm for m, p3m1 and p31m for the two settings of
 * 3m), so that the point group of a plane group is its linear part and one data source serves both.
 * Internal; exported through `symcrys/plane`.
 */

import { compose, type ExactOperation } from './affine.js';
import { type PlaneSystem } from './planeGroupData.js';
import {
  PLANE_GROUP_KEYS,
  latticeLetter,
  planeGroupEntry,
  planeGroupFullSymbol,
  planeGroupGenerators,
  planeGroupOperations,
  planeGroupSystem,
} from './planeGroups.js';
import { ZERO } from './rational.js';

/**
 * The key of a plane point group. Written out rather than derived from the list below, so that the
 * declarations keep its name (a derived type is expanded there), by which the Python generator
 * reads it as a key (`str`).
 */
export type PlanePointGroupKey = '1' | '2' | 'm' | '2mm' | '4' | '4mm' | '3' | '3m' | '6' | '6mm';

/** The keys of the ten plane point groups, in ITA's order (ITA 2016, Table 3.2.1.1). */
export const PLANE_POINT_GROUP_KEYS = [
  '1',
  '2',
  'm',
  '2mm',
  '4',
  '4mm',
  '3',
  '3m',
  '6',
  '6mm',
] as const satisfies readonly PlanePointGroupKey[];

// Every key is in the list (the list holds no other value by `satisfies`).
type MissingKey = Exclude<PlanePointGroupKey, (typeof PLANE_POINT_GROUP_KEYS)[number]>;
const everyKeyListed: [MissingKey] extends [never] ? true : never = true;
void everyKeyListed;

/** The symmorphic plane group of each point group and setting, whose linear parts it is. */
const SOURCE: Record<PlanePointGroupKey, readonly string[]> = {
  '1': ['p1'],
  '2': ['p2'],
  m: ['pm'],
  '2mm': ['p2mm'],
  '4': ['p4'],
  '4mm': ['p4mm'],
  '3': ['p3'],
  '3m': ['p3m1', 'p31m'],
  '6': ['p6'],
  '6mm': ['p6mm'],
};

/** The linear parts of a list of operations as a sorted list of strings, to compare them as sets. */
function linearSet(ops: readonly ExactOperation[]): string {
  return [...new Set(ops.map((op) => JSON.stringify(op.matrix)))].sort().join(';');
}

/**
 * The plane point group and setting whose operations are the given linear parts, as a set; for a
 * plane group that is not symmorphic the first setting whose operations they are.
 */
function pointGroupOfLinearParts(ops: readonly ExactOperation[]): { key: PlanePointGroupKey; setting: number } {
  const wanted = linearSet(ops);
  for (const key of PLANE_POINT_GROUP_KEYS) {
    const i = SOURCE[key].findIndex((symbol) => linearSet(planeGroupOperations(symbol)) === wanted);
    if (i >= 0) return { key, setting: i + 1 };
  }
  throw new Error(`No plane point group has the operations ${wanted}`);
}

/**
 * The point group of a plane group and its setting: the symmorphic group's own entry in `SOURCE`,
 * or the point group whose operations are the plane group's linear parts.
 */
export function planePointGroupOf(groupSymbol: string): { key: PlanePointGroupKey; setting: number } {
  for (const key of PLANE_POINT_GROUP_KEYS) {
    const i = SOURCE[key].indexOf(groupSymbol);
    if (i >= 0) return { key, setting: i + 1 };
  }
  return pointGroupOfLinearParts(planeGroupOperations(groupSymbol));
}

/**
 * The Patterson symmetry of a plane group: the symmorphic plane group of its lattice whose point
 * group is its Laue class (ITA 2016 § 2.1.3.5, p. 152), the point group with the twofold rotation,
 * the symmetry centre of the plane, added (§ 3.2.1.1, p. 720).
 */
export function planeGroupPatterson(groupSymbol: string): string {
  const twofold: ExactOperation = {
    matrix: [
      [-1, 0],
      [0, -1],
    ],
    translation: [ZERO, ZERO],
  };
  const ops = planeGroupOperations(groupSymbol);
  const withCentre = [...ops, ...ops.map((op) => compose(twofold, op))];
  const laue = pointGroupOfLinearParts(withCentre).key;
  const letter = latticeLetter(planeGroupEntry(groupSymbol));
  if (letter === 'p') return SOURCE[laue][0];
  // A centred lattice: the centred plane group of the Laue class without glide lines.
  const found = PLANE_GROUP_KEYS.find(
    (k) => k[0] === letter && planePointGroupOf(k).key === laue && !planeGroupFullSymbol(k).includes('g'),
  );
  if (!found) throw new Error(`No Patterson symmetry for ${groupSymbol}`);
  return found;
}

/** True if `key` is the key of a plane point group. */
export function isPlanePointGroupKey(key: unknown): key is PlanePointGroupKey {
  return typeof key === 'string' && (PLANE_POINT_GROUP_KEYS as readonly string[]).includes(key);
}

/** The symmorphic plane group for a point group and a setting (1-based); throws for an unknown one. */
function source(key: PlanePointGroupKey, setting = 1): string {
  const list = SOURCE[key];
  if (!Number.isInteger(setting) || setting < 1 || setting > list.length) {
    throw new RangeError(`The plane point group ${key} has no setting ${String(setting)}`);
  }
  return list[setting - 1];
}

/** The number of settings of a plane point group: 2 for `3m`, otherwise 1. */
export function planePointGroupSettingCount(key: PlanePointGroupKey): number {
  return SOURCE[key].length;
}

/** The symbol of a plane point group in a setting: `3m1` or `31m` for `3m`, otherwise the key. */
export function planePointGroupSymbol(key: PlanePointGroupKey, setting = 1): string {
  const full = planeGroupFullSymbol(source(key, setting)).slice(1);
  return key === '3m' ? full : key;
}

/** The crystal system of a plane point group. */
export function planePointGroupSystem(key: PlanePointGroupKey): PlaneSystem {
  return planeGroupSystem(source(key));
}

const linear = (op: ExactOperation): ExactOperation => ({
  matrix: op.matrix,
  translation: op.translation.map(() => ZERO),
});

/** The operations of a plane point group in a setting, in ITA's order, as operations without translation. */
export function planePointGroupOperations(key: PlanePointGroupKey, setting = 1): ExactOperation[] {
  return planeGroupOperations(source(key, setting)).map(linear);
}

/** The generators of a plane point group: the linear parts of ITA's selected generators of its symmorphic plane group. */
export function planePointGroupGenerators(key: PlanePointGroupKey, setting = 1): ExactOperation[] {
  return planeGroupGenerators(source(key, setting))
    .filter((op) => !(op.matrix[0][0] === 1 && op.matrix[0][1] === 0 && op.matrix[1][0] === 0 && op.matrix[1][1] === 1))
    .map(linear);
}
