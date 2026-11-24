/**
 * Wyckoff positions of the crystal classes for directions (face normals), as ITA gives them:
 * ITA's letters, multiplicities, oriented site-symmetry symbols, coordinates and faces as printed, and the
 * Wyckoff position of any direction (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { checkOptions, pick, SETTING_KEYS, shown, TOLERANCE_KEYS } from '../checks.js';
import { apply, inverse, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { crystalFamily } from '../lattice.js';
import { substituteMillerIndices } from '../indices.js';
import { itcBasis, itcClass, itcSetting as itcClassSetting } from './itcData.js';
import {
  settingIndexOf,
  isMagneticPointGroupKey,
  isPointGroupKey,
  operations,
  settings,
  type MagneticPointGroupKey,
  type PointGroupKey,
  type SettingOptions,
} from './pointGroups.js';
import { siteSymmetryOf, siteTolerance, type SiteSymmetry } from '../siteSymmetry.js';
import type { ToleranceOptions } from '../tolerances.js';
import { ITA_WYCKOFF, type WyckoffRow } from './wyckoffData.js';

/** A face (hkl): three Miller indices in the conventional basis (for hexagonal axes without i = −(h + k)). */
export type Hkl = readonly [number, number, number];

/** One Wyckoff position of a point group for directions. */
export interface WyckoffPosition {
  /** ITA's Wyckoff letter. */
  readonly letter: string;
  /** Number of equivalent directions (faces of the form). */
  readonly multiplicity: number;
  /** Oriented site-symmetry symbol as ITA prints it, e.g. `..m`, `4m.m`, `1`. */
  readonly siteSymmetry: string;
  /**
   * ITA's coordinate triplets of the position as printed, in printed order, the first being the
   * representative point, e.g. `['x,x,z', '-x,-x,z', …]` (a leading `-` is an overbar); one per
   * equivalent direction, as in `symcrys/plane`.
   */
  readonly coordinates: readonly string[];
  /**
   * ITA's representative face as printed, components separated by commas, e.g. `h,h,l`, or
   * `h,h,-2h,l` (Bravais–Miller indices) for hexagonal axes. `millerIndices(printed, { h, k, l })` gives
   * a face with numbers, `faceNormal(basis, hkl)` its normal in a cell.
   */
  readonly millerIndices: string;
  /**
   * Indices into `operations` (same setting) of the site symmetry of the position: of the operations
   * that fix its first printed face for values of h, k, l that keep the face in the position.
   */
  readonly siteSymmetryOperations: readonly number[];
}

/** The values substituted into ITA's Miller indices for the numeric representative. */
export const REPRESENTATIVE_VALUES: Readonly<Record<'h' | 'k' | 'l', number>> = { h: 3, k: 2, l: 1 };

/**
 * The values for rhombohedral axes: h = 5, k = 2, l = 1. With 3, 2, 1 the face (h,k,l) would lie on
 * the limiting form (h,k,2k-h) that ITA prints there (Table 3.2.3.2, 32, 3m and -3m with rhombohedral
 * axes, pp. 755–759): (321) is (116) in hexagonal axes. (521), (318) in hexagonal axes, lies on no
 * printed limiting form, and every printed face with these values is in lowest terms ((5,2,-7),
 * (5,2,-1), (5,5,1)); h = 4 would give (4,2,-6) and (4,2,0).
 */
export const RHOMBOHEDRAL_VALUES: Readonly<Record<'h' | 'k' | 'l', number>> = { h: 5, k: 2, l: 1 };

/** The values of h, k, l for the representative faces of a setting. */
export function representativeValues(key: PointGroupKey, setting: number): Readonly<Record<'h' | 'k' | 'l', number>> {
  return itcClassSetting(key, setting).axes === 'rhombohedral' ? RHOMBOHEDRAL_VALUES : REPRESENTATIVE_VALUES;
}

/** Printed Miller indices (three, or four for hexagonal axes) as three numbers, with the given values of h, k, l. */
export function numericHkl(miller: string, values = REPRESENTATIVE_VALUES): Hkl {
  return substituteMillerIndices(miller, values, (m) => new Error(m));
}

export const IDENTITY: Mat3 = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

/** The face normal of (hkl) as a Cartesian unit vector: h a* + k b* + l c* with the reciprocal basis B⁻ᵀ. */
export function normal(basis: Mat3, hkl: Hkl): Vec3 {
  const v = apply(transpose(inverse(basis)), hkl);
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
}

const XYZ = 'xyz';
const HKL = 'hkl';

