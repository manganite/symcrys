/**
 * Orbits of faces and directions (docs/conventions.md, "Lattice basis and orbits"). Shared by both
 * entry points.
 */

import { checkNumbers, checkOptions, SETTING_KEYS, shown, TOLERANCE_KEYS } from '../checks.js';
import { apply, inverse, type Mat3, type Vec3 } from '../linalg.js';
import { checkCartesianOperations, type DirectionOperation } from '../operations.js';
import { siteTolerance } from '../siteSymmetry.js';
import { checkGroup } from '../closure.js';
import { EPSILON, TOLERANCE_BOUND } from '../tolerances.js';
import type { ToleranceOptions } from '../tolerances.js';
import type { Uvw } from '../symmetryDirections.js';
import {
  integer,
  operations as groupOperations,
  type MagneticPointGroupKey,
  type SettingOptions,
} from './pointGroups.js';
import type { Hkl } from './wyckoff.js';
import { directionField, indicesOf, type DirectionIndices, type FaceIndices } from './directions.js';

export type { DirectionIndices, FaceIndices } from './directions.js';

const deepFreeze = (m: Mat3): Mat3 => Object.freeze(m.map((row) => Object.freeze([...row]))) as unknown as Mat3;

/** The inverse of an integer matrix of determinant ±1, exactly (the adjugate). */
function integerInverse(w: Mat3): Mat3 {
  return integer(inverse(w), 'The inverse of a lattice operation');
}

/** Indices of a face or a lattice direction, checked: three integers, not all zero. */
/** One face of the orbit of a face: its Miller indices and the operations that map the given face onto it. */
export interface FaceOrbitEntry {
  /** Miller indices (hkl) of the face, in the conventional basis (hexagonal axes: without i). */
  readonly hkl: Hkl;
  /** Indices into `operations` (same setting) of the operations that map the given face onto this one, ascending. */
  readonly operations: readonly number[];
}

/** One direction of the orbit of a lattice direction: its indices and the operations that map the given direction onto it. */
export interface DirectionOrbitEntry {
  /** The lattice direction [uvw] in the conventional basis. */
  readonly uvw: Uvw;
  /** Indices into `operations` (same setting) of the operations that map the given direction onto this one, ascending. */
  readonly operations: readonly number[];
}

/**
 * The orbit of a face (hkl) or of a lattice direction [uvw] under a point group, exactly, in the
 * lattice basis: the distinct faces (directions), in the order in which the operations reach them
 * (so the given face first), each with the indices of the operations that map
 * the given one onto it. A face transforms with the inverse transpose of a lattice operation,
 * h' = W⁻ᵀ·h, a direction with the operation itself, u' = W·u. The number of entries is the
 * multiplicity of the face (direction), and the operations of the first entry, if it is the given
 * one, are its site symmetry. Time reversal plays no part. Throws a RangeError unless exactly one of
 * `hkl` and `uvw` is given, as three integers not all zero (hexagonal axes: three indices, without
 * i).
 */
export function orbit(
  key: MagneticPointGroupKey,
  indices: FaceIndices,
  options?: SettingOptions,
): readonly FaceOrbitEntry[];
export function orbit(
  key: MagneticPointGroupKey,
  indices: DirectionIndices,
  options?: SettingOptions,
): readonly DirectionOrbitEntry[];
export function orbit(
  key: MagneticPointGroupKey,
  indices: FaceIndices | DirectionIndices,
  options?: SettingOptions,
): readonly FaceOrbitEntry[] | readonly DirectionOrbitEntry[];
export function orbit(
  key: MagneticPointGroupKey,
  indices: FaceIndices | DirectionIndices,
  options?: SettingOptions,
): readonly FaceOrbitEntry[] | readonly DirectionOrbitEntry[] {
  checkOptions(options, SETTING_KEYS, 'orbit');
  if (typeof indices === 'object' && indices !== null && (indices as { cartesian?: unknown }).cartesian !== undefined) {
    throw new RangeError(
      'orbit gives faces or lattice directions, exactly; for a Cartesian vector use orbitOf with the operations of the key',
    );
  }
  const field = directionField(indices, 'orbit', ['hkl', 'uvw'] as const);
  const hasHkl = field === 'hkl';
  const given = indices as { readonly hkl?: unknown; readonly uvw?: unknown };
  const v = indicesOf(hasHkl ? given.hkl : given.uvw, field);
  const ws = groupOperations(key, options).map((op) => (hasHkl ? integerInverseTranspose(op.matrix) : op.matrix));
  const images: { key: string; value: [number, number, number]; operations: number[] }[] = [];
  ws.forEach((w, i) => {
    const image = apply(w, v as unknown as Vec3).map((x) => x + 0) as [number, number, number];
    const k = image.join(',');
    const entry = images.find((e) => e.key === k);
    if (entry) entry.operations.push(i);
    else images.push({ key: k, value: image, operations: [i] });
  });
  return Object.freeze(
    images.map((e) => Object.freeze({ [field]: Object.freeze(e.value), operations: Object.freeze(e.operations) })),
  ) as unknown as readonly FaceOrbitEntry[] | readonly DirectionOrbitEntry[];
}

