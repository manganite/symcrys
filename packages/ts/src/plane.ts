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

import { TOLERANCE_KEYS, checkOptions, shown } from './checks.js';
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
import { planeSnapToWyckoffPosition } from './spaceGroups/snap.js';
import { parseRational, rational, toNumber, type Rational } from './spaceGroups/rational.js';

export { VERSION } from './version.js';
export { EPSILON, type ToleranceOptions } from './tolerances.js';
import { toleranceOf, type ToleranceOptions } from './tolerances.js';
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
  /** The block "Origin" as ITA prints it, its positions spaced as printed, e.g. `'at 2 m m'`, `'at 2 1 g'`. */
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
   * as ITA names the operations (ITA 2016 Table 2.1.2.1, p. 145).
   */
  readonly kind: 'identity' | 'translation' | 'rotation' | 'reflection' | 'glide-reflection';
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
   * the `axis` of a reflection of the point groups is the normal of its plane, #137 C3), its symmetry
   * direction as in ITA Table 2.1.3.1: the shortest integer vector along the columns of W − I, first non-zero
   * component positive. Without a metric it is not the perpendicular of `direction`: in a hexagonal
   * basis the normal of a line along [1,0] is [1,2].
   */
  readonly axis?: readonly number[];
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

/** A point snapped onto a Wyckoff position: the position, as `wyckoffPositions` gives it, and the point on it. */
export interface SnappedPosition extends WyckoffPosition {
  /** The point on the position nearest to the given one, modulo the lattice, in [0, 1). */
  readonly point: readonly number[];
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

/** A rotation point in the cell (ITA 2016 Table 2.1.2.1, p. 145: the symmetry element of a rotation in the plane). */
export interface RotationPoint {
  /** The highest n of an n-fold rotation about it. */
  readonly n: number;
  /** Its position in [0, 1]². */
  readonly point: readonly number[];
}

/** A mirror or glide line: the part of it in the cell. */
export interface SymmetryLine {
  /** `'mirror'` or `'glide'`. */
  readonly kind: 'mirror' | 'glide';
  /** The direction of the line, the shortest integer vector, first non-zero component positive. */
  readonly direction: readonly number[];
  /** The normal of the line in the lattice basis, its symmetry direction, as `axis` in `describeOperations`. */
  readonly axis: readonly number[];
  /** For a glide line its glide vector s·direction, 0 < s < 1; for a mirror line (0, 0). */
  readonly glide: readonly number[];
  /** The two ends of the segment of the line in the cell [0, 1]², in the order of `direction`. */
  readonly segment: readonly (readonly number[])[];
}

/** The symmetry elements of a plane group in its conventional cell [0, 1]², boundary included. */
export interface SymmetryElements {
  /** The rotation points, by descending n, then by y and x. */
  readonly rotationPoints: readonly RotationPoint[];
  /** The mirror and glide lines that cross the cell, by direction, then by the start of the segment (y, then x). */
  readonly lines: readonly SymmetryLine[];
}

// ---------------------------------------------------------------------------------------------

const numbers = (v: readonly Rational[]): number[] => v.map(toNumber);

function isPlaneGroupKey(key: unknown): key is PlaneGroupKey {
  return typeof key === 'string' && (GROUP_KEYS as readonly string[]).includes(key);
}

function unknownKey(key: unknown, what = 'plane group or plane point group'): never {
  throw new RangeError(`Unknown ${what}: ${shown(key)}`);
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
    n: d.n,
    ...(d.sense ? { sense: d.sense } : {}),
    ...(d.translation ? { translation: Object.freeze(numbers(d.translation)) } : {}),
    ...(d.location ? { location: Object.freeze(numbers(d.location)) } : {}),
    ...(d.direction ? { direction: Object.freeze([...d.direction]) } : {}),
    ...(d.axis ? { axis: Object.freeze([...d.axis]) } : {}),
    ...(d.glide ? { glide: Object.freeze(numbers(d.glide)) } : {}),
  });
}

/** Tolerance for reading an integer or a fraction from a double. */
/** The largest denominator of a translation that `describeOperationsOf` reads. */
const MAX_DENOMINATOR = 12;

/**
 * The fraction with a denominator of at most `MAX_DENOMINATOR` within `tolerance` of the value.
 * Two such fractions can lie as close as 1/132 (1/11 and 1/12): a value within the tolerance of two
 * different ones is refused, not read as either.
 */
