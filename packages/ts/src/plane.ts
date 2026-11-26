/**
 * The plane API of symcrys (`symcrys/plane`): the 17 plane groups and the 10 plane point groups, in
 * the lattice basis, as ITA (6th ed., 2016) prints them in Chapter 2.2 and Table 3.2.1.1.
 * Everything exported here is covered by SemVer (see GUIDE.md), like the exports of `index.ts`.
 *
 * Inside, the operations are exact (integer matrices, rational translations); here they are plain
 * numbers: a translation of 1/3 is the nearest double. Keys are the symbols ITA prints: `'p2mg'`,
 * `'c2mm'` for the plane groups, `'2mm'`, `'3m'` for the plane point groups; the two sets do not
 * overlap. Functions that take a point take its coordinates in the lattice basis and an optional
 * `tolerance` (docs/conventions.md, "Plane groups").
 */

import { planeWyckoffRows } from './spaceGroups/planeWyckoff.js';
import { TOLERANCE_KEYS, checkOptions, shown } from './checks.js';
import { describePlaneOperation, type PlaneOperationKind } from './spaceGroups/describe.js';
import { planeAsymmetricUnit, planeElements, planeElementsInBox } from './spaceGroups/cell.js';
import { toPlain, type ExactOperation } from './spaceGroups/affine.js';
import { type PlaneSystem } from './spaceGroups/planeGroupData.js';
import {
  PLANE_FAMILIES,
  planeBravaisLattice,
  planeLatticeFromParameters,
  planeLatticeParameters,
  planeLaueClass,
  planeMetricTensor,
  planeResidualOperations,
  planeReciprocalBasis,
  type CellRestrictions,
  type LatticeParameters,
  type Mat2,
  type PlaneBravaisLattice,
} from './spaceGroups/planeLattice.js';
import { deepFreeze } from './freeze.js';
import { changeCoordinates } from './coordinates.js';
import {
  PLANE_GROUP_KEYS as GROUP_KEYS,
  planeGroupEntry,
  planeGroupGenerators,
  planeGroupOperations,
  planeGroupFullSymbol,
  planeGroupSystem,
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
  planeGroupPatterson,
} from './spaceGroups/planePointGroups.js';
import {
  planeMetric,
  planeOrbit,
  planeSiteOfPosition,
  planeWyckoffDistances,
  planeWyckoffPositionOf,
} from './spaceGroups/positions.js';
import { nearestFraction, parseRational, toNumber, type Rational } from './spaceGroups/rational.js';
import {
  CRYSTAL_FORM_TYPES,
  planePointGroupPositionRows,
  planeSiteSymmetryOperations,
  type CrystalFormTypeKey,
} from './spaceGroups/planePointGroupForms.js';

export { VERSION } from './version.js';
export { EPSILON, type ToleranceOptions } from './tolerances.js';
export {
  CRYSTAL_FORM_TYPES,
  type CrystalFormType,
  type CrystalFormTypeKey,
} from './spaceGroups/planePointGroupForms.js';
import { toleranceOf, type ToleranceOptions } from './tolerances.js';
import { compactSymbol } from './notation.js';
export type { PlaneSystem } from './spaceGroups/planeGroupData.js';
export type {
  CellRestrictions,
  LatticeParameters,
  Mat2,
  PlaneBravaisLattice,
  PlaneCellParameter,
  PlaneFixedAngles,
} from './spaceGroups/planeLattice.js';
export type { PlaneOperationKind } from './spaceGroups/describe.js';

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

/**
 * The keys of the 10 plane point groups, in ITA's order.
 *
 * @remarks Source: ITA (2016), Table 3.2.1.1.
 */
export const POINT_GROUP_KEYS: readonly PointGroupKey[] = Object.freeze([...PLANE_POINT_GROUP_KEYS]);

/** Options that choose the setting of a plane point group. */
export interface SettingOptions {
  /**
   * The setting, by its 1-based index or its symbol (spaces ignored): for the point group `3m` 1 or
   * `'3m1'` (default) and 2 or `'31m'`, and the key `'3m'` names the default; the other point groups
   * have one, and a plane group takes only 1 or its own symbol (short or full).
   */
  readonly setting?: number | string;
}

/** Options of `symbol`: the setting, and the form of a plane group's symbol. */
export interface SymbolOptions extends SettingOptions {
  /** `'short'` (default): the symbol as one word, the key; `'full'`: the full symbol, positions separated by spaces (`'p 1 m 1'` for `pm`). */
  readonly form?: 'short' | 'full';
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
  /** The plane point group. */
  readonly pointGroup: PointGroupKey;
  /** The setting of the point group: 2 for `p31m`, otherwise 1. */
  readonly pointGroupSetting: number;
  /** The crystal system. */
  readonly crystalSystem: PlaneSystem;
  /**
   * The Bravais lattice: `'mp'`, `'op'`, `'oc'`, `'tp'` or `'hp'`.
   *
   * @remarks Source: ITA (2016), Table 2.1.1.1, p. 143.
   */
  readonly bravaisLattice: PlaneBravaisLattice;
  /**
   * The Patterson symmetry, a plane group: the symmorphic plane group of the lattice of the group
   * whose point group is its Laue class, e.g. `'p2mm'` for `p2mg`, `'c2mm'` for `cm`.
   *
   * @remarks ITA (2016) § 2.1.3.5, p. 152; equal to the headlines of Chapter 2.2 for all 17 groups.
   */
  readonly pattersonSymmetry: PlaneGroupKey;
  /** The centring translations besides (0, 0): `[[0.5, 0.5]]` for `cm` and `c2mm`, otherwise none. */
  readonly centring: readonly (readonly number[])[];
  /**
   * The site symmetry of the origin, as an oriented site-symmetry symbol: `'2mm'` for `p2mm`, `'2..'`
   * for `p2mg`, `'1'` for `p1` and `pg`.
   */
  readonly origin: string;
}

