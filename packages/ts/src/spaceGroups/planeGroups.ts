/**
 * The 17 plane groups as exact operations: the general position of ITA in its numbering, the
 * centring and ITA's selected generators (CLAUDE.md, "Plane groups (and later space groups)").
 * Internal for now; the entry point `symcrys/plane` comes later.
 */

import { deepFreeze } from '../freeze.js';
import { shown } from '../checks.js';
import {
  closure,
  compose,
  equalModLattice,
  parseOperation,
  reduceModLattice,
  translationOperation,
  type ExactOperation,
} from './affine.js';
import { PLANE_GROUP_DATA, type PlaneGroupEntry } from './planeGroupData.js';
import { parseRational } from './rational.js';

/** The short symbols of the 17 plane groups, in ITA's order. */
export const PLANE_GROUP_KEYS = PLANE_GROUP_DATA.map((g) => g.symbol);

/** The printed data of a plane group, by short symbol (`'p2mg'`) or number (7); throws if unknown. */
export function planeGroupEntry(key: string | number): PlaneGroupEntry {
  const entry = PLANE_GROUP_DATA.find((g) => g.symbol === key || g.number === key);
  if (!entry) {
    throw new RangeError(`Unknown plane group: ${shown(key)}`);
  }
  return entry;
}

/** The centring translations of a plane group as operations, (0,0) first. */
export function centringOperations(entry: PlaneGroupEntry): ExactOperation[] {
  return [
    translationOperation([parseRational('0'), parseRational('0')]),
    ...entry.centring.map((t) => translationOperation(t.split(',').map(parseRational))),
  ];
}

const cache = new Map<number, readonly ExactOperation[]>();

/**
 * The operations of a plane group, one per coset of the integer translations, translations in
 * [0, 1): the general position in ITA's numbering, then, for a centred group, the same sequence
 * with the centring (1/2, 1/2) added, as ITA prints the "(1/2,1/2)+ set". Throws if ITA's selected
 * generators, with the integer translations and the centring, do not give exactly this set, which
 * would be an error in the data.
 */
export function planeGroupOperations(key: string | number): readonly ExactOperation[] {
  const entry = planeGroupEntry(key);
  const cached = cache.get(entry.number);
  if (cached) return cached;
  const general = entry.generalPosition.map(parseOperation);
  const ops = centringOperations(entry).flatMap((t) => general.map((op) => reduceModLattice(compose(t, op))));
  const generated = closure(planeGroupGenerators(entry.number), { dimension: 2 });
  const same =
    generated.length === ops.length &&
    generated.every((g) => ops.some((op) => equalModLattice(op, g))) &&
    ops.every((op, i) => ops.findIndex((o) => equalModLattice(o, op)) === i);
  if (!same) {
    throw new Error(`The selected generators of ${entry.symbol} do not give its general position`);
  }
  // Frozen, so that a caller inside the library cannot change the cached list (#101).
  const frozen = deepFreeze(ops);
  cache.set(entry.number, frozen);
  return frozen;
}

/**
 * ITA's "Generators selected" of a plane group as operations, in printed order: the centring
 * translation (for a centred group), then the operations named by number. The identity and the
 * integer translations, which begin the printed line, are left out.
 */
export function planeGroupGenerators(key: string | number): ExactOperation[] {
  const entry = planeGroupEntry(key);
  const general = entry.generalPosition.map(parseOperation);
  return [...centringOperations(entry).slice(1), ...entry.generators.map((n) => general[n - 1])];
}
