/**
 * The plane API of symcrys (`symcrys/plane`): the 17 plane groups and the 10 plane point groups, in
 * the lattice basis, as ITA (6th ed., 2016) prints them in Chapter 2.2 and Table 3.2.1.1.
 * Everything exported here is covered by SemVer (see CLAUDE.md), like the exports of `index.ts`.
 *
 * Inside, the operations are exact (integer matrices, rational translations); here they are plain
 * numbers: a translation of 1/3 is the nearest double. Keys are the symbols ITA prints: `'p2mg'`,
 * `'c2mm'` for the plane groups, `'2mm'`, `'3m'` for the plane point groups; the two sets do not
 * overlap. Functions that take a point take its coordinates in the lattice basis and an optional
 * `tolerance` (docs/conventions.md, "Plane groups").
 */

import { describePlaneOperation } from './spaceGroups/describe.js';
import { planeAsymmetricUnit, planeCellElements } from './spaceGroups/cell.js';
import { toPlain, type ExactOperation } from './spaceGroups/affine.js';
import { type PlaneSystem } from './spaceGroups/planeGroupData.js';
import {
  PLANE_GROUP_KEYS as GROUP_KEYS,
  planeGroupEntry,
  planeGroupGenerators,
  planeGroupOperations,
} from './spaceGroups/planeGroups.js';
import {
  PLANE_POINT_GROUP_KEYS,
  isPlanePointGroupKey,
  planePointGroupGenerators,
  planePointGroupOf,
  planePointGroupOperations,
  planePointGroupSettingCount,
  planePointGroupSymbol,
  planePointGroupSystem,
  type PlanePointGroupKey,
} from './spaceGroups/planePointGroups.js';
import { planeOrbit, planeSiteSymmetry, planeWyckoffPositionOf } from './spaceGroups/positions.js';
import { parseRational, rational, toNumber, type Rational } from './spaceGroups/rational.js';

export { VERSION } from './version.js';
export type { PlaneSystem } from './spaceGroups/planeGroupData.js';

/** The short symbol of a plane group, e.g. `'p2mg'`. */
export type PlaneGroupKey =
  | 'p1'
  | 'p2'
  | 'pm'
  | 'pg'
  | 'cm'
  | 'p2mm'
  | 'p2mg'
  | 'p2gg'
  | 'c2mm'
  | 'p4'
  | 'p4mm'
  | 'p4gm'
  | 'p3'
  | 'p3m1'
  | 'p31m'
  | 'p6'
  | 'p6mm';

/** The key of a plane point group, e.g. `'2mm'`. */
export type PointGroupKey = PlanePointGroupKey;

/** The short symbols of the 17 plane groups, in ITA's order (plane group n at index n − 1). */
export const PLANE_GROUP_KEYS: readonly PlaneGroupKey[] = Object.freeze([...GROUP_KEYS] as PlaneGroupKey[]);

/** The keys of the 10 plane point groups, in the order of ITA Table 3.2.1.1. */
export const POINT_GROUP_KEYS: readonly PointGroupKey[] = Object.freeze([...PLANE_POINT_GROUP_KEYS]);

/** Options that choose the setting of a plane point group. */
export interface SettingOptions {
  /** 1-based setting: for the point group `3m` 1 is `3m1` (default) and 2 is `31m`; the other point groups have one, and a plane group takes only 1. */
  readonly setting?: number;
}

/** Options of the functions that take a point. */
export interface PointOptions {
  /**
   * Two points count as the same, modulo the lattice, if each coordinate (lattice basis) differs
   * by less than this from an integer. Default 10⁻⁶; must be below 1/2.
   */
  readonly tolerance?: number;
}

/** An operation (W, w) in the lattice basis: x ↦ W·x + w. */
export interface PlaneOperation {
  /** The linear part W, a 2 × 2 matrix with integer entries, rows first. */
  readonly matrix: readonly (readonly number[])[];
  /** The translation part w; for a plane group in [0, 1), for a point group zero. */
  readonly translation: readonly number[];
}