/** A plane point group. */
export interface PointGroup {
  /** The key, e.g. `'2mm'`. */
  readonly key: PointGroupKey;
  /** The crystal system. */
  readonly crystalSystem: PlaneSystem;
  /** The order of the group. */
  readonly order: number;
  /**
   * The Laue class: the point group with the symmetry centre of the plane, the twofold rotation,
   * added; one of `'2'`, `'2mm'`, `'4'`, `'4mm'`, `'6'`, `'6mm'`.
   *
   * @remarks Source: ITA (2016), § 3.2.1.1, p. 720.
   */
  readonly laueClass: PointGroupKey;
}

/** A plane group found by `findPlaneGroup`. */
export interface PlaneGroupFound {
  /** The key of the plane group. */
  readonly key: PlaneGroupKey;
}

/** A plane point group in a setting, as `findPointGroup` finds it. */
export interface PointGroupInSetting {
  /** The key of the plane point group. */
  readonly key: PointGroupKey;
  /** The 1-based index of the setting. */
  readonly setting: number;
}

/** A setting of a plane point group. */
export interface Setting {
  /** 1-based. */
  readonly index: number;
  /** Its symbol: `'3m1'` or `'31m'` for `3m`, otherwise the key. */
  readonly symbol: string;
  /** True for the default setting (setting 1). */
  readonly isDefault: boolean;
}

/** What an operation is, geometrically, as ITA describes it under "Symmetry operations". */
export interface OperationDescription {
  /**
   * `'identity'`, `'translation'`, `'rotation'`, `'reflection'` (in a line) or `'glide-reflection'`,
   * as ITA names the operations.
   *
   * @remarks Source: ITA (2016), Table 2.1.2.1, p. 145.
   */
  readonly kind: PlaneOperationKind;
  /** The n of the linear part (an n-fold rotation): 1 for the identity and a translation, 2 for a reflection or glide reflection. */
  readonly n: number;
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
   * For a reflection or glide reflection: its axis, the normal of its line in the lattice basis (as
   * the `axis` of a reflection of the point groups is the normal of its plane), its symmetry
   * direction with the sign of its Seitz symbol (`m₁₀`, `m₁₂`): the shortest integer vector along the
   * columns of W − I, first non-zero component positive, which is the Seitz direction for every plane
   * group (tested). Without a metric it is not the perpendicular of `direction`: in a hexagonal basis
   * the normal of a line along [1,0] is [1,2].
   *
   * @remarks Source: ITA (2016), Tables 1.4.2.4 and 1.4.2.5, p. 53.
   */
  readonly axis?: readonly number[];
  /** For a glide: the glide vector (w + W·w)/2, not reduced modulo the lattice. */
  readonly glide?: readonly number[];
}

/**
 * A Wyckoff position of a plane group (points of the plane) or of a plane point group (directions of
 * the plane, with the edges normal to them).
 */
export interface WyckoffPosition {
  /** The Wyckoff letter. */
  readonly letter: string;
  /**
   * The multiplicity: for a plane group the number of points in the conventional cell, for a plane
   * point group the number of equivalent directions (and edges).
   */
  readonly multiplicity: number;
  /** The oriented site-symmetry symbol, written without spaces, e.g. `'.m.'`, `'2mm'`. */
  readonly siteSymmetry: string;
  /**
   * All coordinate doublets of the position, for a plane group those of the (0,0)+ set, e.g.
   * `['x,0', '-x,0']`; a leading `-` is an overbar.
   */
  readonly coordinates: readonly string[];
  /**
   * For a plane point group: the first edge of the position's basic form, its Miller indices in the
   * usual notation, e.g. `h,k`, `1,0`, or `h,k,i` and `1,1,-2` (Bravais–Miller indices) for the
   * hexagonal groups; a leading `-` is an overbar. In the hexagonal groups the first doublet and the
   * first edge of a special position may lie on different, conjugate mirror lines; both belong to
   * the position.
   */
  readonly millerIndices?: string;
  /**
   * For a plane point group: the indices into the operations of the group in the same setting
   * (`operations`) of those that fix the first edge (`millerIndices`), the site symmetry of the
   * edge, as for the faces of a crystal class.
   */
  readonly siteSymmetryOperations?: readonly number[];
}

/** An edge form of a plane point group, the crystal form of a two-dimensional crystal: a set of edges equivalent under the group. */
export interface CrystalForm {
  /** The Wyckoff letter of the position the edges belong to. */
  readonly letter: string;
  /** The number of edges: the multiplicity of the position. */
  readonly multiplicity: number;
  /** The oriented site-symmetry symbol of the position (the edge symmetry). */
  readonly siteSymmetry: string;
  /**
   * `true` for the basic form of the position, `false` for a limiting form: its edges have the edge
   * symmetry of the position, but the form has a higher symmetry.
   */
  readonly basic: boolean;
  /** The kind of the form, its key in `CRYSTAL_FORM_TYPES`. */
  readonly formType: CrystalFormTypeKey;
  /**
   * The first edge of the form in the usual notation, components separated by commas, e.g. `h,k`,
   * `1,0`, or `h,k,i` and `1,1,-2` (Bravais–Miller indices) for the hexagonal groups; a leading `-`
   * is an overbar.
   */
  readonly millerIndices: string;
}

/** The distance of a point to a Wyckoff position: the position, as `wyckoffPositions` gives it, the nearest point of it, and the distance. */
export interface WyckoffDistance extends WyckoffPosition {
  /** The point of the position nearest to the given one (lattice basis), modulo the lattice, in [0, 1). */
  readonly point: readonly number[];
  /**
   * The distance of the given point to the position: without a basis the larger of the two
   * coordinate differences modulo the lattice, with a basis Euclidean in its unit.
   */
  readonly distance: number;
}

/** Options of `wyckoffDistances`. */
export interface WyckoffDistanceOptions {
  /**
   * The Cartesian basis of the lattice, a 2 × 2 matrix whose columns are a and b; with it the
   * distances are Euclidean, without it they are measured per lattice coordinate.
   */
  readonly basis?: readonly (readonly number[])[];
}

/** The site symmetry of a point under a plane group. */
export interface SiteSymmetry {
  /** Indices into `operations` of those that map the point onto itself modulo the lattice, ascending: a subgroup. */
  readonly operations: readonly number[];
  /**
   * The point set onto the Wyckoff position it lies on (the nearest point of the position, as
   * `wyckoffDistances` gives it), in [0, 1).
   */
  readonly point: readonly number[];
  /** The number of points in the conventional cell equivalent to it. */
  readonly multiplicity: number;
  /** True if no operation other than the identity maps the point onto itself (general position). */
  readonly general: boolean;
}

