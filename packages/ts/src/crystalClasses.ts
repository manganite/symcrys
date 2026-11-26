/**
 * The crystallographic API: the 32 crystal classes, without time reversal. It is what `index.ts`
 * exports. Nothing here mentions time reversal: an operation is its matrix, a tensor has no time
 * parity, and the named properties are those of time-even tensors. A question that involves time
 * reversal (a magnetic point group, a time-odd tensor or property, an operation combined with time
 * reversal) is a RangeError that names the magnetic API (`magnetic.ts`, `symcrys/magnetic`), where
 * the key `'32'` is the white group and a crystal without magnetic order has the grey group of its
 * class (`"321'"`; docs/conventions.md, "Two entry points").
 *
 * Everything is computed by the modules that serve both entry points; this module checks what
 * comes in and leaves time reversal out of what goes back.
 */

import { checkOptions, shown, TOLERANCE_KEYS } from './checks.js';
import type { CrystalSystem, LatticeSystem } from './lattice.js';
import type { Mat3, Vec3 } from './linalg.js';
import type { CartesianOperation as MagneticOperation, Operation as MagneticRecord } from './operations.js';
import * as elements from './pointGroups/elements.js';
import * as groups from './pointGroups/pointGroups.js';
import type { AxesOptions, PointGroupKey, Setting, SettingOptions, SymbolOptions } from './pointGroups/pointGroups.js';
import * as properties from './pointGroups/properties.js';
import * as forms from './pointGroups/crystalForms.js';
import * as identify from './pointGroups/identify.js';
import * as orbits from './pointGroups/orbits.js';
import * as wyckoff from './pointGroups/wyckoff.js';
import * as directions from './pointGroups/directions.js';
import type { CartesianDirection, DirectionInput } from './pointGroups/directions.js';
import * as cell from './cell.js';
import * as site from './siteSymmetry.js';
import { TENSOR_PROPERTIES as ALL_TENSOR_PROPERTIES } from './tensors/propertyTable.js';
import type { TensorPropertyName as MagneticTensorPropertyName } from './tensors/propertyTable.js';
import * as tensors from './tensors/tensorForm.js';
import * as voigtNotation from './tensors/voigt.js';
import type {
  IntrinsicSymmetry,
  TensorForm,
  TensorKind,
  TensorRank,
  TensorSpec as MagneticTensorSpec,
} from './tensors/tensorForm.js';
import { deepFreeze } from './freeze.js';
import type { ToleranceOptions } from './tolerances.js';
import type { CrystalForm, CrystalFormType, CrystalFormTypeKey } from './pointGroups/crystalForms.js';
import type {
  OperationDescription as MagneticOperationDescription,
  SymmetryDirection,
} from './pointGroups/elements.js';
import type { CartesianOperationDescription as MagneticCartesianOperationDescription } from './pointGroups/identify.js';
import type {
  DirectionIndices,
  DirectionOrbitEntry,
  FaceIndices,
  FaceOrbitEntry,
  OrbitPole,
} from './pointGroups/orbits.js';
import type { WyckoffPosition } from './pointGroups/wyckoff.js';
import type { SiteSymmetry } from './siteSymmetry.js';
import type { VoigtOptions } from './tensors/voigt.js';

const USE_MAGNETIC =
  "the crystallographic API has no time reversal; use the magnetic API ('symcrys/magnetic', in Python symcrys.magnetic)";

/**
 * A point operation of a crystal class in a setting: ITA's matrix W in the lattice basis of the
 * setting (`matrix`, integer, acting on the coordinates of a lattice direction [uvw]; the coordinate
 * triplets of ITA's general position are its rows) and the same operation as an orthogonal Cartesian
 * matrix (`cartesian`: rotation, rotoinversion, mirror, inversion; R = B·W·B⁻¹ with the basis B of
 * the setting). docs/conventions.md, "Operations".
 */
export interface Operation {
  /** ITA's matrix W in the lattice basis of the setting, integer, rows first. */
  readonly matrix: Mat3;
  /** The orthogonal Cartesian 3×3 matrix, rows first. */
  readonly cartesian: Mat3;
}

/**
 * A crystal class with the properties that are fixed by its operations. None of them depends on
 * the setting (docs/conventions.md, "Properties").
 */
export interface PointGroup {
  /** The key (docs/conventions.md, "Keys"). */
  readonly key: PointGroupKey;
  /** The crystal system. */
  readonly crystalSystem: CrystalSystem;
  /** Number of operations. */
  readonly order: number;
  /** Contains the inversion. */
  readonly centrosymmetric: boolean;
  /** Polar (pyroelectric class): some direction is left unchanged by every operation. */
  readonly polar: boolean;
  /**
   * Enantiomorphic: proper rotations only, no rotoinversions or rotoreflections. Enantiomorphism,
   * enantiomerism, chirality and dissymmetry all name this one symmetry restriction.
   *
   * @remarks Source: ITA (2016), § 3.2.2.1.3, p. 738: "All these terms [enantiomorphism,
   * enantiomerism, chirality, dissymmetry] refer to the same symmetry restriction, the absence of
   * improper rotations (rotoinversions, rotoreflections)".
   */
  readonly enantiomorphic: boolean;
  /** The Laue class: the centrosymmetric crystal class generated by the class and the inversion. */
  readonly laueClass: PointGroupKey;
}

