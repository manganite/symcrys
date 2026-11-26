/**
 * A direction given to a function of a key: a face (hkl), a lattice direction [uvw] or a Cartesian
 * vector, each named by its field, so that lattice indices cannot pass for a Cartesian vector; and
 * the lattice basis of a setting, which converts between them (docs/conventions.md, "Cartesian
 * frame").
 */

import { checkNumbers, checkOptions, SETTING_KEYS, shown } from '../checks.js';
import { apply, inverse, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { deepFreeze } from '../freeze.js';
import { settingBasis } from './classData.js';
import { classSettingOf, type MagneticPointGroupKey, type SettingOptions } from './pointGroups.js';
import type { Uvw } from '../symmetryDirections.js';
import type { Hkl } from './wyckoff.js';

/** A face (hkl), for the functions of a key that take a face or a direction. */
export interface FaceIndices {
  /** The face (hkl), three integers not all zero (hexagonal axes: three indices, without i). */
  readonly hkl: Hkl;
}

/** A lattice direction [uvw], for the functions of a key that take a face or a direction. */
export interface DirectionIndices {
  /** The lattice direction [uvw], three integers not all zero. */
  readonly uvw: Uvw;
}

/** A direction as a Cartesian vector, for the functions of a key that take a face or a direction. */
export interface CartesianDirection {
  /** The direction in the Cartesian frame of symcrys, any non-zero vector (its length does not matter). */
  readonly cartesian: Vec3;
}

/** A face, a lattice direction or a Cartesian direction, named by its field. */
export type DirectionInput = FaceIndices | DirectionIndices | CartesianDirection;

const FIELDS = ['hkl', 'uvw', 'cartesian'] as const;

/** Three integers, not all zero, as indices of a face or a lattice direction; a RangeError otherwise. */
export function indicesOf(value: unknown, name: string): readonly [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((x) => typeof x === 'number' && Number.isSafeInteger(x)) ||
    value.every((x) => x === 0)
  ) {
    throw new RangeError(`${name} must be three (safe) integers, not all zero: ${shown(value)}`);
  }
  return [value[0] + 0, value[1] + 0, value[2] + 0];
}

/** The field of a direction input that is given, checked: exactly one of `hkl`, `uvw`, `cartesian`. */
export function directionField(input: unknown, name: string): (typeof FIELDS)[number] {
  if (Array.isArray(input)) {
    throw new RangeError(
      `${name} takes a face (hkl), a lattice direction (uvw) or a Cartesian vector (cartesian), named by ` +
        `its field, not a bare array: ${shown(input)}`,
    );
  }
  if (typeof input !== 'object' || input === null) {
    throw new RangeError(
      `${name} takes a face (hkl), a lattice direction (uvw) or a Cartesian vector (cartesian), not ${shown(input)}`,
    );
  }
  const given = FIELDS.filter((f) => (input as Record<string, unknown>)[f] !== undefined);
  const other = Object.keys(input).filter((k) => !(FIELDS as readonly string[]).includes(k));
  if (given.length !== 1 || other.length > 0) {
    throw new RangeError(`${name} takes exactly one of the fields hkl, uvw and cartesian, not ${shown(input)}`);
  }
  return given[0];
}

/**
 * The conventional basis a, b, c of a point group in a setting, as the columns of a Cartesian
 * matrix with unit edge lengths: the basis in which `matrix` of each operation is W and `cartesian`
 * is B·W·B⁻¹. Orthorhombic, tetragonal, cubic: x ∥ a, y ∥ b, z ∥ c. Hexagonal axes: x ∥ a, z ∥ c,
 * b at 120° from a. Rhombohedral axes: the obverse basis a_R, b_R, c_R in the hexagonal frame. A
 * direction [uvw] is B·u in this frame, the normal of a face (hkl) B⁻ᵀ·h. For the monoclinic and
 * triclinic families, whose cell angles a point group does not fix, it is the basis symcrys takes
 * for its operations, a, b, c along x, y, z; the basis of a real cell is `latticeFromParameters`.
 *
 * @remarks The matrix is frozen.
 */
export function latticeBasis(key: MagneticPointGroupKey, options?: SettingOptions): Mat3 {
  checkOptions(options, SETTING_KEYS, 'latticeBasis');
  const setting = classSettingOf(key, options);
  return deepFreeze(settingBasis(setting.key, setting.index).map((row) => [...row]) as unknown as Mat3);
}

/**
 * A direction input as a Cartesian vector in the frame of the setting: a Cartesian vector as it is,
 * a lattice direction as B·u, a face as its normal B⁻ᵀ·h (not normalised).
 */
export function cartesianDirection(
  key: MagneticPointGroupKey,
  input: DirectionInput,
  options: SettingOptions | undefined,
  name: string,
): Vec3 {
  const field = directionField(input, name);
  if (field === 'cartesian') {
    const v = (input as CartesianDirection).cartesian;
    checkNumbers(v, 3, 'A direction');
    return v;
  }
  const setting = classSettingOf(key, options);
  const b = settingBasis(setting.key, setting.index);
  if (field === 'uvw') return apply(b, indicesOf((input as DirectionIndices).uvw, 'uvw') as unknown as Vec3);
  return apply(transpose(inverse(b)), indicesOf((input as FaceIndices).hkl, 'hkl') as unknown as Vec3);
}
