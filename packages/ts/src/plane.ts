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
  planePointGroupOperations,
  planePointGroupSettingCount,
  planePointGroupSymbol,
  planePointGroupSystem,
  type PlanePointGroupKey,
} from './spaceGroups/planePointGroups.js';
import { planeOrbit, planeSiteSymmetry, planeWyckoffPositionOf } from './spaceGroups/positions.js';
import { parseRational, toNumber, type Rational } from './spaceGroups/rational.js';

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
export const PLANE_GROUP_KEYS: readonly PlaneGroupKey[] = Object.freeze(GROUP_KEYS as PlaneGroupKey[]);

/** The keys of the 10 plane point groups, in the order of ITA Table 3.2.1.1. */
export const POINT_GROUP_KEYS: readonly PointGroupKey[] = Object.freeze([...PLANE_POINT_GROUP_KEYS]);

/** Options that choose the setting of a plane point group. */
export interface SettingOptions {
  /** 1-based setting: for `3m` 1 is `3m1` (default) and 2 is `31m`; the other point groups and the plane groups have one. */
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
  readonly system: PlaneSystem;
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
  readonly system: PlaneSystem;
  /** The order of the group. */
  readonly order: number;
  /** The number of settings: 2 for `3m`, otherwise 1. */
  readonly settings: number;
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

/** The Wyckoff position of a point, as ITA prints it. */
export interface PointWyckoffPosition {
  /** The Wyckoff letter. */
  readonly letter: string;
  /** The multiplicity. */
  readonly multiplicity: number;
  /** The oriented site-symmetry symbol. */
  readonly siteSymmetry: string;
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

function unknownKey(key: unknown): never {
  throw new RangeError(`Unknown plane group or plane point group: ${JSON.stringify(key)}`);
}

/** The plane group of a key; throws for a point group or an unknown key. */
function groupKey(key: unknown, what: string): PlaneGroupKey {
  if (isPlaneGroupKey(key)) return key;
  if (isPlanePointGroupKey(key))
    throw new RangeError(`${what} takes the key of a plane group, not of the point group ${key}`);
  return unknownKey(key);
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

/** The plane group with this key (short symbol). Throws a RangeError for an unknown key. */
export function planeGroup(key: PlaneGroupKey): PlaneGroup {
  const entry = planeGroupEntry(groupKey(key, 'planeGroup'));
  return Object.freeze({
    key: entry.symbol as PlaneGroupKey,
    number: entry.number,
    fullSymbol: entry.fullSymbol,
    pointGroup: entry.pointGroup as PointGroupKey,
    pointGroupSetting: entry.symbol === 'p31m' ? 2 : 1,
    system: entry.system,
    centring: Object.freeze(
      entry.centring.map((t) => Object.freeze(t.split(',').map((c) => toNumber(parseRational(c))))),
    ),
    origin: entry.origin,
    order: planeGroupOperations(entry.symbol).length,
  });
}

/** The plane point group with this key. Throws a RangeError for an unknown key. */
export function pointGroup(key: PointGroupKey): PointGroup {
  if (!isPlanePointGroupKey(key)) {
    if (isPlaneGroupKey(key))
      throw new RangeError(`pointGroup takes the key of a plane point group; ${key} is a plane group (planeGroup)`);
    unknownKey(key);
  }
  return Object.freeze({
    key,
    system: planePointGroupSystem(key),
    order: planePointGroupOperations(key).length,
    settings: planePointGroupSettingCount(key),
  });
}

/** The symbol of a plane point group in a setting: `'3m1'` or `'31m'` for `3m`, otherwise the key. */
export function symbol(key: PointGroupKey, options?: SettingOptions): string {
  if (!isPlanePointGroupKey(key)) {
    if (isPlaneGroupKey(key))
      throw new RangeError(`symbol takes the key of a plane point group; the symbols of ${key} are in planeGroup`);
    unknownKey(key);
  }
  return planePointGroupSymbol(key, settingOf(options));
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
  return Object.freeze(
    exact(key, options, false).map((op) => {
      const d = describePlaneOperation(op);
      return Object.freeze({
        kind: d.kind,
        order: d.order,
        ...(d.sense ? { sense: d.sense } : {}),
        ...(d.translation ? { translation: Object.freeze(numbers(d.translation)) } : {}),
        ...(d.location ? { location: Object.freeze(numbers(d.location)) } : {}),
        ...(d.direction ? { direction: Object.freeze([...d.direction]) } : {}),
        ...(d.glide ? { glide: Object.freeze(numbers(d.glide)) } : {}),
      });
    }),
  );
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
 * The Wyckoff position of a point (lattice basis) under a plane group, as ITA prints it: the
 * printed position of the point's multiplicity whose coordinates, with the centring, reach the
 * point set onto its site symmetry. Throws a RangeError as `siteSymmetry`.
 */
export function wyckoffPositionOf(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: PointOptions,
): PointWyckoffPosition {
  return Object.freeze({ ...planeWyckoffPositionOf(groupKey(key, 'wyckoffPositionOf'), point, options) });
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
          glide: Object.freeze(numbers(l.glide)),
          segment: Object.freeze(l.segment.map((p) => Object.freeze(numbers(p)))),
        }),
      ),
    ),
  });
}