/** A plane group. */
export interface PlaneGroup {
  /** The short symbol, e.g. `'p2mg'`. */
  readonly key: PlaneGroupKey;
  /** The number of the plane group, 1 to 17. */
  readonly number: number;
  /** The full symbol as ITA prints it, e.g. `'p2mg'` or `'p1m1'`. */
  readonly fullSymbol: string;
  /** The plane point group. */
  readonly pointGroup: PointGroupKey;
  /** The setting of the point group: 2 for `p31m`, otherwise 1. */
  readonly pointGroupSetting: number;
  /** The crystal system. */
  readonly crystalSystem: PlaneSystem;
  /** The centring translations besides (0, 0): `[[0.5, 0.5]]` for `cm` and `c2mm`, otherwise none. */
  readonly centring: readonly (readonly number[])[];
  /** The block "Origin" as ITA prints it, e.g. `'at 2mm'`. */
  readonly origin: string;
  /** The order of the group modulo the lattice: the number of `operations`. */
  readonly order: number;
}

/** A plane point group. */
export interface PointGroup {
  /** The key, e.g. `'2mm'`. */
  readonly key: PointGroupKey;
  /** The crystal system. */
  readonly crystalSystem: PlaneSystem;
  /** The order of the group. */
  readonly order: number;
}

/** A setting of a plane point group. */
export interface Setting {
  /** 1-based. */
  readonly index: number;
  /** Its symbol: `'3m1'` or `'31m'` for `3m`, otherwise the key. */
  readonly symbol: string;
  /** True for the default setting (setting 1). */
  readonly default: boolean;
}

/** What an operation is, geometrically, as ITA describes it under "Symmetry operations". */
export interface OperationDescription {
  /** `'identity'`, `'translation'`, `'rotation'`, `'mirror'` (a reflection in a line) or `'glide'` (a glide reflection). */
  readonly kind: 'identity' | 'translation' | 'rotation' | 'mirror' | 'glide';
  /** The order of the linear part: 1 for the identity and a translation, 2 for a mirror or glide. */
  readonly order: number;
  /** For a rotation of order 3 or more: `'+'` if it turns a towards b, `'-'` otherwise. */
  readonly sense?: '+' | '-';
  /** For a translation: the translation vector. */
  readonly translation?: readonly number[];
  /**
   * For a rotation: its centre. For a mirror or glide: a point of its line, on y = 0 unless the line
   * is parallel to it, then on x = 0. Not reduced modulo the lattice.
   */
  readonly location?: readonly number[];
  /** For a mirror or glide: the direction of its line, the shortest integer vector, first non-zero component positive. */
  readonly direction?: readonly number[];
  /**
   * For a mirror or glide: the normal of its line in the lattice basis, its symmetry direction as in
   * ITA Table 2.1.3.1: the shortest integer vector along the columns of W − I, first non-zero
   * component positive. Without a metric it is not the perpendicular of `direction`: in a hexagonal
   * basis the normal of a line along [1,0] is [1,2].
   */
  readonly normal?: readonly number[];
  /** For a glide: the glide vector (w + W·w)/2, not reduced modulo the lattice. */
  readonly glide?: readonly number[];
}

/** A Wyckoff position of a plane group, as ITA prints it. */
export interface WyckoffPosition {
  /** The Wyckoff letter. */
  readonly letter: string;
  /** The multiplicity: the number of points in the conventional cell. */
  readonly multiplicity: number;
  /** The oriented site-symmetry symbol, e.g. `'.m.'`, `'2mm'` (without the spaces of the print). */
  readonly siteSymmetry: string;
  /** The printed coordinates of the (0,0)+ set, e.g. `['x,0', '-x,0']`; a leading `-` is an overbar. */
  readonly coordinates: readonly string[];
}