/**
 * A printed pattern carried by a signed permutation r of the axes (new axis i = r[i][j] × old axis j).
 * Only for components that are `0`, a number, or a plain letter with an optional `-` (as in `mm2`); a
 * letter is renamed after its new position. A factor such as `2x` throws.
 */
export function permutePattern(pattern: string, r: Mat3, letters: string): string {
  const old = pattern.split(',');
  if (old.length !== 3) throw new Error(`Cannot carry ${pattern} into another setting`);
  return [0, 1, 2]
    .map((i) => {
      const j = [0, 1, 2].find((k) => Math.abs(r[i][k]) === 1);
      if (j === undefined) throw new Error('Not a signed permutation');
      const c = old[j];
      if (c === '0') return '0';
      const negative = c.startsWith('-') !== r[i][j] < 0;
      const body = c.replace(/^-/, '');
      if (!/^(\d+|[a-z])$/.test(body)) throw new Error(`Cannot carry ${pattern} into another setting`);
      const renamed = /^\d+$/.test(body) ? body : letters[i];
      return (negative ? '-' : '') + renamed;
    })
    .join(',');
}

/** An oriented site-symmetry symbol with three positions, carried by r: new position i is old position j. */
function permuteSymbol(symbolText: string, r: Mat3): string {
  if (symbolText === '1') return symbolText;
  if (symbolText.length !== 3) throw new Error(`Cannot carry ${symbolText} into another setting`);
  return [0, 1, 2].map((i) => symbolText[[0, 1, 2].find((k) => Math.abs(r[i][k]) === 1) ?? -1]).join('');
}

/**
 * The permutation r that carries setting 1 of a class into `setting` (new axis i = r[i][j] × old
 * axis j), for the settings ITA does not print (`mm2` settings 2 and 3, monoclinic unique axis a):
 * the transpose of the change
 * of basis P of the ITC class data ((a′, b′, c′) = (a, b, c)·P, itcData.ts). Coordinates (P⁻¹·x)
 * and Miller indices (h·P) are carried by the same r only because P is a signed permutation
 * (P⁻¹ = Pᵀ); throws for a setting that is not carried from setting 1 by one.
 */
export function permutationFromSetting1(key: PointGroupKey, setting: number): Mat3 {
  const from = itcClassSetting(key, setting).from;
  if (from?.index !== 1) throw new Error(`Point group ${key}, setting ${setting}: not carried from setting 1`);
  const p = from.basis;
  const signedPermutation = [0, 1, 2].every(
    (i) =>
      p[i].filter((v) => v !== 0).length === 1 &&
      p[i].every((v) => v === 0 || Math.abs(v) === 1) &&
      p.filter((row) => row[i] !== 0).length === 1,
  );
  if (!signedPermutation)
    throw new Error(`Point group ${key}, setting ${setting}: not a signed permutation of setting 1`);
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => p[j][i])) as unknown as Mat3;
}

/**
 * The entry of a table printed per setting (Wyckoff positions, face forms) for a setting of a class:
 * the one with the ITC short symbol (and unique axis or axes) of the setting, or undefined if ITA does not
 * print the setting.
 */
export function printedEntry<
  E extends { readonly symbol: string; readonly uniqueAxis?: 'b' | 'c'; readonly axes?: 'rhombohedral' },
>(table: readonly E[], key: PointGroupKey, setting: number): E | undefined {
  const s = settings(key)[setting - 1];
  return table.find(
    (e) =>
      e.symbol === s.symbol &&
      (e.uniqueAxis === undefined || e.uniqueAxis === s.uniqueAxis) &&
      (e.axes === 'rhombohedral') === (s.axes === 'rhombohedral'),
  );
}

/** The printed rows of a setting; for a setting ITA does not print, those of setting 1 carried into its frame. */
function printedRows(key: PointGroupKey, setting: number): readonly WyckoffRow[] {
  const entry = printedEntry(ITA_WYCKOFF, key, setting);
  if (entry) return entry.rows;
  if (setting === 1) throw new Error(`Point group ${key}: no printed Wyckoff positions for setting 1`);
  const r = permutationFromSetting1(key, setting);
  // A monoclinic site symmetry (`2`, `m`, `2/m`) names the element on the unique axis, not a position.
  const oriented = crystalFamily(itcClass(key).crystalSystem) !== 'monoclinic';
  return printedRows(key, 1).map(([letter, mult, site, coords, miller]) => [
    letter,
    mult,
    oriented ? permuteSymbol(site, r) : site,
    coords.map((c) => permutePattern(c, r, XYZ)),
    miller === '' ? '' : permutePattern(miller, r, HKL),
  ]);
}

