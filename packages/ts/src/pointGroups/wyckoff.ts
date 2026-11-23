/**
 * Wyckoff positions of the crystal classes for directions (face normals), in the ITC convention:
 * ITA's letters, multiplicities and oriented site-symmetry symbols, a representative face, and the
 * Wyckoff position of any direction (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */

import { apply, inverse, transpose, type Mat3, type Vec3 } from '../linalg.js';
import { crystalFamily, latticeBasis } from '../lattice.js';
import { itcClass, itcSetting as itcClassSetting } from './itcData.js';
import {
  isMagneticPointGroupKey,
  isPointGroupKey,
  operations,
  settings,
  type PointGroupKey,
  type SettingOptions,
} from './pointGroups.js';
import { siteSymmetry, siteTolerance, type SiteSymmetryOptions } from '../siteSymmetry.js';
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
  /** ITA's representative point as printed, e.g. `x,x,z` (a leading `-` is an overbar). */
  readonly coordinates: string;
  /**
   * ITA's representative face as printed, components separated by commas, e.g. `h,h,l`, or
   * `h,h,-2h,l` (Bravais–Miller indices) for hexagonal axes.
   */
  readonly millerIndices: string;
  /** A representative face with numbers: `millerIndices` with h = 3, k = 2, l = 1. */
  readonly representative: {
    /** The Miller indices (hkl) of the face. */
    readonly hkl: Hkl;
    /**
     * Its face normal, a Cartesian unit vector. Monoclinic and triclinic: the normal for a, b, c along
     * x, y, z (no cell angles), exact for the unique axis only, but with the correct site symmetry.
     */
    readonly cartesian: Vec3;
  };
  /** Indices into `operations` (same setting, ITC convention) of the site symmetry of the representative. */
  readonly siteSymmetryOperations: readonly number[];
}

/** Convention and setting (`SettingOptions`) and the tolerance of `siteSymmetry` (`SiteSymmetryOptions`). */
export type WyckoffOptions = SettingOptions & SiteSymmetryOptions;

/** The values substituted into ITA's Miller indices for the numeric representative. */
export const REPRESENTATIVE_VALUES: Readonly<Record<'h' | 'k' | 'l', number>> = { h: 3, k: 2, l: 1 };

/** One printed index (`h`, `-2h`, `0`, `1`) as a number. */
function index(component: string, values: Readonly<Record<'h' | 'k' | 'l', number>>): number {
  const m = /^(-?)(\d*)([hkil]?)$/.exec(component);
  if (!m || (m[2] === '' && m[3] === '')) throw new Error(`Unreadable Miller index: ${component}`);
  const sign = m[1] ? -1 : 1;
  const factor = m[2] === '' ? 1 : Number(m[2]);
  if (m[3] === '') return sign * factor;
  if (m[3] === 'i') return sign * factor * -(values.h + values.k);
  return sign * factor * values[m[3] as 'h' | 'k' | 'l'];
}

/** Printed Miller indices (three, or four for hexagonal axes) as three numbers, with the given values of h, k, l. */
export function numericHkl(miller: string, values = REPRESENTATIVE_VALUES): Hkl {
  const parts = miller.split(',').map((c) => index(c, values));
  if (parts.length === 3) return [parts[0], parts[1], parts[2]];
  if (parts.length === 4 && parts[2] === -(parts[0] + parts[1])) return [parts[0], parts[1], parts[3]];
  throw new Error(`Unreadable Miller indices: ${miller}`);
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
 * axis j), for the settings ITA does not print (`mm2` settings 2 and 3): the transpose of the change
 * of basis P of the ITC class data ((a′, b′, c′) = (a, b, c)·P, itcData.ts). Throws for a setting
 * that is not carried from setting 1.
 */
export function permutationFromSetting1(key: PointGroupKey, setting: number): Mat3 {
  const from = itcClassSetting(key, setting).from;
  if (from?.index !== 1) throw new Error(`Point group ${key}, setting ${setting}: not carried from setting 1`);
  const p = from.basis;
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => p[j][i])) as unknown as Mat3;
}

/**
 * The entry of a table printed per setting (Wyckoff positions, face forms) for a setting of a class:
 * the one with the ITC short symbol (and unique axis) of the setting, or undefined if ITA does not
 * print the setting.
 */
export function printedEntry<E extends { readonly symbol: string; readonly uniqueAxis?: 'b' | 'c' }>(
  table: readonly E[],
  key: PointGroupKey,
  setting: number,
): E | undefined {
  const s = settings(key, 'itc')[setting - 1];
  return table.find((e) => e.symbol === s.symbol && (e.uniqueAxis === undefined || e.uniqueAxis === s.uniqueAxis));
}