/** A crystal class in a given setting. */
export interface PointGroupInSetting {
  /** The key of the crystal class. */
  readonly key: PointGroupKey;
  /** The 1-based index of the setting. */
  readonly setting: number;
}

/** One point operation described geometrically. */
export type OperationDescription = Omit<MagneticOperationDescription, 'timeReversal'>;

/** The kind of tensor. */
export interface TensorSpec {
  /** Number of indices, 0 to 4. */
  readonly rank: TensorRank;
  /** `'polar'` or `'axial'`: whether an improper operation changes the sign (factor det R). */
  readonly kind: TensorKind;
  /** The index symmetry of the tensor. */
  readonly intrinsic: IntrinsicSymmetry;
  /**
   * Accepted in a specification a caller passes if `'even'`, so that one of the magnetic API can be
   * handed on; a time-odd tensor belongs to the magnetic API. Never set in a result.
   */
  readonly timeParity?: 'even';
}

/**
 * An operation as a caller passes it to a function that computes with Cartesian matrices: its
 * Cartesian matrix (`cartesian`; other fields, such as `matrix`, are not read), so that the
 * operations of `operations` can be passed as they are. The same notion as `CartesianOperation` of
 * the magnetic API, read without time reversal: `timeReversal: false` is accepted, so that an
 * operation of the magnetic API without time reversal can be handed on; `true` is refused, at
 * compile time and at run time.
 */
export interface CartesianOperation {
  /** The orthogonal Cartesian 3×3 matrix, rows first. */
  readonly cartesian: Mat3;
  /** Accepted if false; an operation with time reversal belongs to the magnetic API. */
  readonly timeReversal?: false;
}

/**
 * An operation of a list given to `residualOperations`: at least its matrix W; other fields are
 * kept. `timeReversal: false` is accepted, `true` belongs to the magnetic API.
 */
export interface CellOperation {
  /** The integer 3×3 matrix W acting on lattice coordinates (the `matrix` of an operation). */
  readonly matrix: Mat3;
  /** Accepted if false; an operation with time reversal belongs to the magnetic API. */
  readonly timeReversal?: false;
}

/** A named property: the tensor that describes it and what it is. */
export interface TensorProperty {
  /** The kind of tensor whose non-zero form means that the property is allowed. */
  readonly spec: TensorSpec;
  /** The physical quantity the tensor relates. */
  readonly description: string;
}

/** Name of a tensor property in `TENSOR_PROPERTIES`. */
export type TensorPropertyName = 'pyroelectric' | 'ferroaxial' | 'piezoelectric' | 'gyrotropic';
// Every name is one of the table of all properties (a compile-time check).
type _NamesInTable = TensorPropertyName extends MagneticTensorPropertyName ? true : never;
const _namesInTable: _NamesInTable = true;
void _namesInTable;

/**
 * The named tensor properties of the crystal classes: those of time-even tensors. `'gyrotropic'`
 * is optical activity. The properties of time-odd tensors (`'ferromagnetic'`, …) are in the
 * magnetic API.
 */
export const TENSOR_PROPERTIES = Object.freeze(
  Object.fromEntries(
    Object.entries(ALL_TENSOR_PROPERTIES)
      .filter(([, p]) => p.spec.timeParity === 'even')
      .map(([name, { spec, description }]) => [
        name,
        Object.freeze({
          spec: Object.freeze({ rank: spec.rank, kind: spec.kind, intrinsic: spec.intrinsic }),
          description,
        }),
      ]),
  ),
) as Readonly<Record<TensorPropertyName, TensorProperty>>;

const TENSOR_PROPERTY_NAMES = Object.freeze(Object.keys(TENSOR_PROPERTIES)) as readonly TensorPropertyName[];

// --- what comes in ---------------------------------------------------------------------------------

/** The key of a crystal class, checked. */
function classKey(key: PointGroupKey): PointGroupKey {
  if (groups.isPointGroupKey(key)) return key;
  if (groups.isMagneticPointGroupKey(key)) {
    throw new RangeError(`${shown(key)} is a magnetic point group, not a crystal class: ${USE_MAGNETIC}`);
  }
  throw new RangeError(`Unknown point group key: ${shown(key)}`);
}

/** A name of the table of this API, checked. */
function propertyName(name: TensorPropertyName): TensorPropertyName {
  if (typeof name === 'string') {
    if (Object.hasOwn(TENSOR_PROPERTIES, name)) return name;
    if (Object.hasOwn(ALL_TENSOR_PROPERTIES, name)) {
      throw new RangeError(`${shown(name)} is the property of a time-odd tensor: ${USE_MAGNETIC}`);
    }
  }
  throw new RangeError(`Unknown tensor property: ${shown(name)} (known: ${TENSOR_PROPERTY_NAMES.join(', ')})`);
}