/** The asymmetric unit of a plane group: ITA's inequalities, and the convex polygon they bound (lattice basis). */
export interface AsymmetricUnit {
  /**
   * ITA's inequalities, in ITA's order, each [a, b, c] for a·x + b·y ≤ c
   * (integers, no common factor), also those that hold no edge of the polygon (p3: x ≤ 2/3).
   */
  readonly inequalities: readonly (readonly number[])[];
  /** The vertices of the polygon, counter-clockwise (a towards b), starting at the lowest (smallest y, then x). */
  readonly vertices: readonly (readonly number[])[];
  /** Per edge, from vertex i to vertex i + 1, the index into `inequalities` of the inequality that holds it. */
  readonly edges: readonly number[];
}

/**
 * A rotation point: the symmetry element of a rotation in the plane.
 *
 * @remarks Source: ITA (2016), Table 2.1.2.1, p. 145.
 */
export interface RotationPoint {
  /** The highest n of an n-fold rotation about it. */
  readonly n: number;
  /** Its location, lattice basis. */
  readonly point: readonly number[];
}

/** A mirror or glide line, as a point and a direction (lattice basis). */
export interface SymmetryLine {
  /** `'mirror'` or `'glide'`. */
  readonly kind: 'mirror' | 'glide';
  /** The direction of the line, the shortest integer vector, first non-zero component positive. */
  readonly direction: readonly number[];
  /** The normal of the line in the lattice basis, its symmetry direction, as `axis` in `describeOperations`. */
  readonly axis: readonly number[];
  /** For a glide line its glide vector s·direction, 0 < s < 1; for a mirror line (0, 0). */
  readonly glide: readonly number[];
  /** A point of the line: its intersection with y = 0, or with x = 0 for a line along a. */
  readonly point: readonly number[];
}

/** Symmetry elements of a plane group. */
export interface SymmetryElements {
  /** The rotation points, by descending n, then by y and x. */
  readonly rotationPoints: readonly RotationPoint[];
  /** The mirror and glide lines, by direction, then by their point (x on y = 0, or y on x = 0), mirror before glide. */
  readonly lines: readonly SymmetryLine[];
}

/** Options of `symmetryElements`. */
export interface SymmetryElementsOptions {
  /**
   * A box of the plane, lattice basis, as its lower left and its upper right corner (x₀ ≤ x₁,
   * y₀ ≤ y₁; a line or a point of the plane also): all lattice translates of the elements that meet
   * it, boundary included, the lines not clipped.
   */
  readonly box?: readonly (readonly number[])[];
}

// ---------------------------------------------------------------------------------------------

const numbers = (v: readonly Rational[]): number[] => v.map(toNumber);

function isGroupKey(key: unknown): key is PlaneGroupKey {
  return typeof key === 'string' && (GROUP_KEYS as readonly string[]).includes(key);
}

function unknownKey(key: unknown, what = 'plane group or plane point group'): never {
  throw new RangeError(`Unknown ${what}: ${shown(key)}`);
}

/** The plane group of a key; throws for a point group or an unknown key. */
function groupKey(key: unknown, what: string): PlaneGroupKey {
  if (isGroupKey(key)) return key;
  if (isPlanePointGroupKey(key)) {
    throw new RangeError(`${what} takes the key of a plane group, not of the point group ${key}`);
  }
  return unknownKey(key, 'plane group');
}

/** The key of a plane point group; throws for a plane group or an unknown key. */
function pointKey(key: unknown, what: string): PointGroupKey {
  if (isPlanePointGroupKey(key)) return key;
  if (isGroupKey(key)) {
    throw new RangeError(`${what} takes the key of a plane point group; ${key} is a plane group (planeGroup)`);
  }
  return unknownKey(key, 'plane point group');
}

/**
 * The index of the setting that `options` names for a key, or undefined if it names none: an index
 * is passed on (and checked where it is used), a symbol is looked up among the settings of the key.
 */
function settingOf(key: PlaneGroupKey | PointGroupKey, options: SettingOptions | undefined): number | undefined {
  const setting = options?.setting;
  if (typeof setting !== 'string') return setting;
  const wanted = compactSymbol(setting);
  if (isGroupKey(key)) {
    if (wanted === key || wanted === planeGroupFullSymbol(key)) return 1;
    throw new RangeError(
      `The plane group ${key} has no setting ${shown(setting)} (its symbols: ${key}, ${planeGroupFullSymbol(key)})`,
    );
  }
  const symbols = Array.from({ length: planePointGroupSettingCount(key) }, (_, i) => planePointGroupSymbol(key, i + 1));
  const index = symbols.findIndex((s) => s === wanted);
  if (index >= 0) return index + 1;
  // The key of a point group with several settings is the symbol of none; it names the default.
  if (wanted === key) return 1;
  throw new RangeError(
    `The plane point group ${key} has no setting ${shown(setting)} (settings: ${symbols.join(', ')})`,
  );
}

/** The exact operations for a key: a plane group (setting 1 only) or a point group in a setting. */
function exact(key: unknown, options: SettingOptions | undefined, generatorsOnly: boolean): readonly ExactOperation[] {
  if (isGroupKey(key)) {
    const setting = settingOf(key, options);
    if (setting !== undefined && setting !== 1) {
      throw new RangeError(`The plane group ${key} has no setting ${String(setting)}`);
    }
    return generatorsOnly ? planeGroupGenerators(key) : planeGroupOperations(key);
  }
  if (isPlanePointGroupKey(key)) {
    const setting = settingOf(key, options);
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
    n: d.n,
    ...(d.sense ? { sense: d.sense } : {}),
    ...(d.translation ? { translation: Object.freeze(numbers(d.translation)) } : {}),
    ...(d.location ? { location: Object.freeze(numbers(d.location)) } : {}),
    ...(d.direction ? { direction: Object.freeze([...d.direction]) } : {}),
    ...(d.axis ? { axis: Object.freeze([...d.axis]) } : {}),
    ...(d.glide ? { glide: Object.freeze(numbers(d.glide)) } : {}),
  });
}