/** The site symmetry of a point under a plane group. */
export interface SiteSymmetry {
  /** Indices into `operations` of those that map the point onto itself modulo the lattice, ascending: a subgroup. */
  readonly operations: readonly number[];
  /** The point set onto the fixed space of its site symmetry, in [0, 1), which removes rounding errors within the tolerance. */
  readonly point: readonly number[];
  /** The number of points in the conventional cell equivalent to it. */
  readonly multiplicity: number;
  /** True if no operation other than the identity maps the point onto itself (general position). */
  readonly general: boolean;
}

/** The asymmetric unit of a plane group, a convex polygon in the lattice basis. */
export interface AsymmetricUnit {
  /** Its vertices, counter-clockwise (a towards b), starting at the lowest (smallest y, then x). */
  readonly vertices: readonly (readonly number[])[];
  /** Per edge, the inequality [a, b, c] for a·x + b·y ≤ c (integers, no common factor); entry i holds the edge from vertex i to vertex i + 1. */
  readonly inequalities: readonly (readonly number[])[];
}

/** A rotation centre in the cell. */
export interface RotationCentre {
  /** The highest order of a rotation about it. */
  readonly order: number;
  /** Its position in [0, 1]². */
  readonly point: readonly number[];
}

/** A mirror or glide line: the part of it in the cell. */
export interface SymmetryLine {
  /** `'mirror'` or `'glide'`. */
  readonly kind: 'mirror' | 'glide';
  /** The direction of the line, the shortest integer vector, first non-zero component positive. */
  readonly direction: readonly number[];
  /** The normal of the line in the lattice basis, as in `describeOperations`. */
  readonly normal: readonly number[];
  /** For a glide line its glide vector s·direction, 0 < s < 1; for a mirror line (0, 0). */
  readonly glide: readonly number[];
  /** The two ends of the segment of the line in the cell [0, 1]², in the order of `direction`. */
  readonly segment: readonly (readonly number[])[];
}

/** The symmetry elements of a plane group in its conventional cell [0, 1]², boundary included. */
export interface SymmetryElements {
  /** The rotation centres, by descending order, then by y and x. */
  readonly rotations: readonly RotationCentre[];
  /** The mirror and glide lines that cross the cell, by direction, then by the start of the segment (y, then x). */
  readonly lines: readonly SymmetryLine[];
}

// ---------------------------------------------------------------------------------------------

const numbers = (v: readonly Rational[]): number[] => v.map(toNumber);

function isPlaneGroupKey(key: unknown): key is PlaneGroupKey {
  return typeof key === 'string' && (GROUP_KEYS as readonly string[]).includes(key);
}

function unknownKey(key: unknown, what = 'plane group or plane point group'): never {
  throw new RangeError(`Unknown ${what}: ${JSON.stringify(key)}`);
}

/** The plane group of a key; throws for a point group or an unknown key. */
function groupKey(key: unknown, what: string): PlaneGroupKey {
  if (isPlaneGroupKey(key)) return key;
  if (isPlanePointGroupKey(key)) {
    throw new RangeError(`${what} takes the key of a plane group, not of the point group ${key}`);
  }
  return unknownKey(key, 'plane group');
}

/** The key of a plane point group; throws for a plane group or an unknown key. */
function pointKey(key: unknown, what: string): PointGroupKey {
  if (isPlanePointGroupKey(key)) return key;
  if (isPlaneGroupKey(key)) {
    throw new RangeError(`${what} takes the key of a plane point group; ${key} is a plane group (planeGroup)`);
  }
  return unknownKey(key, 'plane point group');
}

function settingOf(options: SettingOptions | undefined): number | undefined {
  return options?.setting;
}