/** The time-even tensor of a specification or of a property name, as the shared modules take it. */
function timeEven(specOrName: TensorSpec | TensorPropertyName): MagneticTensorSpec | TensorPropertyName {
  if (typeof specOrName === 'string') return propertyName(specOrName);
  if (typeof specOrName !== 'object' || specOrName === null) {
    throw new RangeError(`Not a tensor specification: ${shown(specOrName)}`);
  }
  const timeParity = (specOrName as { readonly timeParity?: unknown }).timeParity;
  if (timeParity === 'odd' || timeParity === 'c') {
    throw new RangeError(`A time-odd tensor (timeParity '${timeParity}'): ${USE_MAGNETIC}`);
  }
  if (timeParity !== undefined && timeParity !== 'even') {
    // The shared check names the values and the names up to 0.10 ('i', 'c').
    return { ...specOrName, timeParity: timeParity as never };
  }
  // The other fields are passed on as they are, so that the shared check reports a field of 0.10 (parity).
  return { ...specOrName, timeParity: 'even' };
}

/** Checks a list of operations of a caller: an operation with time reversal is an error. */
function checkUnitary(operations: readonly { readonly timeReversal?: false }[]): void {
  if (!Array.isArray(operations)) throw new RangeError('The operations must be an array');
  operations.forEach((op, i) => {
    if (typeof op !== 'object' || op === null) throw new RangeError(`Operation ${i} is not an object`);
    const timeReversal = (op as { readonly timeReversal?: unknown }).timeReversal;
    if (timeReversal === true) {
      throw new RangeError(`Operation ${i} is combined with time reversal: ${USE_MAGNETIC}`);
    }
    if (timeReversal !== undefined && timeReversal !== false) {
      throw new RangeError(`Operation ${i}: timeReversal must be false or absent, not ${shown(timeReversal)}`);
    }
  });
}

/** A list of operations as the shared modules take it. */
function unitary(operations: readonly CartesianOperation[]): MagneticOperation[] {
  checkUnitary(operations);
  // The other fields are kept for the checks of the shared modules (a record with `matrix` only
  // is refused there with a hint).
  return operations.map((op) => ({ ...op, timeReversal: false }));
}

// --- what goes back --------------------------------------------------------------------------------

const withoutTimeCache = new WeakMap<readonly MagneticRecord[], readonly Operation[]>();

/** The operations without time reversal; the shared modules return the same frozen list for the same call. */
function withoutTime(ops: readonly MagneticRecord[]): readonly Operation[] {
  let result = withoutTimeCache.get(ops);
  if (!result) {
    result = Object.freeze(ops.map((op) => Object.freeze({ matrix: op.matrix, cartesian: op.cartesian })));
    withoutTimeCache.set(ops, result);
  }
  return result;
}

const descriptionCache = new WeakMap<readonly MagneticOperationDescription[], readonly OperationDescription[]>();

// --- point groups ----------------------------------------------------------------------------------

export { POINT_GROUP_KEYS } from './pointGroups/pointGroups.js';

/** True if `key` is the key of one of the 32 crystal classes. */
export function isPointGroupKey(key: string): key is PointGroupKey {
  return groups.isPointGroupKey(key);
}

const groupCache = new Map<PointGroupKey, PointGroup>();

/** The crystal class with this key. Throws a RangeError for an unknown key. */
export function pointGroup(key: PointGroupKey): PointGroup {
  let g = groupCache.get(classKey(key));
  if (!g) {
    const { crystalSystem, order, centrosymmetric, polar, enantiomorphic, laueClass } = groups.pointGroup(key);
    g = Object.freeze({ key, crystalSystem, order, centrosymmetric, polar, enantiomorphic, laueClass });
    groupCache.set(key, g);
  }
  return g;
}

/** All 32 crystal classes, in the order of `POINT_GROUP_KEYS` (by crystal system, as in ITA). */
export function pointGroups(): readonly PointGroup[] {
  return deepFreeze(groups.POINT_GROUP_KEYS.map((key) => pointGroup(key)));
}

/**
 * Finds a crystal class by a symbol, read tolerantly.
 * It reads, spaces ignored (docs/conventions.md, "Reading symbols"): the key; the short or
 * full symbol of a setting (`312`, `1 1 2`); a Schoenflies symbol (`D3`; for -3 either `C3i` or
 * `S6`); Birss's cubic symbols without the overbar on the 3 (`m3m`). A symbol that names
 * several settings (the key `32`, which is also the symbol of the setting with rhombohedral axes;
 * `2` for unique axis b, c and a; any Schoenflies symbol) gives the standard (ITC default) setting,
 * unless the options `axes` or `uniqueAxis` choose another, as the headlines of ITA name the
 * settings (the option `axes` set to `'rhombohedral'` for the key `32`).
 *
 * Spellings: the overbar as `-`, `−`, a combining overbar or `¯` after the digit (`m3̄m`), `bar3` (also with a backslash and braces, as in LaTeX);
 * Schoenflies subscripts also as Unicode or LaTeX subscripts (`C₃ᵥ`, `C_{3v}`). Returns `undefined` if nothing matches,
 * also for the symbol of a magnetic group with time reversal; a value that is not a string, and a
 * symbol that names several groups, are a RangeError (the latter lists the groups).
 *
 * @remarks The two spellings of the Schoenflies symbols are those of ITA (`C3i`) and of ITC Vol. D
 * (`S6`).
 */