function fractionOf(value: unknown, tolerance: number): Rational {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const found: Rational[] = [];
    for (let d = 1; d <= MAX_DENOMINATOR; d++) {
      for (const n of [Math.floor(value * d), Math.ceil(value * d)]) {
        if (Math.abs(value - n / d) >= tolerance) continue;
        const r = rational(n, d);
        if (!found.some((f) => f[0] === r[0] && f[1] === r[1])) found.push(r);
      }
    }
    if (found.length === 1) return found[0];
    if (found.length > 1) {
      throw new RangeError(
        `The translation ${shown(value)} lies within ${tolerance} of ${found.map((f) => `${f[0]}/${f[1]}`).join(' and ')}: pass a smaller tolerance`,
      );
    }
  }
  throw new RangeError(
    `Not within ${tolerance} of a translation with a denominator of at most ${MAX_DENOMINATOR}: ${shown(value)}`,
  );
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
  return { matrix, translation: t.map((v) => fractionOf(v, tolerance)) };
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
      Object.freeze({ index: i + 1, symbol: planePointGroupSymbol(k, i + 1), isDefault: i === 0 }),
    ),
  );
}

/** The symbol of a plane point group in a setting: `'3m1'` or `'31m'` for `3m`, otherwise the key. */
export function symbol(key: PointGroupKey, options?: SettingOptions): string {
  checkOptions(options, ['setting'], 'symbol');
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
  checkOptions(options, ['setting'], 'operations');
  return Object.freeze(exact(key, options, false).map(plain));
}

/**
 * ITA's selected generators, in printed order, without the identity and the integer translations:
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
 * operation shifted by a lattice translation, or the operations of a site symmetry. Each operation is
 * `{ matrix, translation }` as `operations` gives it. Each matrix must have integer entries (within
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
export function siteSymmetry(key: PlaneGroupKey, point: readonly number[], options?: ToleranceOptions): SiteSymmetry {
  checkOptions(options, TOLERANCE_KEYS, 'siteSymmetry');
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
export function wyckoffPosition(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: ToleranceOptions,
): WyckoffPosition {
  checkOptions(options, TOLERANCE_KEYS, 'wyckoffPosition');
  const k = groupKey(key, 'wyckoffPosition');
  const { letter } = planeWyckoffPositionOf(k, point, options);
  const found = wyckoffPositions(k).find((w) => w.letter === letter);
  if (!found) throw new Error(`No Wyckoff position ${letter} in ${k}`);
  return found;
}

/**
 * Snaps a point (lattice basis) onto the most special Wyckoff position of a plane group that lies
 * within the tolerance of it, measured per coordinate modulo the lattice: a position without a free
 * parameter (a point) before one with one (a line), before the general position, which always holds
 * the point; among positions of the same kind the nearest. Returns the position, as
 * `wyckoffPositions` gives it, and the nearest point on it, in [0, 1). Unlike `wyckoffPosition`,
 * which asks whether the images of the point lie within the tolerance of it, this asks whether the
 * point lies within the tolerance of the position: an application that drags a point and lets it
 * snap passes a tolerance such as 10⁻². The point on a line is found by least squares in the
 * lattice coordinates. Throws a RangeError as `siteSymmetry`.
 */
export function snapToWyckoffPosition(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: ToleranceOptions,
): SnappedPosition {
  checkOptions(options, TOLERANCE_KEYS, 'snapToWyckoffPosition');
  const k = groupKey(key, 'snapToWyckoffPosition');
  if (!Array.isArray(point)) {
    throw new RangeError(`A point of the plane has two finite coordinates, not ${shown(point)}`);
  }
  const snapped = planeSnapToWyckoffPosition(k, point, options?.tolerance);
  const position = wyckoffPositions(k)[snapped.row];
  return Object.freeze({ ...position, point: Object.freeze([...snapped.point]) });
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
 * site symmetry (as `siteSymmetry` sets it), each in [0, 1), in the order of the operations that
 * first give them, each with the indices of the operations that map the point there (as the
 * entries of the orbits of the point groups): one entry per coset of the site symmetry, so the
 * first entry holds the operations of `siteSymmetry`. Throws a RangeError as `siteSymmetry`.
 */
export function orbit(
  key: PlaneGroupKey,
  point: readonly number[],
  options?: ToleranceOptions,
): readonly PointOrbitEntry[] {
  checkOptions(options, TOLERANCE_KEYS, 'orbit');
  return Object.freeze(
    planeOrbit(groupKey(key, 'orbit'), point, options).map((e) =>
      Object.freeze({ point: Object.freeze(e.point), operations: Object.freeze(e.operations) }),
    ),
  );
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
 * every rotation point with the highest n of a rotation about it, and every mirror and glide
 * line that crosses the cell, with the segment inside it. Throws a RangeError for an unknown key.
 */
export function symmetryElements(key: PlaneGroupKey): SymmetryElements {
  const e = planeCellElements(groupKey(key, 'symmetryElements'));
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
          segment: Object.freeze(l.segment.map((p) => Object.freeze(numbers(p)))),
        }),
      ),
    ),
  });
}