/**
 * The lattice basis in which the Cartesian normals of the representatives are computed, that of the
 * setting (itcData.ts, `itcBasis`): monoclinic and triclinic a, b, c along x, y, z; rhombohedral
 * axes in the hexagonal cell of `latticeBasis` (docs/conventions.md, "Site symmetry and Wyckoff
 * positions").
 */
export function faceBasis(key: PointGroupKey, setting: number): Mat3 {
  return itcBasis(key, setting);
}

/** h, k, l of a representative face under the printed condition |h| < |l| (cubic forms (hhl)). */
export const SMALL_H: Readonly<Record<'h' | 'k' | 'l', number>> = Object.freeze({ h: 1, k: 2, l: 3 });

/**
 * A face of a position or form with numbers, internal (#137 G3: the API gives the printed indices
 * only): h, k, l = 3, 2, 1 (rhombohedral axes: 5, 2, 1; 1, 2, 3 under the condition |h| < |l|), and
 * its normal in the basis of the setting (`faceBasis`; monoclinic and triclinic a, b, c along x, y,
 * z, which gives the correct site symmetry but not the pole of a real cell, #137 G4).
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
 * The Wyckoff positions of a point group for directions, in ITA's printed order (general position
 * first), for the 32 crystal classes only (throws a RangeError for a magnetic point group with
 * time reversal). The point at the origin
 * (letter o) is not a direction and is left out. For the settings ITA does not print (`mm2` settings 2 and 3, monoclinic unique axis a), the positions
 * of setting 1 carried into their frame.
 */
export function wyckoffPositions(key: PointGroupKey, options?: SettingOptions): readonly WyckoffPosition[] {
  checkOptions(options, SETTING_KEYS, 'wyckoffPositions');
  const setting = tableSetting(key, options);
  const cacheKey = `${key}#${setting}`;
  let result = cache.get(cacheKey);
  if (!result) {
    const ops = operations(key, { setting });
    result = Object.freeze(
      printedRows(key, setting)
        .filter(([letter]) => letter !== 'o')
        .map(([letter, multiplicity, site, coordinates, millerIndices]) => {
          const stab = siteSymmetryOf(ops, representativeFace(key, setting, millerIndices).cartesian);
          if (stab.multiplicity !== multiplicity) {
            throw new Error(
              `Point group ${key}, setting ${setting}, position ${letter}: multiplicity differs from print`,
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
 * The site symmetry of a direction (any non-zero Cartesian vector) under a point group in a
 * setting: `siteSymmetryOf` applied to `operations(key, options)`, so the indices refer to those
 * operations (#137 C1). Time reversal is ignored. Throws a RangeError as `siteSymmetryOf` does.
 */
export function siteSymmetry(
  key: MagneticPointGroupKey,
  direction: Vec3,
  options?: SettingOptions & ToleranceOptions,
): SiteSymmetry {
  checkOptions(options, [...SETTING_KEYS, ...TOLERANCE_KEYS], 'siteSymmetry');
  return siteSymmetryOf(operations(key, pick(options, SETTING_KEYS)), direction, pick(options, TOLERANCE_KEYS));
}

const sortedKey = (list: readonly number[]): string => [...list].sort((a, b) => a - b).join(',');

/**
 * The Wyckoff position of a direction (any non-zero Cartesian vector) in a crystal class: the
 * position whose printed face has a site symmetry conjugate to that of the
 * direction (ITA's definition). `tolerance` as for `siteSymmetryOf`; throws a RangeError if the
 * operations found within it do not match any position (a tolerance too large).
 */
export function wyckoffPosition(
  key: PointGroupKey,
  direction: Vec3,
  options?: SettingOptions & ToleranceOptions,
): WyckoffPosition {
  checkOptions(options, [...SETTING_KEYS, ...TOLERANCE_KEYS], 'wyckoffPosition');
  const tolerance = siteTolerance(options);
  const setting = tableSetting(key, options);
  const ops = operations(key, { setting });
  const rows = wyckoffPositions(key, { setting });
  const site = siteSymmetryOf(ops, direction, { tolerance });
  const candidates = rows.filter((r) => r.siteSymmetryOperations.length === site.operations.length);
  for (const g of ops) {
    const k = sortedKey(siteSymmetryOf(ops, apply(g.cartesian, site.direction), { tolerance }).operations);
    const row = candidates.find((r) => sortedKey(r.siteSymmetryOperations) === k);
    if (row) return row;
  }
  throw new RangeError(
    `Point group ${key}, setting ${setting}: no Wyckoff position for ${shown(direction)} (tolerance too large?)`,
  );
}