/** An operation from a caller as an exact operation; throws a RangeError unless it has the shape of a plane operation. */
function exactOf(op: unknown, tolerance: number): ExactOperation {
  const o = op as Partial<PlaneOperation> | null;
  const m = o?.matrix;
  const t = o?.translation;
  const isRow = (row: unknown): row is readonly number[] => Array.isArray(row) && row.length === 2;
  if (!Array.isArray(m) || m.length !== 2 || !m.every(isRow) || !Array.isArray(t) || t.length !== 2) {
    throw new RangeError(`Not an operation of the plane { matrix (2 × 2), translation (2) }: ${shown(op)}`);
  }
  const matrix = m.map((row) =>
    row.map((v) => {
      if (!(typeof v === 'number' && Math.abs(v - Math.round(v)) < tolerance)) {
        throw new RangeError(`The matrix of a plane operation has integer entries, not ${shown(m)}`);
      }
      return Math.round(v) + 0;
    }),
  );
  return { matrix, translation: t.map((v) => nearestFraction(v, tolerance, 'translation')) };
}

/** True if `key` is the key of one of the 17 plane groups (its short symbol in ITA's notation). */
export function isPlaneGroupKey(key: string): key is PlaneGroupKey {
  return isGroupKey(key);
}

/** True if `key` is the key of one of the 10 plane point groups. */
export function isPointGroupKey(key: string): key is PointGroupKey {
  return isPlanePointGroupKey(key);
}

/** The 17 plane groups, in ITA's order (plane group n at index n − 1). */
export function planeGroups(): readonly PlaneGroup[] {
  return Object.freeze(PLANE_GROUP_KEYS.map((key) => planeGroup(key)));
}

/**
 * The 10 plane point groups, in ITA's order.
 *
 * @remarks Source: ITA (2016), Table 3.2.1.1.
 */
export function pointGroups(): readonly PointGroup[] {
  return Object.freeze(POINT_GROUP_KEYS.map((key) => pointGroup(key)));
}

/**
 * Finds a plane group by a symbol: the key (the short symbol, `'pm'`) or the full symbol (`'p1m1'`,
 * `'p 1 m 1'`), spaces ignored (docs/conventions.md, "Reading symbols"). The lattice letter is
 * lower case, as in ITA's notation. Gives `undefined` if the symbol names no plane group; throws a
 * RangeError for a value that is not a string.
 */
export function findPlaneGroup(symbol: string): PlaneGroupFound | undefined {
  if (typeof symbol !== 'string') throw new RangeError(`A symbol is a string, not ${shown(symbol)}`);
  const wanted = compactSymbol(symbol);
  const key = PLANE_GROUP_KEYS.find((k) => k === wanted || planeGroupFullSymbol(k) === wanted);
  return key === undefined ? undefined : Object.freeze({ key });
}

/**
 * Finds a plane point group by a symbol: the key, or the symbol of a setting (`'3m1'`, `'31m'`),
 * spaces ignored; the key `'3m'` gives the default setting 1. Gives `undefined` if the symbol names
 * no plane point group, also for the symbol of a plane group (that is `findPlaneGroup`); throws a
 * RangeError for a value that is not a string.
 */
export function findPointGroup(symbol: string): PointGroupInSetting | undefined {
  if (typeof symbol !== 'string') throw new RangeError(`A symbol is a string, not ${shown(symbol)}`);
  const wanted = compactSymbol(symbol);
  for (const key of POINT_GROUP_KEYS) {
    for (let i = 1; i <= planePointGroupSettingCount(key); i++) {
      if (planePointGroupSymbol(key, i) === wanted) return Object.freeze({ key, setting: i });
    }
    if (key === wanted) return Object.freeze({ key, setting: 1 });
  }
  return undefined;
}

/** The plane group with this key (short symbol). Throws a RangeError for an unknown key. */
export function planeGroup(key: PlaneGroupKey): PlaneGroup {
  const entry = planeGroupEntry(groupKey(key, 'planeGroup'));
  const point = planePointGroupOf(entry.symbol);
  return Object.freeze({
    key: entry.symbol as PlaneGroupKey,
    number: entry.number,
    pointGroup: point.key,
    pointGroupSetting: point.setting,
    crystalSystem: planeGroupSystem(entry.symbol),
    bravaisLattice: planeBravaisLattice(planeGroupSystem(entry.symbol), entry.symbol),
    pattersonSymmetry: planeGroupPatterson(entry.symbol) as PlaneGroupKey,
    centring: Object.freeze(
      entry.centring.map((t) => Object.freeze(t.split(',').map((c) => toNumber(parseRational(c))))),
    ),
    origin: wyckoffPosition(entry.symbol as PlaneGroupKey, { point: [0, 0] }).siteSymmetry,
  });
}

/** The plane point group with this key. Throws a RangeError for an unknown key. */
export function pointGroup(key: PointGroupKey): PointGroup {
  const k = pointKey(key, 'pointGroup');
  return Object.freeze({
    key: k,
    crystalSystem: planePointGroupSystem(k),
    order: planePointGroupOperations(k).length,
    laueClass: planeLaueClass(k),
  });
}

/**
 * The settings of a plane point group: two for `3m` (`3m1`, the default, and `31m`), one for the
 * others. Throws a RangeError for an unknown key.
 */
export function settings(key: PointGroupKey): readonly Setting[] {
  const k = pointKey(key, 'settings');
  return Object.freeze(
    Array.from({ length: planePointGroupSettingCount(k) }, (_, i) =>
      Object.freeze({ index: i + 1, symbol: planePointGroupSymbol(k, i + 1), isDefault: i === 0 }),
    ),
  );
}

/**
 * The symbol of a plane group or a plane point group. In the short form (the default) the
 * Hermann–Mauguin symbol as one word: for a plane group the key (`'p2mg'`, `'pm'`), for a plane
 * point group in a setting `'3m1'` or `'31m'` for `3m`, otherwise the key. In the form `'full'`
 * the full symbol with its positions separated by spaces, as in the other entry points: `'p 1 m 1'`
 * for `pm` (ITA writes `p1m1`), `'p 2 m g'`, `'3 m 1'`; a plane point group has no other full
 * symbol in ITA. A plane group has setting 1 only. Throws a RangeError for an unknown key, setting
 * or form.
 *
 * @remarks Source: ITA (2016), Chapter 3.2, p. 721, and Table 3.2.3.1 (the symbols of the plane
 * point groups).
 */
