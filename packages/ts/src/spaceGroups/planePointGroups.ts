/**
 * The ten plane point groups (ITA 6th ed., Table 3.2.1.1, p. 720), `3m` in its two orientations
 * `3m1` and `31m` (Ch. 3.2, p. 721, item (d)). Their operations are the linear parts of the
 * symmorphic plane group of each, in ITA's order (pm for m, p3m1 and p31m for the two settings of
 * 3m), so that the point group of a plane group is its linear part and one data source serves both.
 * Internal; exported through `symcrys/plane`.
 */

import { type ExactOperation } from './affine.js';
import { type PlaneSystem } from './planeGroupData.js';
import { planeGroupEntry, planeGroupGenerators, planeGroupOperations } from './planeGroups.js';
import { ZERO } from './rational.js';

/** The keys of the ten plane point groups, in the order of ITA Table 3.2.1.1. */
export const PLANE_POINT_GROUP_KEYS = ['1', '2', 'm', '2mm', '4', '4mm', '3', '3m', '6', '6mm'] as const;

/** The key of a plane point group. */
export type PlanePointGroupKey = (typeof PLANE_POINT_GROUP_KEYS)[number];

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

/** The point group of a plane group and its setting: the key under which the plane group's symbol appears in `SOURCE`. */
export function planePointGroupOf(groupSymbol: string): { key: PlanePointGroupKey; setting: number } {
  for (const key of PLANE_POINT_GROUP_KEYS) {
    const i = SOURCE[key].indexOf(groupSymbol);
    if (i >= 0) return { key, setting: i + 1 };
  }
  // A plane group that is not symmorphic has the setting of the symmorphic group of its point group.
  const entry = planeGroupEntry(groupSymbol);
  return { key: entry.pointGroup as PlanePointGroupKey, setting: 1 };
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
  const full = planeGroupEntry(source(key, setting)).fullSymbol.slice(1);
  return key === '3m' ? full : key;
}

/** The crystal system of a plane point group. */
export function planePointGroupSystem(key: PlanePointGroupKey): PlaneSystem {
  return planeGroupEntry(source(key)).system;
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
