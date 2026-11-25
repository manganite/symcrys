/**
 * Crystal systems and families, and how the conventional lattice basis sits in the Cartesian frame
 * of symcrys (docs/conventions.md, "Cartesian frame").
 */

import { shown } from './checks.js';
import { IDENTITY, type Mat3 } from './linalg.js';

/** One of the seven crystal systems. */
export type CrystalSystem =
  'triclinic' | 'monoclinic' | 'orthorhombic' | 'tetragonal' | 'trigonal' | 'hexagonal' | 'cubic';

/** One of the six crystal families: the trigonal and the hexagonal system form the hexagonal family. */
export type CrystalFamily = 'triclinic' | 'monoclinic' | 'orthorhombic' | 'tetragonal' | 'hexagonal' | 'cubic';

const SYSTEMS: readonly string[] = [
  'triclinic',
  'monoclinic',
  'orthorhombic',
  'tetragonal',
  'trigonal',
  'hexagonal',
  'cubic',
];

/**
 * The crystal family of a crystal system: trigonal and hexagonal form the hexagonal family. Throws
 * a RangeError for anything that is not one of the seven crystal systems.
 */
export function crystalFamily(system: CrystalSystem): CrystalFamily {
  if (!SYSTEMS.includes(system)) throw new RangeError(`Unknown crystal system: ${shown(system)}`);
  return system === 'trigonal' ? 'hexagonal' : system;
}

/**
 * One of the seven lattice systems: the lattices whose point symmetry is the same holohedry. The
 * hexagonal family has two, `'hexagonal'` (hP) and `'rhombohedral'` (hR).
 *
 * @remarks Source: ITA (2016), Table 1.3.4.1, p. 39.
 */
export type LatticeSystem =
  'triclinic' | 'monoclinic' | 'orthorhombic' | 'tetragonal' | 'hexagonal' | 'rhombohedral' | 'cubic';

/**
 * The lattice systems on which the point groups of a crystal system act (ITA § 1.3.4.4.2, p. 39):
 * both of the hexagonal family for the trigonal system, which belongs to either depending on the
 * basis, otherwise the one of the same name.
 */
export function latticeSystemsOfSystem(system: CrystalSystem): readonly LatticeSystem[] {
  if (!SYSTEMS.includes(system)) throw new RangeError(`Unknown crystal system: ${shown(system)}`);
  if (system === 'trigonal') return TRIGONAL;
  return LATTICE_SYSTEM_OF[system];
}

const TRIGONAL: readonly LatticeSystem[] = Object.freeze(['hexagonal', 'rhombohedral']);
const LATTICE_SYSTEM_OF = Object.freeze(
  Object.fromEntries(
    ['triclinic', 'monoclinic', 'orthorhombic', 'tetragonal', 'hexagonal', 'cubic'].map((s) => [s, Object.freeze([s])]),
  ),
) as Readonly<Record<Exclude<CrystalSystem, 'trigonal'>, readonly LatticeSystem[]>>;

/** The families whose cell angles are fixed, so that their lattice basis is fixed up to edge lengths. */
export type FixedAngleFamily = 'orthorhombic' | 'tetragonal' | 'hexagonal' | 'cubic';

const S3_2 = Math.sqrt(3) / 2;

/** A deeply frozen matrix: the apps run dist/ as plain JavaScript, where `readonly` does not hold. */
const frozen = (m: [number, number, number][]): Mat3 =>
  Object.freeze(m.map((row) => Object.freeze(row))) as unknown as Mat3;

/** The basis of the families with orthogonal axes of one length: the (frozen) identity of linalg.ts. */
const ORTHONORMAL = IDENTITY;

const HEXAGONAL = frozen([
  [1, -0.5, 0],
  [0, S3_2, 0],
  [0, 0, 1],
]);

/**
 * The conventional basis vectors a, b, c as the **columns** of a Cartesian matrix, with unit edge
 * lengths. Hexagonal family (hexagonal axes): x ∥ a, z ∥ c, y = z × x, so b points at 120° from a.
 * Orthorhombic, tetragonal, cubic: x ∥ a, y ∥ b, z ∥ c.
 *
 * The edge lengths are set to 1 because the symmetry directions of these families, and so the
 * point operations, do not depend on them. For a direction [uvw] that is not a symmetry direction,
 * scale the columns by the real edge lengths first.
 *
 * @remarks The matrix is frozen and shared between calls.
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