export function symbol(key: PlaneGroupKey | PointGroupKey, options?: SymbolOptions): string {
  checkOptions(options, ['setting', 'form'], 'symbol');
  const form = options?.form ?? 'short';
  if (form !== 'short' && form !== 'full') {
    throw new RangeError(`Unknown symbol form: ${shown(form)} (short or full)`);
  }
  // Every position of a plane symbol is one character, the lattice letter included.
  const spaced = (text: string) => (form === 'full' ? [...text].join(' ') : text);
  if (isGroupKey(key)) {
    const setting = settingOf(key, options);
    if (setting !== undefined && setting !== 1) {
      throw new RangeError(`The plane group ${key} has no setting ${shown(setting)}`);
    }
    return spaced(form === 'full' ? planeGroupFullSymbol(key) : key);
  }
  if (!isPlanePointGroupKey(key)) return unknownKey(key);
  return spaced(planePointGroupSymbol(key, settingOf(key, options)));
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
  checkOptions(options, ['setting'], 'operations');
  return Object.freeze(exact(key, options, false).map(plain));
}

/**
 * ITA's selected generators, in ITA's order, without the identity and the integer translations:
 * for a centred plane group the centring translation first. A point group: the linear parts of the
 * generators of its symmorphic plane group. Throws a RangeError for an unknown key or setting.
 */
export function generators(key: PlaneGroupKey | PointGroupKey, options?: SettingOptions): readonly PlaneOperation[] {
  checkOptions(options, ['setting'], 'generators');
  return Object.freeze(exact(key, options, true).map(plain));
}

/**
 * Each operation of `operations` (same key and setting) described geometrically, index for index:
 * what it is, its n and sense, where its symmetry element lies, its glide part. Throws a
 * RangeError for an unknown key or setting.
 */
export function describeOperations(
  key: PlaneGroupKey | PointGroupKey,
  options?: SettingOptions,
): readonly OperationDescription[] {
  checkOptions(options, ['setting'], 'describeOperations');
  return Object.freeze(exact(key, options, false).map(describe));
}

/**
 * Any operations of the plane (lattice basis) described geometrically, index for index, as
 * `describeOperations` describes those of a group: for instance a product of operations, an
 * operation shifted by a lattice translation, or the operations of a site symmetry. Each operation has
 * a `matrix` and a `translation`, as `operations` gives it. Each matrix must have integer entries (within
 * the tolerance, per entry) and be the linear part of a crystallographic plane point group
 * (determinant ±1, order 1, 2, 3, 4 or 6); each component of a translation is read as the fraction
 * with a denominator of at most 12 within the tolerance (1/3 from 0.333…), as the translations of
 * `operations` and their products are. Throws a RangeError otherwise, also for a component within
 * the tolerance of two such fractions (which can lie 1/132 apart).
 */
export function describeOperationsOf(
  operations: readonly PlaneOperation[],
  options?: ToleranceOptions,
): readonly OperationDescription[] {
  checkOptions(options, TOLERANCE_KEYS, 'describeOperationsOf');
  const tolerance = toleranceOf(options, 'operations');
  if (!Array.isArray(operations)) {
    throw new RangeError('describeOperationsOf takes a list of operations { matrix, translation }');
  }
  return Object.freeze(operations.map((op) => describe(exactOf(op, tolerance))));
}

/**
 * The Wyckoff positions of a plane group or of a plane point group, in ITA's order, general
 * position first. A plane point group's positions are those of the directions in the plane, in the
 * setting `setting` (`3m` has two), each with the first edge of its basic form and the operations
 * that fix that edge; the point at the origin is left out. Throws a RangeError for an
 * unknown key or setting.
 *
 * @remarks Source: ITA (6th ed., 2016), Chapter 2.2 (the plane groups) and Table 3.2.3.1, pp. 742–744
 * (the plane point groups).
 */
export function wyckoffPositions(
  key: PlaneGroupKey | PointGroupKey,
  options?: SettingOptions,
): readonly WyckoffPosition[] {
  checkOptions(options, ['setting'], 'wyckoffPositions');
  if (isPlanePointGroupKey(key)) {
    const setting = settingOf(key, options) ?? 1;
    exact(key, options, false);
    return deepFreeze(
      planePointGroupPositionRows(key, setting).map(([letter, multiplicity, siteSymmetry, coordinates, forms]) => ({
        letter,
        multiplicity,
        siteSymmetry,
        coordinates: [...coordinates],
        millerIndices: forms[0][2],
        siteSymmetryOperations: planeSiteSymmetryOperations(key, setting, forms[0][2]),
      })),
    );
  }
  if (!isGroupKey(key)) unknownKey(key);
  const entry = planeGroupEntry(key);
  const setting = settingOf(entry.symbol as PlaneGroupKey, options);
  if (setting !== undefined && setting !== 1) {
    throw new RangeError(`The plane group ${entry.symbol} has no setting ${String(setting)}`);
  }
  return Object.freeze(
    planeWyckoffRows(entry.symbol).map(([multiplicity, letter, siteSymmetry, coordinates]) =>
      Object.freeze({ letter, multiplicity, siteSymmetry, coordinates: Object.freeze([...coordinates]) }),
    ),
  );
}

/**
 * The edge forms of a plane point group, the crystal forms of a two-dimensional crystal, in the
 * setting `setting`: for each Wyckoff position (general position first) its basic form, then a
 * limiting form where there is one. Throws a RangeError for an unknown key or setting and for a
 * plane group.
 *
 * @remarks Source: ITA (6th ed., 2016), Table 3.2.3.1, pp. 742–744.
 */
