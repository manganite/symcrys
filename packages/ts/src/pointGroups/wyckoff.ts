/**
 * Wyckoff positions of the crystal classes for directions (face normals): ITA's letters,
 * multiplicities, oriented site-symmetry symbols, coordinates and faces, computed in
 * wyckoffRows.ts, and the Wyckoff position of any direction (docs/conventions.md, "Site symmetry
 * and Wyckoff positions").
 */

import { checkOptions, pick, SETTING_KEYS, shown, TOLERANCE_KEYS } from '../checks.js';
import { apply, inverse, multiply, normalize, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { substituteMillerIndices } from '../indices.js';
import { settingBasis, classSettingData } from './classData.js';
import {
  settingIndexOf,
  isMagneticPointGroupKey,
  isPointGroupKey,
  operations,
  type MagneticPointGroupKey,
  type PointGroupKey,
  type SettingOptions,
} from './pointGroups.js';
import { siteSymmetryOfGroup, siteTolerance, type SiteSymmetry } from '../siteSymmetry.js';
import { EPSILON, ROUNDING_EPSILON, type ToleranceOptions } from '../tolerances.js';
import {
  cartesianDirection,
  type CartesianDirection,
  type DirectionIndices,
  type DirectionInput,
  type FaceIndices,
} from './directions.js';
import { computedWyckoffRows } from './wyckoffRows.js';

/** A face (hkl): three Miller indices in the conventional basis (for hexagonal axes without i = −(h + k)). */
export type Hkl = readonly [number, number, number];

/** One Wyckoff position of a point group for directions. */
export interface WyckoffPosition {
  /** ITA's Wyckoff letter. */
  readonly letter: string;
  /** Number of equivalent directions (faces of the form). */
  readonly multiplicity: number;
  /** Oriented site-symmetry symbol in ITA's notation, e.g. `..m`, `4m.m`, `1`. */
  readonly siteSymmetry: string;
  /**
   * ITA's coordinate triplets of the position, the full list in ITA's order, the first being the
   * representative point, e.g. `['x,x,z', '-x,-x,z', …]` (a leading `-` is an overbar); one per
   * equivalent direction, as in `symcrys/plane`.
   */
  readonly coordinates: readonly string[];
  /**
   * ITA's representative face, components separated by commas, e.g. `h,h,l`, or `h,h,-2h,l`
   * (Bravais–Miller indices) for hexagonal axes. The function `millerIndices` substitutes values of
   * h, k, l and gives a face with numbers, `faceNormal` its normal in a cell.
   */
  readonly millerIndices: string;
  /**
   * Indices into `operations` (same setting) of the site symmetry of the position: of the operations
   * that fix its representative face (`millerIndices`) for values of h, k, l that keep the face in
   * the position.
   */
  readonly siteSymmetryOperations: readonly number[];
}

/**
 * Convention data: the values substituted into ITA's Miller indices for a face with numbers, with
 * which symcrys finds the site symmetry of each printed face (`siteSymmetryOperations`). ITA prints
 * the faces with letters; any values that keep every printed face in its position, on no further
 * symmetry element, give the same results, so the values are a choice and cannot be derived from
 * print. The tests check that they keep every face in its position.
 */
export const REPRESENTATIVE_VALUES: Readonly<Record<'h' | 'k' | 'l', number>> = Object.freeze({ h: 3, k: 2, l: 1 });

/**
 * Convention data, as `REPRESENTATIVE_VALUES`: the values for rhombohedral axes, h = 5, k = 2,
 * l = 1. With 3, 2, 1 the face (h,k,l) would lie on the limiting form (h,k,2k-h) that ITA prints
 * there (Table 3.2.3.2, 32, 3m and -3m with rhombohedral axes, pp. 755–759): (321) is (116) in
 * hexagonal axes. (521), (318) in hexagonal axes, lies on no printed limiting form, and every printed
 * face with these values is in lowest terms ((5,2,-7), (5,2,-1), (5,5,1)); h = 4 would give (4,2,-6)
 * and (4,2,0).
 */
export const RHOMBOHEDRAL_VALUES: Readonly<Record<'h' | 'k' | 'l', number>> = Object.freeze({ h: 5, k: 2, l: 1 });

/** The values of h, k, l for the representative faces of a setting. */
export function representativeValues(key: PointGroupKey, setting: number): Readonly<Record<'h' | 'k' | 'l', number>> {
  return classSettingData(key, setting).axes === 'rhombohedral' ? RHOMBOHEDRAL_VALUES : REPRESENTATIVE_VALUES;
}

/** Printed Miller indices (three, or four for hexagonal axes) as three numbers, with the given values of h, k, l. */
export function numericHkl(miller: string, values = REPRESENTATIVE_VALUES): Hkl {
  return substituteMillerIndices(miller, values, (m) => new Error(m));
}

/** The face normal of (hkl) as a Cartesian unit vector: h a* + k b* + l c* with the reciprocal basis B⁻ᵀ. */
export function normal(basis: Mat3, hkl: Hkl): Vec3 {
  return normalize(apply(transpose(inverse(basis)), hkl));
}

/**
 * The lattice basis in which the Cartesian normals of the representatives are computed, that of the
 * setting (classData.ts, `settingBasis`): monoclinic and triclinic a, b, c along x, y, z; rhombohedral
 * axes in the hexagonal cell of `latticeBasis` (docs/conventions.md, "Site symmetry and Wyckoff
 * positions").
 */
export function faceBasis(key: PointGroupKey, setting: number): Mat3 {
  return settingBasis(key, setting);
}

/**
 * Convention data, as `REPRESENTATIVE_VALUES`: h, k, l of a representative face under the printed
 * condition |h| < |l| (cubic forms (hhl)), which 3, 2, 1 do not meet.
 */
export const SMALL_H: Readonly<Record<'h' | 'k' | 'l', number>> = Object.freeze({ h: 1, k: 2, l: 3 });

/**
 * A face of a position or form with numbers, internal (the API gives the printed indices
 * only): h, k, l = 3, 2, 1 (rhombohedral axes: 5, 2, 1; 1, 2, 3 under the condition |h| < |l|), and
 * its normal in the basis of the setting (`faceBasis`; monoclinic and triclinic a, b, c along x, y,
 * z, which gives the correct site symmetry but not the pole of a real cell).
 */
export function representativeFace(
  key: PointGroupKey,
  setting: number,
  miller: string,
  condition?: string,
): { readonly hkl: Hkl; readonly cartesian: Vec3 } {
  const hkl = numericHkl(miller, condition === '|h|<|l|' ? SMALL_H : representativeValues(key, setting));
  return { hkl, cartesian: normal(faceBasis(key, setting), hkl) };
}

const cache = new Map<string, readonly WyckoffPosition[]>();

/**
 * The setting index for a table that exists for the crystal classes only (`what`: 'Wyckoff
 * positions', 'Crystal forms'); throws a RangeError for a magnetic point group with time reversal.
 */
export function tableSetting(key: PointGroupKey, options?: SettingOptions, what = 'Wyckoff positions'): number {
  if (isMagneticPointGroupKey(key) && !isPointGroupKey(key)) {
    throw new RangeError(`${what} are given for the 32 crystal classes only; ${shown(key)} is a magnetic point group`);
  }
  const index = settingIndexOf(key, options);
  operations(key, pick(options, SETTING_KEYS)); // validates the setting index
  return index;
}

/**
 * The Wyckoff positions of a point group for directions, in ITA's order (general position
 * first), for the 32 crystal classes only (throws a RangeError for a magnetic point group with
 * time reversal). The point at the origin (letter o) is not a direction and is left out. The
 * settings ITA does not print (`mm2` settings 2 and 3, monoclinic unique axis a) are computed in
 * the same way, each position with the letter of the position of setting 1 it comes from.
 */
export function wyckoffPositions(key: PointGroupKey, options?: SettingOptions): readonly WyckoffPosition[] {
  checkOptions(options, SETTING_KEYS, 'wyckoffPositions');
  const setting = tableSetting(key, options);
  const cacheKey = `${key}#${setting}`;
  let result = cache.get(cacheKey);
  if (!result) {
    const ops = operations(key, { setting });
    result = Object.freeze(
      computedWyckoffRows(key, setting).map(([letter, multiplicity, site, coordinates, millerIndices]) => {
        const stab = siteSymmetryOfGroup(ops, representativeFace(key, setting, millerIndices).cartesian, EPSILON);
        if (stab.multiplicity !== multiplicity) {
          throw new Error(
            `Point group ${key}, setting ${setting}, position ${letter}: multiplicity differs from the site symmetry of its face`,
          );
        }
        return Object.freeze({
          letter,
          multiplicity,
          siteSymmetry: site,
          coordinates: Object.freeze([...coordinates]),
          millerIndices,
          siteSymmetryOperations: stab.operations,
        });
      }),
    );
    cache.set(cacheKey, result);
  }
  return result;
}

/**
 * The site symmetry of a face (field `hkl`), a lattice direction (`uvw`) or a Cartesian
 * direction (`cartesian`) under a point group in a setting: `siteSymmetryOf` applied to
 * `operations(key, options)`, so the indices refer to those operations; `direction` of the result is
 * the Cartesian unit vector (for a face its normal, `latticeBasis`). Time reversal is ignored.
 * Throws a RangeError unless exactly one of the three is given, for indices that are not three
 * integers not all zero, and as `siteSymmetryOf` does.
 *
 * @remarks A bare array, which could be either kind of vector, is a RangeError.
 */
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: FaceIndices,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
/** The site symmetry of a lattice direction [uvw]; see the first signature. */
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: DirectionIndices,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
/** The site symmetry of a Cartesian direction; see the first signature. */
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: CartesianDirection,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
/** The site symmetry of a face, a lattice direction or a Cartesian direction; see the first signature. */
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry;
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry {
  checkOptions(options, [...SETTING_KEYS, ...TOLERANCE_KEYS], 'siteSymmetry');
  const setting = pick(options, SETTING_KEYS);
  const v = cartesianDirection(key, direction, setting, 'siteSymmetry');
  return siteSymmetryOfGroup(operations(key, setting), v, siteTolerance(options));
}

const sortedKey = (list: readonly number[]): string => [...list].sort((a, b) => a - b).join(',');

/**
 * The Wyckoff position of a face (field `hkl`), a lattice direction (`uvw`) or a Cartesian
 * direction (`cartesian`) in a crystal class: the position whose first face has a site symmetry conjugate
 * to that of the direction (ITA's definition). `tolerance` as for `siteSymmetryOf`. Throws a
 * RangeError as `siteSymmetry` does.
 */
export function wyckoffPosition(
  key: PointGroupKey,
  direction: DirectionInput,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition {
  checkOptions(options, [...SETTING_KEYS, ...TOLERANCE_KEYS], 'wyckoffPosition');
  const tolerance = siteTolerance(options);
  const setting = tableSetting(key, options);
  const ops = operations(key, { setting });
  const rows = wyckoffPositions(key, { setting });
  const site = siteSymmetryOfGroup(ops, cartesianDirection(key, direction, { setting }, 'wyckoffPosition'), tolerance);
  // The position whose site symmetry is conjugate to that of the direction, g·H·g⁻¹ = T, exactly in
  // the operations of the key (a site symmetry is not taken again at a tolerance: setting a direction
  // onto an element can bring it within the tolerance of a more special one).
  const index = (m: Mat3): number =>
    ops.findIndex((op) =>
      op.cartesian.every((row, i) => row.every((v, j) => Math.abs(v - m[i][j]) < ROUNDING_EPSILON)),
    );
  const candidates = rows.filter((r) => r.siteSymmetryOperations.length === site.operations.length);
  for (const g of ops) {
    const gInverse = transpose(g.cartesian);
    const k = sortedKey(site.operations.map((h) => index(multiply(multiply(g.cartesian, ops[h].cartesian), gInverse))));
    const row = candidates.find((r) => sortedKey(r.siteSymmetryOperations) === k);
    if (row) return row;
  }
  throw new RangeError(
    `Point group ${key}, setting ${setting}: no Wyckoff position for ${shown(direction)} (tolerance too large?)`,
  );
}