/** The exact operations for a key: a plane group (setting 1 only) or a point group in a setting. */
function exact(key: unknown, options: SettingOptions | undefined, generatorsOnly: boolean): ExactOperation[] {
  const setting = settingOf(options);
  if (isPlaneGroupKey(key)) {
    if (setting !== undefined && setting !== 1) {
      throw new RangeError(`The plane group ${key} has no setting ${String(setting)}`);
    }
    return generatorsOnly ? planeGroupGenerators(key) : planeGroupOperations(key);
  }
  if (isPlanePointGroupKey(key)) {
    return generatorsOnly ? planePointGroupGenerators(key, setting) : planePointGroupOperations(key, setting);
  }
  return unknownKey(key);
}

const plain = (op: ExactOperation): PlaneOperation => {
  const { matrix, translation } = toPlain(op);
  return Object.freeze({
    matrix: Object.freeze(matrix.map((row) => Object.freeze([...row]))),
    translation: Object.freeze([...translation]),
  });
};

/** The description of an exact operation with plain numbers. */
function describe(op: ExactOperation): OperationDescription {
  const d = describePlaneOperation(op);
  return Object.freeze({
    kind: d.kind,
    order: d.order,
    ...(d.sense ? { sense: d.sense } : {}),
    ...(d.translation ? { translation: Object.freeze(numbers(d.translation)) } : {}),
    ...(d.location ? { location: Object.freeze(numbers(d.location)) } : {}),
    ...(d.direction ? { direction: Object.freeze([...d.direction]) } : {}),
    ...(d.normal ? { normal: Object.freeze([...d.normal]) } : {}),
    ...(d.glide ? { glide: Object.freeze(numbers(d.glide)) } : {}),
  });
}

/** Tolerance for reading an integer or a fraction from a double. */
const READ_TOLERANCE = 1e-9;
/** The largest denominator of a translation that `describeOperationsOf` reads. */
const MAX_DENOMINATOR = 12;

function fractionOf(value: unknown): Rational {
  if (typeof value === 'number' && Number.isFinite(value)) {
    for (let d = 1; d <= MAX_DENOMINATOR; d++) {
      const n = Math.round(value * d);
      if (Math.abs(value * d - n) < READ_TOLERANCE * d) return rational(n, d);
    }
  }
  throw new RangeError(
    `Not within 10⁻⁹ of a translation with a denominator of at most ${MAX_DENOMINATOR}: ${shown(value)}`,
  );
}