export function crystalForms(key: PointGroupKey, options?: SettingOptions): readonly CrystalForm[] {
  checkOptions(options, ['setting'], 'crystalForms');
  const k = pointKey(key, 'crystalForms');
  const setting = settingOf(k, options) ?? 1;
  exact(k, options, false);
  return deepFreeze(
    planePointGroupPositionRows(k, setting).flatMap(([letter, multiplicity, siteSymmetry, , forms]) =>
      forms.map(([basic, formType, millerIndices]) => {
        if (CRYSTAL_FORM_TYPES[formType].edges !== multiplicity) {
          throw new Error(
            `Plane point group ${k}: the form ${formType} does not have the multiplicity of position ${letter}`,
          );
        }
        return { letter, multiplicity, siteSymmetry, basic, formType, millerIndices };
      }),
    ),
  );
}

/** A point of the plane, in the lattice basis, for the functions of a plane group that take a point. */
export interface PlanePoint {
  /** The coordinates x, y of the point in the lattice basis a, b (fractions of the cell). */
  readonly point: readonly number[];
}

/** The coordinates of a `{ point }`, checked to be given in that form; their numbers are checked later. */
function pointOf(input: unknown, name: string): readonly number[] {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new RangeError(`${name} takes a point by its field point (lattice coordinates x, y), not ${shown(input)}`);
  }
  const other = Object.keys(input).filter((k) => k !== 'point');
  if (other.length > 0) throw new RangeError(`${name} takes the field point only, not ${shown(input)}`);
  return (input as PlanePoint).point;
}

/**
 * The site symmetry of a point (lattice basis) under a plane group, as one notion with its Wyckoff
 * position: the point is set onto the position it lies on within the tolerance
 * (`wyckoffPosition`), and the site symmetry is that of the point there; `point` is the point on the
 * position. Throws a RangeError for an unknown key, a point that is not two finite numbers, or a
 * tolerance outside (0, 1/2).
 */
export function siteSymmetry(key: PlaneGroupKey, point: PlanePoint, options?: ToleranceOptions): SiteSymmetry {
  checkOptions(options, TOLERANCE_KEYS, 'siteSymmetry');
  const site = planeSiteOfPosition(groupKey(key, 'siteSymmetry'), pointOf(point, 'siteSymmetry'), options);
  return Object.freeze({
    operations: Object.freeze([...site.operations]),
    point: Object.freeze([...site.point]),
    multiplicity: site.multiplicity,
    general: site.operations.length === 1,
  });
}

/**
 * The Wyckoff position of a point (lattice basis) under a plane group, as `wyckoffPositions` gives
 * it: the most special position whose point set lies within the tolerance of the point,
 * measured per coordinate modulo the lattice, and among positions of equal multiplicity the nearest
 * (the distance of `wyckoffDistances`); the general position always holds the point. Throws a
 * RangeError as `siteSymmetry`.
 */
export function wyckoffPosition(key: PlaneGroupKey, point: PlanePoint, options?: ToleranceOptions): WyckoffPosition {
  checkOptions(options, TOLERANCE_KEYS, 'wyckoffPosition');
  const k = groupKey(key, 'wyckoffPosition');
  const { letter } = planeWyckoffPositionOf(k, pointOf(point, 'wyckoffPosition'), options);
  const found = wyckoffPositions(k).find((w) => w.letter === letter);
  if (!found) throw new Error(`No Wyckoff position ${letter} in ${k}`);
  return found;
}

/**
 * The distance of a point (lattice basis) to every Wyckoff position of a plane group, in the order
 * of `wyckoffPositions`, each with the nearest point of the position. The point set
 * of a position is the union of the points of its coordinates with every centring and
 * lattice translation: a point, a line or the plane. Without a basis the distance is the larger of
 * the two coordinate differences modulo the lattice, the metric of the tolerance of
 * `wyckoffPosition`; with a basis (columns a, b) it is Euclidean, and the nearest point is the
 * Euclidean nearest one; per coordinate the nearest point of a line need not be unique (on x,0 every x
 * within the distance is as near), and then it is one of them. The basis should be a reduced cell,
 * such as the conventional one: the nearest lattice translate is sought near the rounded
 * coordinates. How to snap a dragged point onto a position (which position wins, within
 * which radius) is the application's choice; this gives the numbers for it. Throws a RangeError for
 * an unknown key, a point that is not two finite numbers, and a basis that is not a non-singular
 * 2 × 2 matrix.
 */
export function wyckoffDistances(
  key: PlaneGroupKey,
  point: PlanePoint,
  options?: WyckoffDistanceOptions,
): readonly WyckoffDistance[] {
  checkOptions(options, ['basis'], 'wyckoffDistances');
  const k = groupKey(key, 'wyckoffDistances');
  const g = options?.basis === undefined ? undefined : planeMetric(options.basis);
  const positions = wyckoffPositions(k);
  return Object.freeze(
    planeWyckoffDistances(k, pointOf(point, 'wyckoffDistances'), g).map((d) =>
      Object.freeze({ ...positions[d.row], point: Object.freeze([...d.point]), distance: d.distance }),
    ),
  );
}

/** One point of the orbit of a point. */
export interface PointOrbitEntry {
  /** The image, in the lattice basis, in [0, 1). */
  readonly point: readonly number[];
  /** Indices into `operations` of the operations that map the given point here (modulo the lattice), ascending. */
  readonly operations: readonly number[];
}

/**
 * The orbit of a point (lattice basis) under a plane group: the images of the point set onto its
 * Wyckoff position (as `siteSymmetry` sets it), each in [0, 1), in the order of the operations that
 * first give them, each with the indices of the operations that map the point there (as the
 * entries of the orbits of the point groups): one entry per coset of the site symmetry, so the
 * first entry holds the operations of `siteSymmetry`. Throws a RangeError as `siteSymmetry`.
 */
export function orbit(key: PlaneGroupKey, point: PlanePoint, options?: ToleranceOptions): readonly PointOrbitEntry[] {
  checkOptions(options, TOLERANCE_KEYS, 'orbit');
  return Object.freeze(
    planeOrbit(groupKey(key, 'orbit'), pointOf(point, 'orbit'), options).map((e) =>
      Object.freeze({ point: Object.freeze(e.point), operations: Object.freeze(e.operations) }),
    ),
  );
}

/**
 * The asymmetric unit of a plane group as ITA gives it: ITA's inequalities, all of them
 * in ITA's order (a double inequality and a `min` give one each), and the convex polygon
 * they bound, with its vertices and, per edge, the index of the inequality that holds it. Throws a
 * RangeError for an unknown key.
 */