export function findPointGroup(symbol: string, options?: AxesOptions): PointGroupInSetting | undefined {
  if (arguments.length > 2) groups.rejectConventionArgument(arguments.length);
  return deepFreeze(groups.findPointGroup(symbol, options));
}

/** The settings of a crystal class, with their symbols and the ITC default. */
export function settings(key: PointGroupKey): readonly Setting[] {
  groups.rejectConventionArgument(arguments.length);
  return deepFreeze(groups.settings(classKey(key)));
}

/**
 * All operations of the crystal class in the requested setting (default: the ITC default setting),
 * in ITA's order: identity first, then as ITA numbers the general position (docs/conventions.md,
 * "Order of the operations"). Each operation is ITA's matrix W in the lattice basis of the setting
 * (`matrix`) with the same operation as a Cartesian matrix (`cartesian`; docs/conventions.md,
 * "Operations").
 */
export function operations(key: PointGroupKey, options?: SettingOptions): readonly Operation[] {
  return withoutTime(groups.operations(classKey(key), options));
}

/**
 * Generators of the crystal class in the requested setting (docs/conventions.md, "Generators"):
 * ITA's selected generators in ITA's order, without the identity and ITA's lattice translations,
 * so the list is empty for `1`; for the settings ITA does not list (`mm2` settings 2
 * and 3, monoclinic unique axis a), those of setting 1 carried into their frame.
 */
export function generators(key: PointGroupKey, options?: SettingOptions): readonly Operation[] {
  return withoutTime(groups.generators(classKey(key), options));
}

/**
 * A symbol of the crystal class in the requested setting, in ITA's notation (`321`, `C3i`;
 * docs/conventions.md, "Symbols").
 *
 * @remarks Source: ITA (2016), Tables 3.2.1.2 and 3.2.3.2.
 */
export function symbol(key: PointGroupKey, options?: SymbolOptions): string {
  const result = groups.symbol(classKey(key), options);
  // The Schoenflies symbol as ITA writes it (`C3i`); the magnetic API follows ITC Vol. D (`S6`).
  return options?.form === 'schoenflies' ? groups.classSchoenflies(key) : result;
}

// --- properties that follow from operations ---------------------------------------------------------

export { holohedry } from './pointGroups/properties.js';

/**
 * The lattice systems of a crystal class: those whose lattices it can act on. One for every class
 * but the trigonal ones, which belong to the hexagonal (hP) or the rhombohedral (hR) lattice system
 * depending on the basis, so they give both, `['hexagonal', 'rhombohedral']`. The holohedry of each
 * is `holohedry(latticeSystem)`. Throws a RangeError for an unknown key.
 *
 * @remarks Source: ITA (2016), § 1.3.4.4.2 and Table 1.3.4.1, p. 39.
 */
export function latticeSystems(key: PointGroupKey): readonly LatticeSystem[] {
  return groups.latticeSystems(classKey(key));
}

/**
 * True if the group generated by `operations` contains the inversion, e.g. for the operations of a
 * distorted crystal. The list is closed into a group within the tolerance and made exact first, as
 * `tensorFormOf` does. For a crystal class, read `pointGroup(key).centrosymmetric`. Throws a
 * RangeError as `tensorFormOf`.
 */
export function isCentrosymmetricOf(operations: readonly CartesianOperation[], options?: ToleranceOptions): boolean {
  return properties.isCentrosymmetricOf(unitary(operations), options);
}

/**
 * True if the group generated by `operations` is enantiomorphic: proper rotations only. For a
 * crystal class, read `pointGroup(key).enantiomorphic`. Polar is the named property
 * `'pyroelectric'`: `allowsPropertyOf(operations, 'pyroelectric')`. Throws a RangeError for an
 * operation without an orthogonal Cartesian matrix (`cartesian`; within the tolerance).
 *
 * @remarks Source: ITA (2016), § 3.2.2.1.3, p. 738.
 */
export function isEnantiomorphicOf(operations: readonly CartesianOperation[], options?: ToleranceOptions): boolean {
  return properties.isEnantiomorphicOf(unitary(operations), options);
}

// --- the point group of a list of operations -------------------------------------------------------

/** The crystal class of a list of operations: its key, and the setting if the operations are exactly those of one. */
export interface IdentifiedPointGroup {
  /** The key of the crystal class the operations generate. */
  readonly key: PointGroupKey;
  /**
   * The 1-based index of the setting whose operations the group equals, in the Cartesian frame of
   * symcrys; absent if the group is the class in another orientation.
   */
  readonly setting?: number;
}

/** One operation of any list described geometrically (`describeOperationsOf`). */
export type CartesianOperationDescription = Omit<MagneticCartesianOperationDescription, 'timeReversal'>;

