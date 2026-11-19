/**
 * Crystal systems and families, and how the conventional lattice basis sits in the Cartesian frame
 * of symcrys (docs/conventions.md, "Cartesian frame").
 */

import type { Mat3 } from './linalg.js';

export type CrystalSystem =
  'triclinic' | 'monoclinic' | 'orthorhombic' | 'tetragonal' | 'trigonal' | 'hexagonal' | 'cubic';

export type CrystalFamily = 'triclinic' | 'monoclinic' | 'orthorhombic' | 'tetragonal' | 'hexagonal' | 'cubic';

/** The crystal family of a crystal system: trigonal and hexagonal form the hexagonal family. */
export function crystalFamily(system: CrystalSystem): CrystalFamily {
  return system === 'trigonal' ? 'hexagonal' : system;
}

/** The families whose cell angles are fixed, so that their lattice basis is fixed up to edge lengths. */
export type FixedAngleFamily = 'orthorhombic' | 'tetragonal' | 'hexagonal' | 'cubic';

const S3_2 = Math.sqrt(3) / 2;

/** A deeply frozen matrix: the apps run dist/ as plain JavaScript, where `readonly` does not hold. */
const frozen = (m: [number, number, number][]): Mat3 =>
  Object.freeze(m.map((row) => Object.freeze(row))) as unknown as Mat3;

const ORTHONORMAL = frozen([
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
]);

const HEXAGONAL = frozen([
  [1, -0.5, 0],
  [0, S3_2, 0],
  [0, 0, 1],
]);

/**
 * The conventional basis vectors a, b, c as the **columns** of a Cartesian matrix, with unit edge
 * lengths (a frozen array, shared between calls). Hexagonal family (hexagonal axes): x ∥ a, z ∥ c, y = z × x, so b points at 120° from a.
 * Orthorhombic, tetragonal, cubic: x ∥ a, y ∥ b, z ∥ c.
 *
 * The edge lengths are set to 1 because the symmetry directions of these families, and so the
 * point operations, do not depend on them. For a direction [uvw] that is not a symmetry direction,
 * scale the columns by the real edge lengths first.
 */
export function latticeBasis(family: FixedAngleFamily): Mat3 {
  switch (family) {
    case 'hexagonal':
      return HEXAGONAL;
    case 'orthorhombic':
    case 'tetragonal':
    case 'cubic':
      return ORTHONORMAL;
    default:
      throw new RangeError(`latticeBasis: no fixed basis for the crystal family ${String(family)}`);
  }
}