export function asymmetricUnit(key: PlaneGroupKey): AsymmetricUnit {
  const unit = planeAsymmetricUnit(groupKey(key, 'asymmetricUnit'));
  return Object.freeze({
    inequalities: Object.freeze(unit.inequalities.map((q) => Object.freeze([...q]))),
    vertices: Object.freeze(unit.vertices.map((v) => Object.freeze(numbers(v)))),
    edges: Object.freeze([...unit.edges]),
  });
}

/**
 * The symmetry elements of a plane group. Without a box, each element once modulo the
 * lattice translations, the centring (1/2, 1/2) included, as ITA describes them (cm: the mirror line
 * 0,y and the glide line 1/4,y): every rotation point in [0, 1)² with the highest n of a rotation
 * about it, and every mirror and glide line, as a point in [0, 1)² and a direction. With a box, all
 * their lattice translates that meet it, boundary included; the lines are not clipped, since
 * clipping is drawing. Throws a RangeError for an unknown key, a box that is not two corners of
 * finite numbers, the first not above or right of the second, and a box with more than a million
 * rotation points.
 */
export function symmetryElements(key: PlaneGroupKey, options?: SymmetryElementsOptions): SymmetryElements {
  checkOptions(options, ['box'], 'symmetryElements');
  const k = groupKey(key, 'symmetryElements');
  const box = options?.box;
  let e;
  if (box === undefined) e = planeElements(k);
  else {
    const ok =
      Array.isArray(box) &&
      box.length === 2 &&
      box.every(
        (c) => Array.isArray(c) && c.length === 2 && c.every((v) => typeof v === 'number' && Number.isFinite(v)),
      );
    if (!ok || !(box[0][0] <= box[1][0] && box[0][1] <= box[1][1])) {
      throw new RangeError(`A box is two corners [[x0, y0], [x1, y1]] with x0 <= x1 and y0 <= y1, not ${shown(box)}`);
    }
    e = planeElementsInBox(k, [
      [box[0][0], box[0][1]],
      [box[1][0], box[1][1]],
    ]);
  }
  return Object.freeze({
    rotationPoints: Object.freeze(
      e.rotationPoints.map((r) => Object.freeze({ n: r.n, point: Object.freeze(numbers(r.point)) })),
    ),
    lines: Object.freeze(
      e.lines.map((l) =>
        Object.freeze({
          kind: l.kind,
          direction: Object.freeze([...l.direction]),
          axis: Object.freeze([...l.axis]),
          glide: Object.freeze(numbers(l.glide)),
          point: Object.freeze(numbers(l.point)),
        }),
      ),
    ),
  });
}

// --- lattices and cells --------------------------------------------------------------------------

const PLANE_SYSTEMS = Object.keys(PLANE_FAMILIES) as PlaneSystem[];

const copy = (m: Mat2): Mat2 => [
  [m[0][0], m[0][1]],
  [m[1][0], m[1][1]],
];

/**
 * The restrictions on the cell parameters of a crystal system of the plane, as ITA gives them for
 * the conventional cell: the parameters to be determined, the pairs of equal parameters, the fixed
 * angles, and the angles conventionally taken non-acute. Throws a RangeError for anything that is
 * not one of the four crystal systems of the plane.
 *
 * @remarks Source: ITA (2016), Table 2.1.1.1, p. 143.
 */
export function cellRestrictions(system: PlaneSystem): CellRestrictions {
  if (!(PLANE_SYSTEMS as readonly unknown[]).includes(system)) {
    throw new RangeError(`Unknown crystal system of the plane: ${shown(system)} (${PLANE_SYSTEMS.join(', ')})`);
  }
  const r = PLANE_FAMILIES[system].restrictions;
  return deepFreeze({
    parameters: [...r.parameters],
    equal: r.equal.map((pair) => [...pair]),
    angles: { ...r.angles },
    nonAcute: [...r.nonAcute],
  });
}

/**
 * The Cartesian basis of a plane cell as the columns of a 2 × 2 matrix: a along x, b at γ from a
 * towards +y (right-handed), in the unit of the edge lengths. Throws a RangeError for an edge that is
 * not a positive number and for γ outside (0°, 180°).
 */
export function latticeFromParameters(parameters: LatticeParameters): Mat2 {
  return deepFreeze(copy(planeLatticeFromParameters(parameters, 'latticeFromParameters')));
}

/**
 * The parameters a, b, γ of a basis given as the columns of a 2 × 2 Cartesian matrix, independent of
 * its orientation and handedness. Throws a RangeError for a basis that is not a non-singular 2 × 2
 * matrix.
 */
export function latticeParameters(basis: Mat2): LatticeParameters {
  return Object.freeze(planeLatticeParameters(basis, 'latticeParameters'));
}

/** The metric tensor G = AᵀA of a basis A (columns a, b): g_ij = a_i · a_j. Throws a RangeError for a basis that is not a non-singular 2 × 2 matrix. */
export function metricTensor(basis: Mat2): Mat2 {
  return deepFreeze(copy(planeMetricTensor(basis, 'metricTensor')));
}

/**
 * The reciprocal basis B = A⁻ᵀ of a basis A (columns a, b) as the columns a*, b*, with
 * a_i · a*_j = δ_ij (no factor 2π). Throws a RangeError for a basis that is not a non-singular 2 × 2
 * matrix.
 */
export function reciprocalBasis(basis: Mat2): Mat2 {
  return deepFreeze(copy(planeReciprocalBasis(basis, 'reciprocalBasis')));
}

/** An operation of a list given to `residualOperations`: at least its matrix W; other fields are kept. */
export interface PlaneCellOperation {
  /** The integer 2 × 2 matrix W acting on lattice coordinates. */
  readonly matrix: readonly (readonly number[])[];
}

/**
 * The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor of
 * `basis` (columns a, b). It is the point symmetry of a distorted lattice among the operations of a
 * group, e.g. those of p4mm that a rectangular cell keeps. The operations are read by `matrix`, the
 * integer matrix W on lattice coordinates, as `operations` gives them; the list is taken as it is,
 * not closed into a group, and the kept operations are the ones of the list, in its order. The
 * deviation counts relative to the largest entry of G (`tolerance`, default `EPSILON`), so the
 * result does not depend on the unit of the edge lengths. Throws a RangeError for an operation
 * without a 2 × 2 integer matrix and for a basis that is not a non-singular 2 × 2 matrix.
 */