/**
 * The crystal class generated by a list of Cartesian operations, for instance those left after
 * distorting a crystal: its key, and the setting whose operations it equals in the frame of symcrys
 * (absent if the group is the class in another orientation, e.g. a threefold axis along [111]). The
 * list is closed into a group first, two matrices being equal when no entry differs by `tolerance`
 * (default `EPSILON`) or more. Returns undefined if the operations generate a finite group that is
 * not a crystal class (an operation of order 5, a group larger than 48). Throws a RangeError for an
 * operation without an orthogonal Cartesian matrix (`cartesian`; within `tolerance`, at least
 * `EPSILON`), and if the operations do not close into a finite group within the tolerance, the
 * error of `tensorFormOf` for the same input (matrices with errors too large for it, or a rotation
 * by an angle that is not 360°/n). The classes `1` and `-1` have no
 * orientation, so they always have setting 1. The first call builds a table of the groups (about
 * 0.1 s in Node, 0.3 s in the Python package; docs/conventions.md, "Point group of a list of
 * operations").
 */
export function pointGroupOf(
  operations: readonly CartesianOperation[],
  options?: ToleranceOptions,
): IdentifiedPointGroup | undefined {
  return identify.pointGroupOf(unitary(operations), options) as IdentifiedPointGroup | undefined;
}

/**
 * Each operation of a list described geometrically, in the order of the list: kind, n, the
 * Cartesian axis (rotation or rotoinversion axis, mirror normal) with its first non-zero component,
 * in the order x, y, z, positive, and for n ≥ 3 the sense about that axis. The axes are not named
 * by lattice directions, since the list need not belong to a setting; for a crystal class given by
 * its key, `describeOperations` names them. Throws a RangeError for an operation without an orthogonal Cartesian matrix (`cartesian`)
 * or not a crystallographic operation (one whose matrix differs by more than three times the
 * tolerance from the operation its description names, a rotation by 360°/n, n = 1, 2, 3, 4, 6,
 * about its axis, or its product with the inversion), within `tolerance` (default `EPSILON`, as for
 * `pointGroupOf`).
 */
export function describeOperationsOf(
  operations: readonly CartesianOperation[],
  options?: ToleranceOptions,
): readonly CartesianOperationDescription[] {
  return Object.freeze(
    identify.describeOperationsOf(unitary(operations), options).map((d) => {
      const { timeReversal: _timeReversal, ...rest } = d;
      return Object.freeze(rest);
    }),
  );
}

// --- symmetry elements -----------------------------------------------------------------------------

/**
 * Each operation of the crystal class described geometrically, in the order of `operations` for
 * the same key and options. An axis lies along a symmetry direction and has the sign of the
 * operation's Seitz symbol, e.g. [1, 1, 0] for 2₁₁₀ in the hexagonal family, whose lattice symmetry
 * direction is [1̄, 1̄, 0]; for n ≥ 3 the sign fixes what the sense refers to.
 *
 * @remarks Source: ITA (6th ed., 2016), Tables 1.4.2.1–1.4.2.3, p. 52 (the Seitz symbols), and
 * Table 2.1.3.1 (the lattice symmetry direction [1̄, 1̄, 0]).
 */
export function describeOperations(key: PointGroupKey, options?: SettingOptions): readonly OperationDescription[] {
  const described = elements.describeOperations(classKey(key), options);
  let result = descriptionCache.get(described);
  if (!result) {
    result = Object.freeze(
      described.map(({ kind, n, axis, sense }) =>
        Object.freeze({ kind, n, ...(axis ? { axis } : {}), ...(sense ? { sense } : {}) }),
      ),
    );
    descriptionCache.set(described, result);
  }
  return result;
}

/**
 * The positions of the full Hermann–Mauguin symbol in the requested setting, each with its
 * symmetry directions and the symmetry elements along them. All positions of the crystal family are
 * listed (for rhombohedral axes the two positions of the rhombohedral lattice), also those the
 * symbol of the class leaves out (then without `symbol`); the triclinic family has none. A direction
 * has the sign ITA gives the lattice symmetry direction, the axis of an operation along it that of its Seitz
 * symbol, so the two are parallel and may be opposite: match them by direction, up to sign.
 *
 * @remarks Source: ITA (2016), Table 2.1.3.1 (the symmetry directions, their signs, and the row for
 * rhombohedral axes).
 */
export function symmetryDirections(key: PointGroupKey, options?: SettingOptions): readonly SymmetryDirection[] {
  return elements.symmetryDirections(classKey(key), options);
}

// --- site symmetry and Wyckoff positions -----------------------------------------------------------

/**
 * The site symmetry of `direction` (any non-zero vector, Cartesian) under `operations`, a point
 * group given as the list of all its operations (for instance those of a distorted crystal). The
 * operations fixing the direction within the tolerance are closed under products and the direction
 * is set onto their fixed space, repeated until stable, so that the result is a subgroup and the set
 * direction lies exactly on its elements. An empty list is the group 1. Each operation is read by
 * its Cartesian matrix (`cartesian`). Throws a RangeError for an operation without an orthogonal
 * Cartesian matrix (`cartesian`; within `tolerance`, at least `EPSILON`), for a list that is not
 * closed under products (only generators, for instance; the error names the missing product), for
 * a zero vector, and if the closed operations fix no common direction or do not settle into a group
 * (a tolerance far too large, e.g. 0.5).
 */