/** The printed rows of a setting; for a setting ITA does not print, those of setting 1 carried into its frame. */
function printedRows(key: PointGroupKey, setting: number): readonly WyckoffRow[] {
  const entry = printedEntry(ITA_WYCKOFF, key, setting);
  if (entry) return entry.rows;
  if (setting === 1) throw new Error(`Point group ${key}: no printed Wyckoff positions for setting 1`);
  const r = permutationFromSetting1(key, setting);
  return printedRows(key, 1).map(([letter, mult, site, coords, miller]) => [
    letter,
    mult,
    permuteSymbol(site, r),
    permutePattern(coords, r, XYZ),
    miller === '' ? '' : permutePattern(miller, r, HKL),
  ]);
}

/**
 * The lattice basis in which the Cartesian normals of the representatives are computed; monoclinic
 * and triclinic: a, b, c along x, y, z (docs/conventions.md, "Site symmetry and Wyckoff positions").
 */
export function faceBasis(key: PointGroupKey): Mat3 {
  const family = crystalFamily(itcClass(key).crystalSystem);
  return family === 'monoclinic' || family === 'triclinic' ? IDENTITY : latticeBasis(family);
}

const cache = new Map<string, readonly WyckoffPosition[]>();

/**
 * The setting index for a table that exists for the crystal classes in the ITC convention only
 * (`what`: 'Wyckoff positions', 'Crystal forms'); throws a RangeError for a magnetic point group
 * with time reversal and for another convention.
 */
export function tableSetting(key: PointGroupKey, options?: SettingOptions, what = 'Wyckoff positions'): number {
  if (isMagneticPointGroupKey(key) && !isPointGroupKey(key)) {
    throw new RangeError(
      `${what} are given for the 32 crystal classes only; ${JSON.stringify(key)} is a magnetic point group`,
    );
  }
  if ((options?.convention ?? 'itc') !== 'itc') {
    throw new RangeError(`${what} exist in the ITC convention only (convention 'itc')`);
  }
  const list = settings(key, 'itc');
  const index = options?.setting ?? list.find((s) => s.isDefault)?.index ?? 1;
  operations(key, { convention: 'itc', setting: index }); // validates the setting index
  return index;
}

/**
 * The Wyckoff positions of a point group for directions, in ITA's printed order (general position
 * first), for the 32 crystal classes and in the ITC convention only (throws a RangeError for a
 * magnetic point group with time reversal and for `'birss'`). The point at the origin
 * (letter o) is not a direction and is left out. For `mm2` settings 2 and 3 (`2mm`, `m2m`), which
 * ITA does not print, the positions of setting 1 carried into their frame.
 */
export function wyckoffPositions(key: PointGroupKey, options?: SettingOptions): readonly WyckoffPosition[] {
  const setting = tableSetting(key, options);
  const cacheKey = `${key}#${setting}`;
  let result = cache.get(cacheKey);
  if (!result) {
    const ops = operations(key, { convention: 'itc', setting });
    const basis = faceBasis(key);
    result = Object.freeze(
      printedRows(key, setting)
        .filter(([letter]) => letter !== 'o')
        .map(([letter, multiplicity, site, coordinates, millerIndices]) => {
          const hkl = numericHkl(millerIndices);
          const cartesian = normal(basis, hkl);
          const stab = siteSymmetry(ops, cartesian);
          if (stab.multiplicity !== multiplicity) {
            throw new Error(
              `Point group ${key}, setting ${setting}, position ${letter}: multiplicity differs from print`,
            );
          }
          return Object.freeze({
            letter,
            multiplicity,
            siteSymmetry: site,
            coordinates,
            millerIndices,
            representative: Object.freeze({
              hkl: Object.freeze(hkl) as Hkl,
              cartesian: Object.freeze(cartesian) as Vec3,
            }),
            siteSymmetryOperations: stab.operations,
          });
        }),
    );
    cache.set(cacheKey, result);
  }
  return result;
}

const sortedKey = (list: readonly number[]): string => [...list].sort((a, b) => a - b).join(',');

/**
 * The Wyckoff position of a direction (any non-zero Cartesian vector) in a point group, ITC
 * convention only: the position whose representative has a site symmetry conjugate to that of the
 * direction (ITA's definition). `tolerance` as for `siteSymmetry`; throws a RangeError if the
 * operations found within it do not match any position (a tolerance too large).
 */
export function wyckoffPositionOf(key: PointGroupKey, direction: Vec3, options?: WyckoffOptions): WyckoffPosition {
  const tolerance = siteTolerance(options);
  const setting = tableSetting(key, options);
  const ops = operations(key, { convention: 'itc', setting });
  const rows = wyckoffPositions(key, { convention: 'itc', setting });
  const site = siteSymmetry(ops, direction, { tolerance });
  const candidates = rows.filter((r) => r.siteSymmetryOperations.length === site.operations.length);
  for (const g of ops) {
    const k = sortedKey(siteSymmetry(ops, apply(g.matrix, site.direction), { tolerance }).operations);
    const row = candidates.find((r) => sortedKey(r.siteSymmetryOperations) === k);
    if (row) return row;
  }
  throw new RangeError(
    `Point group ${key}, setting ${setting}: no Wyckoff position for ${JSON.stringify(direction)} (tolerance too large?)`,
  );
}