export function residualOperations<T extends PlaneCellOperation>(
  operations: readonly T[],
  basis: Mat2,
  options?: ToleranceOptions,
): readonly T[] {
  checkOptions(options, TOLERANCE_KEYS, 'residualOperations');
  const tolerance = toleranceOf(options, 'metric');
  // The list is frozen, not the operations in it, which are the caller's.
  return Object.freeze(planeResidualOperations(operations, basis, tolerance, 'residualOperations'));
}

// --- change of the coordinate system -------------------------------------------------------------

/**
 * A change of the coordinate system (P, p) of the plane: (a′, b′) = (a, b)·P, origin O′ = O + p.
 *
 * @remarks Source: ITA (2016), § 1.5.1.3, p. 83.
 */
export interface CoordinateTransformation {
  /** P, the linear part: its columns are the new basis vectors a′, b′ in the old basis; det P ≠ 0, also negative. */
  readonly linearPart: Mat2;
  /** p, the origin shift: the coordinates of the new origin in the old coordinate system; default zero. */
  readonly originShift?: readonly number[];
}

/** An operation (W, w) in the lattice basis, x ↦ W·x + w; a record of `operations` passes as it is. */
export interface AffineOperation {
  /** The linear part W, a 2 × 2 matrix with integer entries. */
  readonly matrix: readonly (readonly number[])[];
  /** The translation part w; default zero, as for the operations of a point group. */
  readonly translation?: readonly number[];
}

/** An operation (W′, w′) in the new coordinate system. */
export interface TransformedOperation {
  /** W′ = P⁻¹WP, integer entries. */
  readonly matrix: Mat2;
  /** w′ = P⁻¹(w + (W − I)p), not reduced modulo the lattice. */
  readonly translation: readonly number[];
}

/** The quantities that `changeOfCoordinates` transforms; each is optional. */
export interface CoordinateQuantities {
  /**
   * Point coordinates x: x′ = P⁻¹(x − p).
   *
   * @remarks Source: ITA (2016), eq. (1.5.1.7).
   */
  readonly points?: readonly (readonly number[])[];
  /**
   * Coefficients [uv] of vectors, e.g. directions: [uv]′ = P⁻¹[uv]; not changed by the origin shift.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.3).
   */
  readonly directions?: readonly (readonly number[])[];
  /**
   * Miller indices (hk) of lines: (hk)′ = (hk)P; not changed by the origin shift.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.2).
   */
  readonly planes?: readonly (readonly number[])[];
  /**
   * The metric tensor G: G′ = PᵀGP.
   *
   * @remarks Source: ITA (2016), eq. (1.5.2.4).
   */
  readonly metric?: Mat2;
  /**
   * Operations (W, w): W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p).
   *
   * @remarks Source: ITA (2016), eqs. (1.5.2.12), (1.5.2.13).
   */
  readonly operations?: readonly AffineOperation[];
}

/** The inverse change of the coordinate system (Q, q) = (P, p)⁻¹. */
export interface InverseTransformation {
  /** Q = P⁻¹. */
  readonly linearPart: Mat2;
  /** q = −P⁻¹p. */
  readonly originShift: readonly number[];
}

/** The result of `changeOfCoordinates`: the inverse pair and each given quantity in the new coordinate system. */
export interface CoordinateChange {
  /**
   * (Q, q) = (P⁻¹, −P⁻¹p), which takes the new coordinates back to the old.
   *
   * @remarks Source: ITA (2016), eq. (1.5.1.7).
   */
  readonly inverse: InverseTransformation;
  /** The points, as given, in the new coordinates. */
  readonly points?: readonly (readonly number[])[];
  /** The vector coefficients, as given, in the new basis. */
  readonly directions?: readonly (readonly number[])[];
  /** The Miller indices, as given, in the new basis. */
  readonly planes?: readonly (readonly number[])[];
  /** The metric tensor in the new basis. */
  readonly metric?: Mat2;
  /** The operations, as given, in the new coordinate system. */
  readonly operations?: readonly TransformedOperation[];
}

/**
 * Changes the coordinate system of the plane by the pair (P, p), with 2 × 2 matrices: the new basis
 * is (a′, b′) = (a, b)·P and the new origin lies at p. Transforms the given quantities by ITA's
 * equations: point coordinates
 * x′ = P⁻¹(x − p), vector coefficients [uv]′ = P⁻¹[uv], Miller indices (hk)′ = (hk)P, the metric
 * tensor G′ = PᵀGP, and operations W′ = P⁻¹WP, w′ = P⁻¹(w + (W − I)p); and gives the inverse pair
 * (Q, q) = (P⁻¹, −P⁻¹p). det P may be negative.
 *
 * P, p and the operations are read each number as the simplest fraction within the tolerance
 * (default `EPSILON`; 0.3333333 is 1/3) and transformed exactly, so that every result, the inverse
 * pair included, can be passed back; the other quantities are floating point. P is rational in a
 * change between lattice bases, as in ITA; an irrational P (a rotation by 30°) is read as the
 * nearby fractions, about as exact as the tolerance, and a much smaller tolerance can make the exact
 * products leave the safe integers, a RangeError.
 * A transformed operation has a `matrix` and a `translation`. Throws a RangeError for a singular P, a quantity of the
 * wrong shape, an unknown quantity, an operation with det W ≠ ±1, and one whose W′ is not integral.
 *
 * @remarks Source: ITA (6th ed., 2016), § 1.5.1.3, p. 83 (the pair (P, p)); § 1.5.2, pp. 83–85 (the
 * equations).
 */
export function changeOfCoordinates(
  transformation: CoordinateTransformation,
  quantities: CoordinateQuantities,
  options?: ToleranceOptions,
): CoordinateChange {
  return deepFreeze(
    changeCoordinates(2, transformation, quantities, options, 'changeOfCoordinates') as unknown as CoordinateChange,
  );
}