/** A value for an error message; never throws (BigInt, circular objects). */
function shown(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** An operation from a caller as an exact operation; throws a RangeError unless it has the shape of a plane operation. */
function exactOf(op: unknown): ExactOperation {
  const o = op as Partial<PlaneOperation> | null;
  const m = o?.matrix;
  const t = o?.translation;
  const isRow = (row: unknown): row is readonly number[] => Array.isArray(row) && row.length === 2;
  if (!Array.isArray(m) || m.length !== 2 || !m.every(isRow) || !Array.isArray(t) || t.length !== 2) {
    throw new RangeError(`Not an operation of the plane { matrix (2 × 2), translation (2) }: ${shown(op)}`);
  }
  const matrix = m.map((row) =>
    row.map((v) => {
      if (!(typeof v === 'number' && Math.abs(v - Math.round(v)) < READ_TOLERANCE)) {
        throw new RangeError(`The matrix of a plane operation has integer entries, not ${shown(m)}`);
      }
      return Math.round(v) + 0;
    }),
  );
  return { matrix, translation: t.map(fractionOf) };
}

/** The plane group with this key (short symbol). Throws a RangeError for an unknown key. */
export function planeGroup(key: PlaneGroupKey): PlaneGroup {
  const entry = planeGroupEntry(groupKey(key, 'planeGroup'));
  const point = planePointGroupOf(entry.symbol);
  return Object.freeze({
    key: entry.symbol as PlaneGroupKey,
    number: entry.number,
    fullSymbol: entry.fullSymbol,
    pointGroup: point.key,
    pointGroupSetting: point.setting,
    crystalSystem: entry.system,
    centring: Object.freeze(
      entry.centring.map((t) => Object.freeze(t.split(',').map((c) => toNumber(parseRational(c))))),
    ),
    origin: entry.origin,
    order: planeGroupOperations(entry.symbol).length,
  });
}

/** The plane point group with this key. Throws a RangeError for an unknown key. */
export function pointGroup(key: PointGroupKey): PointGroup {
  const k = pointKey(key, 'pointGroup');
  return Object.freeze({ key: k, crystalSystem: planePointGroupSystem(k), order: planePointGroupOperations(k).length });
}

/**
 * The settings of a plane point group: two for `3m` (`3m1`, the default, and `31m`), one for the
 * others. Throws a RangeError for an unknown key.
 */
export function settings(key: PointGroupKey): readonly Setting[] {
  const k = pointKey(key, 'settings');
  return Object.freeze(
    Array.from({ length: planePointGroupSettingCount(k) }, (_, i) =>
      Object.freeze({ index: i + 1, symbol: planePointGroupSymbol(k, i + 1), default: i === 0 }),
    ),
  );
}

/** The symbol of a plane point group in a setting: `'3m1'` or `'31m'` for `3m`, otherwise the key. */
export function symbol(key: PointGroupKey, options?: SettingOptions): string {
  return planePointGroupSymbol(pointKey(key, 'symbol'), settingOf(options));
}

/**
 * The operations of a plane group or a plane point group, in ITA's order, identity first. A plane
 * group: one per coset of the integer translations, translations in [0, 1), the general position
 * as numbered, then for a centred group the same sequence with the centring added (the
 * "(1/2,1/2)+ set"). A point group: the linear parts of its symmorphic plane group (pm for m,
 * p3m1 and p31m for the settings of 3m), translation zero. Throws a RangeError for an unknown key
 * or setting.
 */
export function operations(key: PlaneGroupKey | PointGroupKey, options?: SettingOptions): readonly PlaneOperation[] {
  return Object.freeze(exact(key, options, false).map(plain));
}

/**
 * ITA's selected generators, in printed order, without the identity and the integer translations:
 * for a centred plane group the centring translation first. A point group: the linear parts of the
 * generators of its symmorphic plane group. Throws a RangeError for an unknown key or setting.
 */
export function generators(key: PlaneGroupKey | PointGroupKey, options?: SettingOptions): readonly PlaneOperation[] {
  return Object.freeze(exact(key, options, true).map(plain));
}

/**
 * Each operation of `operations` (same key and setting) described geometrically, index for index:
 * what it is, its order and sense, where its symmetry element lies, its glide part. Throws a
 * RangeError for an unknown key or setting.
 */
export function describeOperations(
  key: PlaneGroupKey | PointGroupKey,
  options?: SettingOptions,
): readonly OperationDescription[] {
  return Object.freeze(exact(key, options, false).map(describe));
}

/**
 * Any operations of the plane (lattice basis) described geometrically, index for index, as
 * `describeOperations` describes those of a group: for instance a product of operations, an
 * operation shifted by a lattice translation, or the operations of a site symmetry. Each operation is
 * `{ matrix, translation }` as `operations` gives it. Each matrix must have integer entries (within
 * 10⁻⁹) and be the linear part of a crystallographic plane point group (determinant ±1, order 1,
 * 2, 3, 4 or 6); each translation must lie within 10⁻⁹ of a fraction with a denominator of at most
 * 12 (1/3 as 0.333…), as the translations of `operations` and their products do. Throws a
 * RangeError otherwise.
 */
export function describeOperationsOf(operations: readonly PlaneOperation[]): readonly OperationDescription[] {
  if (!Array.isArray(operations)) {
    throw new RangeError('describeOperationsOf takes a list of operations { matrix, translation }');
  }
  return Object.freeze(operations.map((op) => describe(exactOf(op))));
}

/**
 * The Wyckoff positions of a plane group as ITA prints them, general position first. Throws a
 * RangeError for an unknown key and for a plane point group, whose positions are not in symcrys
 * yet.
 */
export function wyckoffPositions(key: PlaneGroupKey): readonly WyckoffPosition[] {
  const entry = planeGroupEntry(groupKey(key, 'wyckoffPositions'));
  return Object.freeze(
    entry.wyckoff.map(([multiplicity, letter, siteSymmetry, coordinates]) =>
      Object.freeze({ letter, multiplicity, siteSymmetry, coordinates: Object.freeze([...coordinates]) }),
    ),
  );
}

/**
 * The site symmetry of a point (lattice basis) under a plane group: the operations that map it
 * onto itself modulo the lattice within the tolerance, closed into a group, and the point set onto
 * their fixed space. Throws a RangeError for an unknown key, a point that is not two finite
 * numbers, or a tolerance outside (0, 1/2).
 */
export function siteSymmetry(key: PlaneGroupKey, point: readonly number[], options?: PointOptions): SiteSymmetry {
  const site = planeSiteSymmetry(groupKey(key, 'siteSymmetry'), point, options);
  return Object.freeze({
    operations: Object.freeze([...site.operations]),
    point: Object.freeze([...site.point]),
    multiplicity: site.multiplicity,
    general: site.operations.length === 1,
  });
}

/**
 * The Wyckoff position of a point (lattice basis) under a plane group, as `wyckoffPositions` gives
 * it: the printed position of the point's multiplicity whose coordinates, with the centring, reach
 * the point set onto its site symmetry. Throws a RangeError as `siteSymmetry`.
 */
export function wyckoffPositionOf(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: PointOptions,
): WyckoffPosition {
  const k = groupKey(key, 'wyckoffPositionOf');
  const { letter } = planeWyckoffPositionOf(k, point, options);
  const found = wyckoffPositions(k).find((w) => w.letter === letter);
  if (!found) throw new Error(`No Wyckoff position ${letter} in ${k}`);
  return found;
}

/**
 * The orbit of a point (lattice basis) under a plane group: its distinct images in the
 * conventional cell, each in [0, 1), in the order of the operations that first give them; images
 * that coincide within the tolerance are merged. Throws a RangeError as `siteSymmetry`.
 */
export function orbit(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: PointOptions,
): readonly (readonly number[])[] {
  return Object.freeze(planeOrbit(groupKey(key, 'orbit'), point, options).map((p) => Object.freeze(p)));
}

/**
 * The asymmetric unit of a plane group as ITA prints it: a convex polygon given by its vertices and,
 * per edge, the printed inequality that holds it. Throws a RangeError for an unknown key.
 */
export function asymmetricUnit(key: PlaneGroupKey): AsymmetricUnit {
  const unit = planeAsymmetricUnit(groupKey(key, 'asymmetricUnit'));
  return Object.freeze({
    vertices: Object.freeze(unit.vertices.map((v) => Object.freeze(numbers(v)))),
    inequalities: Object.freeze(unit.inequalities.map((q) => Object.freeze([...q]))),
  });
}

/**
 * The symmetry elements of a plane group in its conventional cell [0, 1]², boundary included:
 * every rotation centre with the highest order of a rotation about it, and every mirror and glide
 * line that crosses the cell, with the segment inside it. Throws a RangeError for an unknown key.
 */
export function symmetryElements(key: PlaneGroupKey): SymmetryElements {
  const e = planeCellElements(groupKey(key, 'symmetryElements'));
  return Object.freeze({
    rotations: Object.freeze(
      e.rotations.map((r) => Object.freeze({ order: r.order, point: Object.freeze(numbers(r.point)) })),
    ),
    lines: Object.freeze(
      e.lines.map((l) =>
        Object.freeze({
          kind: l.kind,
          direction: Object.freeze([...l.direction]),
          normal: Object.freeze([...l.normal]),
          glide: Object.freeze(numbers(l.glide)),
          segment: Object.freeze(l.segment.map((p) => Object.freeze(numbers(p)))),
        }),
      ),
    ),
  });
}