export function siteSymmetryOf(
  operations: readonly CartesianOperation[],
  direction: Vec3,
  options?: ToleranceOptions,
): SiteSymmetry {
  checkUnitary(operations);
  // The shared function reads the matrices only, so the list of the caller is passed on as it is.
  return site.siteSymmetryOf(operations as readonly MagneticOperation[], direction, options);
}

/**
 * The site symmetry of a face (field `hkl`), a lattice direction (`uvw`) or a Cartesian
 * direction (`cartesian`) under a crystal class in a setting: `siteSymmetryOf` applied to
 * `operations(key, options)`, so the indices refer to those operations; `direction` of the result is
 * the Cartesian unit vector (for a face its normal, `latticeBasis`). Throws a RangeError unless
 * exactly one of the three is given, for indices that are not three integers not all zero, and as
 * `siteSymmetryOf` does.
 *
 * @remarks A bare array, which could be either kind of vector, is a RangeError.
 */
export function siteSymmetry(
  key: PointGroupKey,
  direction: FaceIndices,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
export function siteSymmetry(
  key: PointGroupKey,
  direction: DirectionIndices,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
export function siteSymmetry(
  key: PointGroupKey,
  direction: CartesianDirection,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
export function siteSymmetry(
  key: PointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
export function siteSymmetry(
  key: PointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry {
  return wyckoff.siteSymmetry(classKey(key), direction, options);
}

/**
 * The Wyckoff positions of a crystal class for directions, computed from its operations, with ITA's
 * letters and notation, general position first (docs/conventions.md, "Site symmetry and Wyckoff
 * positions").
 *
 * @remarks Equal to ITA (6th ed., 2016), Table 3.2.3.2, pp. 745–769, for every printed setting.
 */
export function wyckoffPositions(key: PointGroupKey, options?: SettingOptions): readonly WyckoffPosition[] {
  return wyckoff.wyckoffPositions(classKey(key), options);
}

/**
 * The Wyckoff position of a face (field `hkl`), a lattice direction (`uvw`) or a Cartesian
 * direction (`cartesian`) in a crystal class: the position whose site symmetry is conjugate to that of the
 * direction (ITA's definition). `tolerance` as for `siteSymmetryOf`. Throws a RangeError as
 * `siteSymmetry` does, and if the operations found within the tolerance match no position.
 */
export function wyckoffPosition(
  key: PointGroupKey,
  direction: FaceIndices,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition;
export function wyckoffPosition(
  key: PointGroupKey,
  direction: DirectionIndices,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition;
export function wyckoffPosition(
  key: PointGroupKey,
  direction: CartesianDirection,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition;
export function wyckoffPosition(
  key: PointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition;
export function wyckoffPosition(
  key: PointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition {
  return wyckoff.wyckoffPosition(classKey(key), direction, options);
}

// --- lattice basis and orbits ---------------------------------------------------------------------

/**
 * The conventional basis a, b, c of a crystal class in a setting, as the columns of a Cartesian
 * matrix: the basis in which `matrix` of each operation is W and `cartesian` is B·W·B⁻¹.
 * Orthorhombic, tetragonal, cubic: x ∥ a, y ∥ b, z ∥ c, unit edge lengths. Hexagonal axes: x ∥ a,
 * z ∥ c, b at 120° from a, a = c = 1. Rhombohedral axes: the obverse basis a_R, b_R, c_R in that
 * hexagonal cell (edge length 2/3 for a = c = 1). A
 * direction [uvw] is B·u in this frame, the normal of a face (hkl) B⁻ᵀ·h. For the monoclinic and
 * triclinic families, whose cell angles a point group does not fix, it is the basis symcrys takes
 * for its operations, a, b, c along x, y, z; the basis of a real cell is `latticeFromParameters`.
 *
 * @remarks The matrix is frozen.
 */
export function latticeBasis(key: PointGroupKey, options?: SettingOptions): Mat3 {
  directions.checkFamilyName(key);
  return directions.latticeBasis(classKey(key), options);
}

/**
 * The operations of a list that keep the metric of a cell: W with WᵀGW = G, G the metric tensor
 * of `basis`. The operations are read by `matrix`, the integer matrix W on lattice coordinates, as
 * `operations` gives them; the list is taken as it is and the kept operations are the ones of the list, in its
 * order. The deviation counts relative to the largest entry of G (`tolerance`, default
 * `EPSILON`). An operation combined with time reversal belongs to the magnetic API.
 */
export function residualOperations<T extends CellOperation>(
  operations: readonly T[],
  basis: Mat3,
  options?: ToleranceOptions,
): readonly T[] {
  checkUnitary(operations);
  return cell.residualOperations(operations, basis, options);
}

/**
 * The orbit of a face (hkl) or of a lattice direction [uvw] under a crystal class, exactly, in the
 * lattice basis: the distinct faces (directions), in the order in which the operations reach them
 * (so the given face first), each with the indices of the operations that map
 * the given one onto it. A face transforms with the inverse transpose of a lattice operation,
 * h' = W⁻ᵀ·h, a direction with the operation itself, u' = W·u. The number of entries is the
 * multiplicity of the face (direction). Throws a RangeError unless exactly one of `hkl` and `uvw` is
 * given, as three integers not all zero (hexagonal axes: three indices, without i).
 */
export function orbit(key: PointGroupKey, indices: FaceIndices, options?: SettingOptions): readonly FaceOrbitEntry[];
export function orbit(
  key: PointGroupKey,
  indices: DirectionIndices,
  options?: SettingOptions,
): readonly DirectionOrbitEntry[];
export function orbit(
  key: PointGroupKey,
  indices: FaceIndices | DirectionIndices,
  options?: SettingOptions,
): readonly FaceOrbitEntry[] | readonly DirectionOrbitEntry[];
export function orbit(
  key: PointGroupKey,
  indices: FaceIndices | DirectionIndices,
  options?: SettingOptions,
): readonly FaceOrbitEntry[] | readonly DirectionOrbitEntry[] {
  return orbits.orbit(classKey(key), indices as FaceIndices, options);
}

/**
 * The orbit of a direction (any non-zero vector, Cartesian, e.g. a face normal) under a list of
 * operations, for instance those of a distorted crystal: the images of its unit vector under each
 * operation, coinciding images merged (closer than `tolerance`, default `EPSILON`, as for
 * `siteSymmetryOf`), in the order in which the operations reach them, each with the indices of the
 * operations that map the direction there. The list is a point group given as all its operations;
 * an empty list is the group 1, whose orbit is the direction itself. Throws a RangeError for a zero
 * vector, for an operation without an orthogonal Cartesian matrix (`cartesian`; within `tolerance`,
 * at least `EPSILON`) and for a list that is not closed under products (only generators, for
 * instance; the error names the missing product).
 */
export function orbitOf(
  operations: readonly CartesianOperation[],
  direction: Vec3,
  options?: ToleranceOptions,
): readonly OrbitPole[] {
  checkUnitary(operations);
  return orbits.orbitOf(operations, direction, options);
}

// --- crystal forms ---------------------------------------------------------------------------------

/**
 * The 47 kinds of crystal forms, by key (`'pedion'`, `'tetragonal-prism'`, …): their usual names,
 * numbers of faces and eigensymmetries. Each form of `crystalForms` names its kind by this key
 * (docs/conventions.md, "Crystal forms").
 *
 * @remarks The data are those of ITA (6th ed., 2016) Table 3.2.1.3, pp. 724–726.
 */
export const CRYSTAL_FORM_TYPES: Readonly<Record<CrystalFormTypeKey, CrystalFormType>> = forms.CRYSTAL_FORM_TYPES;

/**
 * The crystal forms of a crystal class: for each Wyckoff position (general position first) its
 * basic form (two for the cubic faces (hhl) of -43m and m-3m), then its limiting forms
 * (docs/conventions.md, "Crystal forms"), computed from the operations.
 *
 * @remarks Equal to ITA (6th ed., 2016), Table 3.2.3.2, pp. 745–769, for every printed setting.
 */
export function crystalForms(key: PointGroupKey, options?: SettingOptions): readonly CrystalForm[] {
  return forms.crystalForms(classKey(key), options);
}

// --- tensors ---------------------------------------------------------------------------------------

/**
 * The form of a tensor under a crystal class in the requested setting (default: the ITC default
 * setting). The tensor is given by its specification or by the name of a property in
 * `TENSOR_PROPERTIES` (`'piezoelectric'`; docs/conventions.md, "Tensors").
 */
export function tensorForm(
  key: PointGroupKey,
  spec: TensorSpec | TensorPropertyName,
  options?: SettingOptions,
): TensorForm {
  return tensors.tensorForm(classKey(key), timeEven(spec), options);
}

/**
 * The form of a tensor under the group generated by `operations`, e.g. the site symmetry of a
 * surface normal (`siteSymmetry`) or the operations of a distorted crystal. The tensor is given by
 * its specification or by the name of a property in `TENSOR_PROPERTIES`. Each operation is read by
 * its Cartesian matrix (`cartesian`), which must be orthogonal. The list is closed into a group
 * within the tolerance, and that group is made exact before the form is computed, so that matrices
 * with rounding errors (e.g. rounded to 6 decimals) give the form of the exact group, with its
 * number of free parameters (docs/conventions.md, "Tolerances"). Throws a RangeError for an
 * operation without an orthogonal Cartesian matrix (`cartesian`; within the tolerance) and for
 * operations that generate no finite group within the tolerance. The groups and forms of the last
 * 64 lists of operations are kept, so a list passed again (as in a loop) is answered without closing the group and
 * projecting again.
 */
export function tensorFormOf(
  operations: readonly CartesianOperation[],
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): TensorForm {
  return tensors.tensorFormOf(unitary(operations), timeEven(spec), options);
}

/**
 * The tensor `tensor` in a frame rotated by the orthogonal
 * matrix `rotation`: t′_{i…} = f·Σ R_{ia}…R_{…}·t_{a…}, with f = det(R) for an axial tensor and 1
 * for a polar one. To express a tensor in the frame of a surface, pass the matrix whose rows are
 * the new axes in the old frame. The kind of tensor is given by its specification or by the name
 * of a property in `TENSOR_PROPERTIES`. Throws a RangeError for a rotation that is not orthogonal
 * within the tolerance (per matrix entry of RᵀR).
 */
export function rotateTensor(
  tensor: readonly number[],
  rotation: Mat3,
  spec: TensorSpec | TensorPropertyName,
  options?: ToleranceOptions,
): readonly number[] {
  return tensors.rotateTensor(tensor, rotation, timeEven(spec), options);
}

/**
 * A tensor in Voigt's two-index notation: each contracted index pair ij becomes α = 1…6 for 11, 22,
 * 33, 23, 31, 12, and a component with
 * α = 4, 5, 6 is the tensor component times the factor of its pair (`factors`). A symmetric tensor of
 * rank 2 gives 6 components, one of rank 3 symmetric in its last pair a 3 × 6 matrix (d_iα), in its
 * first pair a 6 × 3 matrix (e_αk), one of rank 4 a 6 × 6 matrix (s_αβ, c_αβ). Throws a RangeError for a specification
 * without a symmetric index pair, factors that are missing or not one 1 or 2 per pair, and a tensor
 * that lacks the index symmetry of its specification (within the tolerance, relative to its largest
 * component).
 *
 * @remarks The tensor is flat, 3^rank components, as `tensorForm` gives a basis tensor. Source:
 * ITC Vol. D (2013), § 1.1.4.10, pp. 24–27; the index pairs, eq. (1.1.4.6).
 */
export function toVoigt(
  tensor: readonly number[],
  spec: TensorSpec | TensorPropertyName,
  options?: VoigtOptions,
): readonly number[] | readonly (readonly number[])[] {
  return voigtNotation.toVoigt(tensor, timeEven(spec), options);
}

/**
 * The tensor of a Voigt array (`toVoigt` in reverse): each tensor component is the Voigt component
 * of its index pairs over the factors of the pairs, so that the tensor has the index symmetry of its
 * specification. Throws a RangeError for a Voigt array of
 * the wrong shape, and for one that is no tensor of the specification (for rank 4 with interchangeable
 * pairs a 6 × 6 matrix that is not symmetric, for a totally symmetric tensor one whose
 * components do not agree), within the tolerance relative to its largest component.
 *
 * @remarks The tensor is flat, 3^rank components, as `tensorForm` gives a basis tensor.
 */
export function fromVoigt(
  voigt: readonly number[] | readonly (readonly number[])[],
  spec: TensorSpec | TensorPropertyName,
  options?: VoigtOptions,
): readonly number[] {
  return voigtNotation.fromVoigt(voigt, timeEven(spec), options);
}

/**
 * True if the crystal class allows the named property, e.g. `allowsProperty('-6m2',
 * 'piezoelectric')`: the tensor that describes it (`TENSOR_PROPERTIES`) has a non-zero form under
 * the class. Symmetry only allows a property; whether a crystal shows it is a question of the
 * material. It does not depend on the setting. Throws a RangeError for an unknown key or
 * name.
 */
export function allowsProperty(key: PointGroupKey, name: TensorPropertyName): boolean {
  return tensors.tensorForm(classKey(key), propertyName(name), { setting: 1 }).basis.length > 0;
}

/** The named properties the crystal class allows, in the order of `TENSOR_PROPERTIES`. */
export function allowedProperties(key: PointGroupKey): readonly TensorPropertyName[] {
  return deepFreeze(TENSOR_PROPERTY_NAMES.filter((name) => allowsProperty(key, name)));
}

/**
 * True if the group generated by `operations` allows the named property, e.g. for the site
 * symmetry of a surface normal or the operations of a distorted crystal. The operations are read
 * and closed as `tensorFormOf` reads them, within the tolerance, and it throws a RangeError as
 * `tensorFormOf` does.
 */
export function allowsPropertyOf(
  operations: readonly CartesianOperation[],
  name: TensorPropertyName,
  options?: ToleranceOptions,
): boolean {
  checkOptions(options, TOLERANCE_KEYS, 'allowsPropertyOf');
  const checked = propertyName(name);
  const { spec, perms } = tensors.checkedSpec(checked);
  return tensors.allowsTensor(tensors.callerGroup(unitary(operations), options).operations, spec, perms);
}

/** The named properties the group generated by `operations` allows. Reads the operations as `allowsPropertyOf`. */
export function allowedPropertiesOf(
  operations: readonly CartesianOperation[],
  options?: ToleranceOptions,
): readonly TensorPropertyName[] {
  checkOptions(options, TOLERANCE_KEYS, 'allowedPropertiesOf');
  const group = tensors.callerGroup(unitary(operations), options);
  return deepFreeze(
    TENSOR_PROPERTY_NAMES.filter((name) => {
      const { spec, perms } = tensors.checkedSpec(name);
      return tensors.allowsTensor(group.operations, spec, perms);
    }),
  );
}