const inverseTransposeCache = new WeakMap<Mat3, Mat3>();

function integerInverseTranspose(w: Mat3): Mat3 {
  let r = inverseTransposeCache.get(w);
  if (!r) {
    const inv = integerInverse(w);
    r = deepFreeze([0, 1, 2].map((i) => [0, 1, 2].map((j) => inv[j][i])) as unknown as Mat3);
    inverseTransposeCache.set(w, r);
  }
  return r;
}

/** One pole of the orbit of a direction under a list of operations. */
export interface OrbitPole {
  /** The image of the given direction as a Cartesian unit vector (the first operation's image where several coincide). */
  readonly direction: Vec3;
  /** Indices into the given operations of those that map the direction here, ascending. */
  readonly operations: readonly number[];
}

/**
 * The orbit of a direction (any non-zero vector, Cartesian, e.g. a face normal) under a list of
 * operations, for instance those of a distorted crystal: the images of its unit vector under each
 * operation, coinciding images merged (closer than `tolerance`, default `EPSILON`, as for
 * `siteSymmetryOf`), in the order in which the operations reach them, each with the indices of the
 * operations that map the direction there. The list is a point group given as all its operations;
 * an empty list is the group 1, whose orbit is the direction itself. Time reversal is ignored.
 * Throws a RangeError for a zero vector, for an operation without an orthogonal Cartesian matrix
 * (`cartesian`; within `tolerance`, at least `EPSILON`) and for a list that is not closed under
 * products (only generators, for instance; the error names the missing product).
 */
export function orbitOf(
  operations: readonly DirectionOperation[],
  direction: Vec3,
  options?: ToleranceOptions,
): readonly OrbitPole[] {
  checkOptions(options, TOLERANCE_KEYS, 'orbitOf');
  const tolerance = siteTolerance(options);
  // Operations are checked in their own metric, at most with the bound for operations.
  const within = Math.min(tolerance, TOLERANCE_BOUND.operations);
  checkCartesianOperations(operations, within);
  checkNumbers(direction, 3, 'A direction');
  const n = Math.hypot(direction[0], direction[1], direction[2]);
  if (!(n > 0) || !Number.isFinite(n)) throw new RangeError(`Not a direction: ${shown(direction)}`);
  const u: Vec3 = [direction[0] / n, direction[1] / n, direction[2] / n];
  if (operations.length === 0) {
    return Object.freeze([
      Object.freeze({ direction: Object.freeze(u) as unknown as Vec3, operations: Object.freeze([]) }),
    ]);
  }
  checkGroup(operations, Math.max(within, EPSILON), 'orbitOf');
  const poles: { direction: Vec3; operations: number[] }[] = [];
  operations.forEach((op, i) => {
    const w = apply(op.cartesian, u);
    const pole = poles.find(
      (p) => Math.hypot(p.direction[0] - w[0], p.direction[1] - w[1], p.direction[2] - w[2]) < tolerance,
    );
    if (pole) pole.operations.push(i);
    else poles.push({ direction: w, operations: [i] });
  });
  return Object.freeze(
    poles.map((p) =>
      Object.freeze({
        direction: Object.freeze(p.direction) as unknown as Vec3,
        operations: Object.freeze(p.operations),
      }),
    ),
  );
}
