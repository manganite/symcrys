/**
 * The 17 plane groups as exact operations, built from ITA's selected generators and the centring in
 * ITA's numbering, and what follows from them: crystal system and full symbol
 * (docs/conventions.md, "Plane groups"); exported by the entry point `symcrys/plane`.
 */

import { deepFreeze } from '../freeze.js';
import { shown } from '../checks.js';
import {
  closure,
  compose,
  cosetsByGenerators,
  determinant,
  equalModLattice,
  parseOperation,
  reduceModLattice,
  trace,
  translationOperation,
  type ExactOperation,
} from './affine.js';
import { PLANE_GROUP_DATA, type PlaneGroupEntry, type PlaneSystem } from './planeGroupData.js';
import { PLANE_SYMMETRY_DIRECTIONS, type PlaneDirection } from './planeSymmetryDirections.js';
import { add, isInteger, multiply, parseRational, rational } from './rational.js';

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
 * with the centring (1/2, 1/2) added, as ITA prints the "(1/2,1/2)+ set". The numbering follows
 * ITA's rule (2016 § 1.4.3, p. 60, Table 1.4.3.2; the coordinates in that order, § 2.1.3.11 (iv),
 * p. 162): from the identity, each
 * selected generator g extends the group H generated so far by the cosets gH, g²H, … until a power
 * of g lies in H, all modulo the lattice. Throws if the result is not closed, which would be an
 * error in the data.
 */
export function planeGroupOperations(key: string | number): readonly ExactOperation[] {
  const entry = planeGroupEntry(key);
  const cached = cache.get(entry.number);
  if (cached) return cached;
  const has = (list: readonly ExactOperation[], op: ExactOperation): boolean =>
    list.some((x) => equalModLattice(x, op));
  // A plane point group has at most 12 operations.
  let general: ExactOperation[];
  try {
    general = cosetsByGenerators(entry.generators.map(parseOperation), 2, 12);
  } catch (e) {
    throw new Error(`The selected generators of ${entry.symbol}: ${(e as Error).message}`, { cause: e });
  }
  const ops = centringOperations(entry).flatMap((t) => general.map((op) => reduceModLattice(compose(t, op))));
  const generated = closure(planeGroupGenerators(entry.number), { dimension: 2 });
  const same =
    generated.length === ops.length &&
    generated.every((g) => has(ops, g)) &&
    ops.every((op, i) => ops.findIndex((o) => equalModLattice(o, op)) === i);
  if (!same) {
    throw new Error(`The selected generators of ${entry.symbol} do not give a closed set of cosets`);
  }
  // Frozen, so that a caller inside the library cannot change the cached list.
  const frozen = deepFreeze(ops);
  cache.set(entry.number, frozen);
  return frozen;
}

/**
 * ITA's "Generators selected" of a plane group as operations, in printed order: the centring
 * translation (for a centred group), then the others. The identity and the integer translations,
 * which begin the printed line, are left out.
 */
export function planeGroupGenerators(key: string | number): ExactOperation[] {
  const entry = planeGroupEntry(key);
  return [...centringOperations(entry).slice(1), ...entry.generators.map(parseOperation)];
}

/** The lattice letter of a plane group: c for a centred lattice, p otherwise. */
export const latticeLetter = (entry: PlaneGroupEntry): 'p' | 'c' => (entry.centring.length > 0 ? 'c' : 'p');

/** The order of a proper rotation of the plane from its trace (also in a hexagonal basis): 1, 2, 3, 4, 6. */
const ROTATION_ORDER: Readonly<Record<number, number>> = { 2: 1, [-2]: 2, [-1]: 3, 0: 4, 1: 6 };

/** The highest order of a rotation in the group, and whether it has a reflection (or glide reflection). */
function rotationsAndReflections(key: string | number): { n: number; reflections: boolean } {
  const ops = planeGroupOperations(key);
  const n = Math.max(...ops.filter((op) => determinant(op.matrix) === 1).map((op) => ROTATION_ORDER[trace(op.matrix)]));
  return { n, reflections: ops.some((op) => determinant(op.matrix) === -1) };
}

/**
 * The crystal system of a plane group, from its point group: hexagonal with a threefold or sixfold
 * rotation, square with a fourfold one, rectangular with a reflection, oblique otherwise.
 */
export function planeGroupSystem(key: string | number): PlaneSystem {
  const { n, reflections } = rotationsAndReflections(key);
  if (n === 3 || n === 6) return 'hexagonal';
  if (n === 4) return 'square';
  return reflections ? 'rectangular' : 'oblique';
}

/**
 * The character of a set of symmetry directions in the full symbol: `m` if a mirror line is normal to
 * one of them, else `g` if a glide line is, else `1`. The coset of an operation (W, w) holds a
 * mirror if its glide vector (w + Ww)/2 plus (t + Wt)/2 is a lattice vector for some integer t;
 * since (t + Wt)/2 = (s + Ws) + (r + Wr)/2 for t = 2s + r, it is enough to try r ∈ {0, 1}².
 */
function directionCharacter(ops: readonly ExactOperation[], set: readonly PlaneDirection[]): string {
  const parallel = (a: readonly number[], b: PlaneDirection): boolean => a[0] * b[1] - a[1] * b[0] === 0;
  let glide = false;
  for (const op of ops) {
    if (determinant(op.matrix) !== -1) continue;
    const w = op.matrix;
    const normal = [w[0][0] - 1, w[1][0]].some((v) => v !== 0) ? [w[0][0] - 1, w[1][0]] : [w[0][1], w[1][1] - 1];
    if (!set.some((d) => parallel(normal, d))) continue;
    const ww = [0, 1].map((i) =>
      add(multiply(rational(w[i][0]), op.translation[0]), multiply(rational(w[i][1]), op.translation[1])),
    );
    const g = [0, 1].map((i) => multiply(add(op.translation[i], ww[i]), rational(1, 2)));
    const mirror = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ].some((r) => [0, 1].every((i) => isInteger(add(g[i], rational(r[i] + w[i][0] * r[0] + w[i][1] * r[1], 2)))));
    if (mirror) return 'm';
    glide = true;
  }
  return glide ? 'g' : '1';
}

/**
 * The full Hermann–Mauguin symbol of a plane group (ITA 2016 § 2.1.3.4, pp. 151–152, with the symmetry
 * directions of Table 2.1.3.1): the lattice letter, the highest rotation, and per set of symmetry
 * directions its character; in the square and hexagonal systems the characters are left out when
 * all are 1 (`p4`, `p3`, `p6`), in the rectangular system never (`p1m1`).
 */
export function planeGroupFullSymbol(key: string | number): string {
  const entry = planeGroupEntry(key);
  const ops = planeGroupOperations(key);
  const system = planeGroupSystem(key);
  const chars = PLANE_SYMMETRY_DIRECTIONS[system].map((set) => directionCharacter(ops, set));
  const { n } = rotationsAndReflections(key);
  const shown = system !== 'rectangular' && chars.every((c) => c === '1') ? [] : chars;
  return `${latticeLetter(entry)}${n}${shown.join('')}`;
}
